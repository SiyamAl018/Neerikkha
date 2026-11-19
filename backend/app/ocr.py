import json
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from redis import Redis
from rq import Queue

from app.accounts import connect
from app.comparison import compare_documents
from app.config import Settings
from app.field_extraction import LABELS, suggest_fields
from app.gemini_reader import ReaderError, configured
from app.ocr_engine import extract
from app.storage import DocumentStorage, decrypt, encrypt
from app.uploads import owned_case, summary

router = APIRouter(prefix="/api/v1/cases", tags=["OCR"])


@router.post("/{case_id}/ocr", status_code=202)
def start(case_id: UUID, request: Request):
    with connect(request) as connection:
        case, user = owned_case(request, connection, case_id, lock=True)
        current = connection.execute(
            "SELECT ocr_started_at FROM cases WHERE id=%s", (case_id,)
        ).fetchone()["ocr_started_at"]
        if case["status"] in ("queued", "processing"):
            if current and current > datetime.now(UTC) - timedelta(hours=4):
                return {"status": case["status"]}
        elif case["status"] not in ("documents_ready", "failed", "needs_verification"):
            raise HTTPException(409, "Confirm documents before OCR")
        if not summary(connection, case_id)["ready"]:
            raise HTTPException(409, "Three documents required")
        if request.app.state.settings.ocr_engine == "gemini" and not configured(
            request.app.state.settings
        ):
            raise HTTPException(503, "gemini_not_configured")
        run_id = uuid4()
        connection.execute(
            "UPDATE cases SET status='queued',ocr_run_id=%s,ocr_started_at=now(),"
            "ocr_progress=NULL WHERE id=%s",
            (run_id, case_id),
        )
        connection.execute(
            "DELETE FROM document_ocr WHERE document_id IN "
            "(SELECT id FROM documents WHERE case_id=%s)",
            (case_id,),
        )
        redis = Redis.from_url(request.app.state.settings.redis_url.get_secret_value())
        try:
            Queue("neerikkha", connection=redis).enqueue(
                process_case,
                str(case_id),
                str(run_id),
                job_timeout=14400,
                result_ttl=0,
                failure_ttl=0,
            )
        except Exception:
            raise HTTPException(503, "OCR queue unavailable; try again") from None
        finally:
            redis.close()
        connection.execute(
            "INSERT INTO audit_logs(actor_id,action,target_id) VALUES (%s,'ocr_requested',%s)",
            (user["id"], case_id),
        )
    return {"status": "queued"}


