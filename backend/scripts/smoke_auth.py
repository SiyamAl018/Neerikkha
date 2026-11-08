"""Synthetic API smoke test; removes only the users it creates."""

from uuid import uuid4

import httpx
import psycopg

from app.config import Settings

ids = []
try:
    with httpx.Client(base_url="http://localhost:8000") as client:
        tokens = []
        for _ in range(2):
            payload = {
                "email": f"{uuid4()}@example.com",
                "password": "Abcdef1!",
                "display_name": "Synthetic",
                "role": "admin",
            }
            response = client.post("/api/v1/auth/register", json=payload)
            assert response.status_code == 201, response.status_code
            ids.append(response.json()["id"])
            assert response.json()["role"] == "buyer"
            response = client.post("/api/v1/auth/login", json=payload)
            assert response.status_code == 200
            tokens.append({"Authorization": "Bearer " + response.json()["access_token"]})
        response = client.post(
            "/api/v1/cases",
            headers=tokens[0],
            json={"reference": "Synthetic", "mouza": "Example", "survey_type": "RS"},
        )
        assert response.status_code == 201
        path = "/api/v1/cases/" + response.json()["id"]
        assert client.get(path, headers=tokens[0]).status_code == 200
        assert client.get(path, headers=tokens[1]).status_code == 404
        assert len(client.get('/api/v1/cases', headers=tokens[0]).json()) == 1
        assert client.get('/api/v1/cases', headers=tokens[1]).json() == []
        renewed = client.post('/api/v1/auth/renew', headers=tokens[0])
        assert renewed.status_code == 200
        assert client.get(path, headers=tokens[0]).status_code == 401
        tokens[0] = {'Authorization': 'Bearer ' + renewed.json()['access_token']}
        assert client.get(path, headers=tokens[0]).status_code == 200
        assert client.get(path).status_code == 401
        assert client.post("/api/v1/auth/logout", headers=tokens[0]).status_code == 204
        assert client.get(path, headers=tokens[0]).status_code == 401
        print("PASS: eight-character strong password signup/login, buyer-only registration, "
              "ownership isolation, logout revocation")
finally:
    with psycopg.connect(Settings().database_url.get_secret_value()) as connection:
        for user_id in ids:
            connection.execute("DELETE FROM cases WHERE owner_id=%s", (user_id,))
            connection.execute("DELETE FROM audit_logs WHERE actor_id=%s", (user_id,))
            connection.execute("DELETE FROM users WHERE id=%s", (user_id,))
