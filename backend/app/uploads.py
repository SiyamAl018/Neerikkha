import hashlib
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool

from app.accounts import connect, identity
from app.documents import DocumentType, document_readiness
from app.file_validation import MAX_BYTES, InvalidFile, validate_file
from app.storage import DocumentStorage

router = APIRouter(prefix="/api/v1/cases", tags=["documents"])


def owned_case(request, connection, case_id, *, lock=False, include_deleted=False):
    user = identity(request, connection)
    if user["role"] not in ("buyer", "professional"):
        raise HTTPException(403, "Not permitted")
    row = connection.execute(
        "SELECT id,status,deleted_at FROM cases WHERE id=%s AND owner_id=%s"
        + ("" if include_deleted else " AND deleted_at IS NULL")
        + (" FOR UPDATE" if lock else ""),
        (case_id, user["id"]),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Case not found")
    return row, user


def summary(connection, case_id):
    documents = connection.execute(
        "SELECT id,document_type,byte_size,content_type,page_count,warnings,created_at "
        "FROM documents WHERE case_id=%s AND superseded_at IS NULL AND verified_content "
        "ORDER BY document_type",
        (case_id,),
    ).fetchall()
    return {
        **document_readiness([d["document_type"] for d in documents]),
        "documents": documents,
        "analysis_available": False,
    }


@router.get("/{case_id}/readiness")
def readiness(case_id: UUID, request: Request):
    with connect(request) as connection:
        case, _ = owned_case(request, connection, case_id)
        return {**summary(connection, case_id), "status": case["status"]}


def authorize_upload(request, case_id):
    with connect(request) as connection:
        owned_case(request, connection, case_id)


def save_document(request, case_id, kind, data):
    from psycopg.types.json import Jsonb

    try:
        validated = validate_file(data)
    except InvalidFile as exc:
        raise HTTPException(422, str(exc)) from None
    object_key = f"cases/{case_id}/{uuid4()}"
    storage = DocumentStorage(request.app.state.settings)
    uploaded = False
    try:
        with connect(request) as connection:
            case, user = owned_case(request, connection, case_id, lock=True)
            if case["status"] not in ("draft", "documents_ready", "needs_verification", "failed"):
                raise HTTPException(409, "Case is being processed")
            storage.put(object_key, data)
            uploaded = True
            connection.execute(
                "UPDATE documents SET superseded_at=now() WHERE case_id=%s "
                "AND document_type=%s AND superseded_at IS NULL",
                (case_id, kind.value),
            )
            connection.execute(
                "INSERT INTO documents(case_id,document_type,object_key,sha256,byte_size,"
                "verified_content,content_type,page_count,warnings,encryption_key_id) "
                "VALUES (%s,%s,%s,%s,%s,true,%s,%s,%s,'local-v1')",
                (
                    case_id,
                    kind.value,
                    object_key,
                    hashlib.sha256(data).hexdigest(),
                    len(data),
                    validated.content_type,
                    validated.pages,
                    Jsonb(validated.warnings),
                ),
            )
            connection.execute(
                "UPDATE cases SET status='draft',ocr_run_id=NULL,ocr_started_at=NULL WHERE id=%s",
                (case_id,),
            )
            connection.execute(
                "DELETE FROM document_ocr WHERE document_id IN "
                "(SELECT id FROM documents WHERE case_id=%s)",
                (case_id,),
            )
            connection.execute(
                "INSERT INTO audit_logs(actor_id,action,target_id) "
                "VALUES (%s,'document_uploaded',%s)",
                (user["id"], case_id),
            )
            result = {**summary(connection, case_id), "status": "draft"}
        return result
    except Exception:
        if uploaded:
            storage.delete(object_key)
        raise
    finally:
        storage.close()


@router.post("/{case_id}/documents/{kind}", status_code=201)
async def upload(case_id: UUID, kind: DocumentType, request: Request):
    # Raw binary body: authenticate before buffering; never trust filename or Content-Type.
    await run_in_threadpool(authorize_upload, request, case_id)
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > MAX_BYTES:
            raise HTTPException(413, "file_size")
        data.extend(chunk)
    return await run_in_threadpool(save_document, request, case_id, kind, bytes(data))


@router.post("/{case_id}/confirm-documents")
def confirm(case_id: UUID, request: Request):
    with connect(request) as connection:
        case, user = owned_case(request, connection, case_id, lock=True)
        if case["status"] not in ("draft", "documents_ready"):
            raise HTTPException(409, "Case is being processed")
        result = summary(connection, case_id)
        if not result["ready"]:
            raise HTTPException(409, {"code": "missing_documents", "missing": result["missing"]})
        connection.execute("UPDATE cases SET status='documents_ready' WHERE id=%s", (case_id,))
        connection.execute(
            "INSERT INTO audit_logs(actor_id,action,target_id) "
            "VALUES (%s,'documents_confirmed',%s)",
            (user["id"], case_id),
        )
        return {**result, "status": "documents_ready"}


@router.get("/{case_id}/documents/{document_id}/download")
def download(case_id: UUID, document_id: UUID, request: Request):
    with connect(request) as connection:
        _, user = owned_case(request, connection, case_id)
        document = connection.execute(
            "SELECT object_key,content_type,document_type FROM documents WHERE id=%s "
            "AND case_id=%s AND superseded_at IS NULL AND verified_content",
            (document_id, case_id),
        ).fetchone()
        if not document:
            raise HTTPException(404, "Document not found")
        storage = DocumentStorage(request.app.state.settings)
        try:
            data = storage.get(document["object_key"])
        finally:
            storage.close()
        connection.execute(
            "INSERT INTO audit_logs(actor_id,action,target_id) "
            "VALUES (%s,'document_downloaded',%s)",
            (user["id"], document_id),
        )
    extension = {"application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg"}[
        document["content_type"]
    ]
    return Response(
        data,
        media_type=document["content_type"],
        headers={
            "Content-Disposition": (
                f'attachment; filename="{document["document_type"]}.{extension}"'
            ),
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/{case_id}", status_code=204)
def delete_case(case_id: UUID, request: Request):
    # Tombstone first: retries can finish cleanup, but no upload/download can race deletion.
    with connect(request) as connection:
        _, user = owned_case(request, connection, case_id, lock=True, include_deleted=True)
        connection.execute("UPDATE cases SET deleted_at=now() WHERE id=%s", (case_id,))
    storage = DocumentStorage(request.app.state.settings)
    try:
        with connect(request) as connection:
            owned_case(request, connection, case_id, lock=True, include_deleted=True)
            keys = connection.execute(
                "SELECT object_key FROM documents WHERE case_id=%s", (case_id,)
            ).fetchall()
            for row in keys:
                storage.delete(row["object_key"])
            connection.execute("DELETE FROM cases WHERE id=%s", (case_id,))
            connection.execute(
                "INSERT INTO audit_logs(actor_id,action,target_id) VALUES (%s,'case_deleted',%s)",
                (user["id"], case_id),
            )
    finally:
        storage.close()