def process_case(case_id: str, run_id: str):
    import psycopg
    from psycopg.rows import dict_row

    settings = Settings()
    storage = None

    def db():
        return psycopg.connect(settings.database_url.get_secret_value(), row_factory=dict_row)

    try:
        with db() as connection:
            case = connection.execute(
                "UPDATE cases SET status='processing' WHERE id=%s "
                "AND ocr_run_id=%s AND status='queued' "
                "AND deleted_at IS NULL RETURNING id",
                (case_id, run_id),
            ).fetchone()
            if not case:
                return
            documents = connection.execute(
                "SELECT id,object_key,content_type,page_count,document_type "
                "FROM documents WHERE case_id=%s "
                "AND superseded_at IS NULL",
                (case_id,),
            ).fetchall()
        storage = DocumentStorage(settings)
        completed = 0
        total = sum(document["page_count"] for document in documents)
        for document in documents:

            def progress(page, engine, completed=completed, kind=document["document_type"]):
                with db() as connection:
                    active = connection.execute(
                        "UPDATE cases SET ocr_progress=%s WHERE id=%s AND ocr_run_id=%s "
                        "AND deleted_at IS NULL RETURNING id",
                        (
                            json.dumps(
                                {
                                    "completed_pages": completed + page - 1,
                                    "total_pages": total,
                                    "document_type": kind,
                                    "page": page,
                                    "engine": engine,
                                }
                            ),
                            case_id,
                            run_id,
                        ),
                    ).fetchone()
                    if not active:
                        raise RuntimeError("OCR run no longer active")

            result = extract(
                storage.get(document["object_key"]),
                document["content_type"],
                document["page_count"],
                document["document_type"],
                progress,
            )
            encrypted = encrypt(
                json.dumps(result).encode(), storage.key, "ocr/" + str(document["id"])
            )
            with db() as connection:
                active = connection.execute(
                    "SELECT id FROM cases WHERE id=%s AND ocr_run_id=%s "
                    "AND deleted_at IS NULL FOR UPDATE",
                    (case_id, run_id),
                ).fetchone()
                if not active:
                    return
                connection.execute(
                    "INSERT INTO document_ocr(document_id,result) VALUES (%s,%s) "
                    "ON CONFLICT(document_id) DO UPDATE SET result=excluded.result, "
                    "reviewed_text=NULL,reviewed_at=NULL,field_review=NULL,field_reviewed_at=NULL",
                    (document["id"], encrypted),
                )
            completed += document["page_count"]
        with db() as connection:
            case = connection.execute(
                "SELECT id FROM cases WHERE id=%s AND ocr_run_id=%s "
                "AND deleted_at IS NULL FOR UPDATE",
                (case_id, run_id),
            ).fetchone()
            if not case:
                return
            connection.execute(
                "UPDATE cases SET status='needs_verification',ocr_progress=%s WHERE id=%s",
                (
                    json.dumps(
                        {"completed_pages": total, "total_pages": total, "engine": "complete"}
                    ),
                    case_id,
                ),
            )
    except Exception as error:
        # No exception strings, source text, or document bytes enter queue logs/results.
        with db() as connection:
            connection.execute(
                "UPDATE cases SET status='failed',ocr_progress=%s WHERE id=%s AND ocr_run_id=%s "
                "AND deleted_at IS NULL",
                (
                    json.dumps(
                        {"error": error.code if isinstance(error, ReaderError) else "ocr_failed"}
                    ),
                    case_id,
                    run_id,
                ),
            )
    finally:
        if storage:
            storage.close()


@router.get("/{case_id}/ocr")
def results(case_id: UUID, request: Request):
    with connect(request) as connection:
        case, _ = owned_case(request, connection, case_id)
        progress = connection.execute(
            "SELECT ocr_progress FROM cases WHERE id=%s", (case_id,)
        ).fetchone()["ocr_progress"]
        rows = connection.execute(
            "SELECT d.id,d.document_type,o.result,o.reviewed_text,"
            "o.reviewed_at,o.field_review,o.field_reviewed_at FROM documents d JOIN document_ocr o "
            "ON o.document_id=d.id WHERE d.case_id=%s "
            "AND d.superseded_at IS NULL ORDER BY d.document_type",
            (case_id,),
        ).fetchall()
        storage = DocumentStorage(request.app.state.settings)
        try:
            documents = []
            for row in rows:
                aad = "ocr/" + str(row["id"])
                original = json.loads(decrypt(bytes(row["result"]), storage.key, aad))
                transcription = (
                    decrypt(bytes(row["reviewed_text"]), storage.key, aad + "/review").decode()
                    if row["reviewed_text"]
                    else None
                )
                field_review = (
                    json.loads(decrypt(bytes(row["field_review"]), storage.key, aad + "/fields"))
                    if row["field_review"]
                    else None
                )
                documents.append(
                    dict(
                        id=row["id"],
                        document_type=row["document_type"],
                        **original,
                        extraction=suggest_fields(original["pages"], transcription),
                        field_review=field_review,
                        field_reviewed_at=row["field_reviewed_at"],
                        reviewed_text=decrypt(
                            bytes(row["reviewed_text"]), storage.key, aad + "/review"
                        ).decode()
                        if row["reviewed_text"]
                        else None,
                        reviewed_at=row["reviewed_at"],
                    )
                )
        finally:
            storage.close()
        return {
            "status": case["status"],
            "progress": progress,
            "reader": {
                "engine": request.app.state.settings.ocr_engine,
                "configured": request.app.state.settings.ocr_engine != "gemini"
                or configured(request.app.state.settings),
            },
            "documents": documents,
            "analysis_available": False,
            "comparison": compare_documents(documents, allow_automatic=True),
        }


