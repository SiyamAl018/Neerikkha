import os
from pathlib import Path

import boto3
from botocore.config import Config
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import Settings

MAGIC = b"NRK1"


def encrypt(data: bytes, key: bytes, object_key: str) -> bytes:
    if len(key) != 32:
        raise ValueError("AES-256 requires a 32-byte key")
    nonce = os.urandom(12)
    return MAGIC + nonce + AESGCM(key).encrypt(nonce, data, object_key.encode())


def decrypt(data: bytes, key: bytes, object_key: str) -> bytes:
    if len(key) != 32 or not data.startswith(MAGIC):
        raise ValueError("Invalid encrypted document")
    return AESGCM(key).decrypt(data[4:16], data[16:], object_key.encode())


class DocumentStorage:
    def __init__(self, settings: Settings):
        self.bucket = settings.storage_bucket
        self.key = Path(settings.encryption_key_file).read_bytes()
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.storage_url,
            region_name="us-east-1",
            aws_access_key_id=settings.storage_access_key.get_secret_value(),
            aws_secret_access_key=settings.storage_secret_key.get_secret_value(),
            config=Config(
                signature_version="s3v4",
                connect_timeout=3,
                read_timeout=10,
                retries={"max_attempts": 2},
                s3={"addressing_style": "path"},
            ),
        )

    def put(self, object_key: str, data: bytes):
        self.client.put_object(
            Bucket=self.bucket,
            Key=object_key,
            Body=encrypt(data, self.key, object_key),
            ContentType="application/octet-stream",
        )

    def get(self, object_key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=object_key)
        try:
            return decrypt(response["Body"].read(), self.key, object_key)
        finally:
            response["Body"].close()

    def delete(self, object_key: str):
        self.client.delete_object(Bucket=self.bucket, Key=object_key)

    def close(self):
        self.client.close()
