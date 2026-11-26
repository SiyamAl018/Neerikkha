from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class DocumentType(StrEnum):
    DEED = "deed"
    MUTATION = "mutation"
    KHATIAN = "khatian"


REQUIRED_DOCUMENTS = tuple(DocumentType)


class ReadinessRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    document_types: list[DocumentType]


def document_readiness(document_types: list[DocumentType]) -> dict:
    """Metadata-only contract. Actual submission must use stored, validated documents."""
    present = set(document_types)
    missing = [kind.value for kind in REQUIRED_DOCUMENTS if kind not in present]
    return {"ready": not missing, "missing": missing, "required_count": 3}