class Review(BaseModel):
    text: str = Field(min_length=1, max_length=100000)


@router.post("/{case_id}/ocr/{document_id}/review")
def review(case_id: UUID, document_id: UUID, body: Review, request: Request):
    if not body.text.strip():
        raise HTTPException(422, "Review cannot be blank")
    with connect(request) as connection:
        case, user = owned_case(request, connection, case_id, lock=True)
        if case["status"] != "needs_verification":
            raise HTTPException(409, "OCR results are not ready")
        row = connection.execute(
            "SELECT o.document_id FROM document_ocr o JOIN documents d "
            "ON d.id=o.document_id WHERE d.id=%s AND d.case_id=%s "
            "AND d.superseded_at IS NULL",
            (document_id, case_id),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Document not found")
        storage = DocumentStorage(request.app.state.settings)
        try:
            value = encrypt(body.text.encode(), storage.key, "ocr/" + str(document_id) + "/review")
        finally:
            storage.close()
        connection.execute(
            "UPDATE document_ocr SET reviewed_text=%s,reviewed_at=now(),field_review=NULL,"
            "field_reviewed_at=NULL WHERE document_id=%s",
            (value, document_id),
        )
        connection.execute(
            "INSERT INTO audit_logs(actor_id,action,target_id) VALUES (%s,'ocr_review_saved',%s)",
            (user["id"], document_id),
        )
    return {"saved": True}


class FieldReview(BaseModel):
    source_version: str = Field(pattern=r"^[a-f0-9]{64}$")
    previous_reviewed_at: datetime | None = None
    values: dict[str, str] = Field(max_length=len(LABELS))


@router.post("/{case_id}/ocr/{document_id}/fields")
def review_fields(case_id: UUID, document_id: UUID, body: FieldReview, request: Request):
    if set(body.values) != set(LABELS) or any(len(v) > 500 for v in body.values.values()):
        raise HTTPException(422, "Provide all supported fields, at most 500 characters each")
    with connect(request) as connection:
        case, user = owned_case(request, connection, case_id, lock=True)
        if case["status"] != "needs_verification":
            raise HTTPException(409, "OCR results are not ready")
        row = connection.execute(
            "SELECT o.* FROM document_ocr o JOIN documents d "
            "ON d.id=o.document_id WHERE d.id=%s AND d.case_id=%s "
            "AND d.superseded_at IS NULL",
            (document_id, case_id),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Document not found")
        storage = DocumentStorage(request.app.state.settings)
        try:
            aad = "ocr/" + str(document_id)
            original = json.loads(decrypt(bytes(row["result"]), storage.key, aad))
            text = (
                decrypt(bytes(row["reviewed_text"]), storage.key, aad + "/review").decode()
                if row["reviewed_text"]
                else None
            )
            current = suggest_fields(original["pages"], text)
            if (
                current["version"] != body.source_version
                or row["field_reviewed_at"] != body.previous_reviewed_at
            ):
                raise HTTPException(409, "Source or review changed; reload before saving")
            value = encrypt(
                json.dumps(
                    {
                        "source_version": body.source_version,
                        "values": {k: v.strip() for k, v in body.values.items()},
                    }
                ).encode(),
                storage.key,
                aad + "/fields",
            )
        finally:
            storage.close()
        connection.execute(
            "UPDATE document_ocr SET field_review=%s,field_reviewed_at=now() WHERE document_id=%s",
            (value, document_id),
        )
        connection.execute(
            "INSERT INTO audit_logs(actor_id,action,target_id) VALUES (%s,'field_review_saved',%s)",
            (user["id"], document_id),
        )
    return {"saved": True}
