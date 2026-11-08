import hashlib
import hmac
import secrets
import string
from typing import Literal
from uuid import UUID

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

router = APIRouter(prefix="/api/v1")


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def trim_email(cls, value):
        return value.strip() if isinstance(value, str) else value


class Registration(Credentials):
    display_name: str = Field(min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        try:
            return validate_email(
                value, check_deliverability=False, allow_smtputf8=False
            ).normalized.lower()
        except EmailNotValidError:
            raise PydanticCustomError("email_format", "Invalid email format") from None

    @field_validator("password")
    @classmethod
    def strong_password(cls, value):
        if not (
            len(value) >= 8
            and any(c in string.ascii_uppercase for c in value)
            and any(c in string.ascii_lowercase for c in value)
            and any(c in string.digits for c in value)
            and any(c in string.punctuation for c in value)
        ):
            raise PydanticCustomError("password_policy", "Password does not meet requirements")
        return value


class NewCase(BaseModel):
    reference: str = Field(min_length=1, max_length=100)
    mouza: str = Field(min_length=1, max_length=100)
    survey_type: Literal["CS", "SA", "RS", "BS"]


def password_hash(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1)
    return f"scrypt${salt}${digest.hex()}"


def connect(request):
    import psycopg
    from psycopg.rows import dict_row

    return psycopg.connect(
        request.app.state.settings.database_url.get_secret_value(),
        row_factory=dict_row,
        connect_timeout=3,
    )


def identity(request, connection):
    header = request.headers.get("authorization", "")
    if not header.startswith("Bearer ") or len(header) > 256:
        raise HTTPException(401, "Authentication required")
    digest = hashlib.sha256(header[7:].encode()).hexdigest()
    user = connection.execute(
        "SELECT u.id,u.email,u.display_name,u.role,s.id AS session_id FROM users u "
        "JOIN auth_sessions s ON s.user_id=u.id WHERE s.token_hash=%s "
        "AND s.revoked_at IS NULL AND s.expires_at>now() AND u.active",
        (digest,),
    ).fetchone()
    if not user:
        raise HTTPException(401, "Authentication required")
    return user


def throttle(request):
    from redis import Redis

    key = hashlib.sha256(
        (request.client.host if request.client else "unknown").encode()
    ).hexdigest()
    with Redis.from_url(
        request.app.state.settings.redis_url.get_secret_value(), socket_timeout=3
    ) as cache:
        count = cache.eval(
            "local n=redis.call('INCR',KEYS[1]); "
            "if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",
            1,
            "auth-attempt:" + key,
        )
    if count > 10:
        raise HTTPException(429, "Try again later")


@router.post("/auth/register", status_code=201)
def register(body: Registration, request: Request):
    from psycopg.errors import UniqueViolation

    throttle(request)
    try:
        with connect(request) as connection:
            return connection.execute(
                "INSERT INTO users(email,display_name,password_hash,role) "
                "VALUES (%s,%s,%s,'buyer') RETURNING id,email,display_name,role",
                (body.email.lower(), body.display_name, password_hash(body.password)),
            ).fetchone()
    except UniqueViolation:
        raise HTTPException(409, "Registration unavailable") from None


@router.post("/auth/login")
def login(body: Credentials, request: Request):
    throttle(request)
    with connect(request) as connection:
        user = connection.execute(
            "SELECT * FROM users WHERE lower(email)=%s", (body.email.lower(),)
        ).fetchone()
        stored = user["password_hash"] if user else password_hash("dummy-password-value")
        parts = stored.split("$")
        valid = len(parts) == 3 and parts[0] == "scrypt"
        if valid:
            valid = hmac.compare_digest(password_hash(body.password, parts[1]), stored)
        if not valid or not user or not user["active"] or user["role"] in ("admin", "super_admin"):
            raise HTTPException(401, "Invalid credentials")
        token = secrets.token_urlsafe(48)
        connection.execute(
            "INSERT INTO auth_sessions(user_id,token_hash,expires_at) "
            "VALUES (%s,%s,now()+interval '30 minutes')",
            (user["id"], hashlib.sha256(token.encode()).hexdigest()),
        )
        connection.execute(
            "INSERT INTO audit_logs(actor_id,action) VALUES (%s,'login')", (user["id"],)
        )
        return {"access_token": token, "token_type": "bearer", "expires_in": 1800}


@router.get("/auth/me")
def me(request: Request):
    with connect(request) as connection:
        user = identity(request, connection)
        user.pop("session_id")
        return user


@router.post("/auth/logout", status_code=204)
def logout(request: Request):
    with connect(request) as connection:
        user = identity(request, connection)
        connection.execute(
            "UPDATE auth_sessions SET revoked_at=now() WHERE id=%s", (user["session_id"],)
        )


@router.post("/cases", status_code=201)
def create_case(body: NewCase, request: Request):
    with connect(request) as connection:
        user = identity(request, connection)
        if user["role"] not in ("buyer", "professional"):
            raise HTTPException(403, "Not permitted")
        return connection.execute(
            "INSERT INTO cases(owner_id,reference,mouza,survey_type) VALUES (%s,%s,%s,%s) "
            "RETURNING id,reference,mouza,survey_type,status",
            (user["id"], body.reference, body.mouza, body.survey_type),
        ).fetchone()


@router.get("/cases/{case_id}")
def read_case(case_id: UUID, request: Request):
    with connect(request) as connection:
        user = identity(request, connection)
        case = connection.execute(
            "SELECT id,reference,mouza,survey_type,status FROM cases "
            "WHERE id=%s AND owner_id=%s AND deleted_at IS NULL",
            (case_id, user["id"]),
        ).fetchone()
        if not case:
            raise HTTPException(404, "Case not found")
        return case


@router.get("/cases")
def list_cases(request: Request):
    with connect(request) as connection:
        user = identity(request, connection)
        return connection.execute(
            "SELECT id,reference,mouza,survey_type,status FROM cases "
            "WHERE owner_id=%s AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100",
            (user["id"],),
        ).fetchall()


@router.post("/auth/renew")
def renew(request: Request):
    with connect(request) as connection:
        user = identity(request, connection)
        token = secrets.token_urlsafe(48)
        result = connection.execute(
            "UPDATE auth_sessions SET token_hash=%s,expires_at=now()+interval '30 minutes' "
            "WHERE id=%s AND revoked_at IS NULL AND expires_at>now() AND token_hash=%s",
            (
                hashlib.sha256(token.encode()).hexdigest(),
                user["session_id"],
                hashlib.sha256(request.headers["authorization"][7:].encode()).hexdigest(),
            ),
        )
        if result.rowcount != 1:
            raise HTTPException(401, "Authentication required")
        return {"access_token": token, "token_type": "bearer", "expires_in": 1800}
