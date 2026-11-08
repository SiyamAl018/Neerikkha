import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.accounts import Credentials, Registration
from app.main import create_app


@pytest.mark.parametrize(
    "password",
    ["Aa1!aaa", "abcdefgh1!", "ABCDEFGH1!", "Abcdefgh!", "Abcdefgh1", "Aa1!" + "a" * 125],
)
def test_registration_rejects_each_missing_password_requirement(password):
    with pytest.raises(ValidationError):
        Registration(email="person@example.com", password=password, display_name="Test")


@pytest.mark.parametrize(
    "email",
    [
        "a..b@example.com",
        ".a@example.com",
        "a@-bad.com",
        "a@bad_domain.com",
        "a@localhost",
        "a@@example.com",
    ],
)
def test_registration_rejects_invalid_email(email):
    with pytest.raises(ValidationError):
        Registration(email=email, password="Abcdef1!", display_name="Test")


def test_eight_characters_and_email_normalization():
    result = Registration(
        email="  Person+tag@EXAMPLE.COM  ", password="Abcdef1!", display_name="Test"
    )
    assert result.email == "person+tag@example.com"
    assert result.password == "Abcdef1!"


def test_existing_passwords_are_not_blocked_by_new_signup_policy():
    assert Credentials(email="person@example.com", password="oldpasswordvalue").password


def test_api_errors_identify_field_without_echoing_password():
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "person@example.com",
                "password": "PRIVATEsecret",
                "display_name": "Test",
            },
        )
    assert response.status_code == 422
    assert response.json()["fields"] == ["password"]
    assert "PRIVATE" not in response.text
