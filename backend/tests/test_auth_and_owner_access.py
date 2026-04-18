from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def test_owner_login_and_me(client: TestClient, seeded_salon: dict[str, int]) -> None:
    headers = auth_headers(client, "owner@test.com")

    response = client.get("/api/v1/auth/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == "owner@test.com"
    assert response.json()["role"] == "owner"


def test_owner_cannot_access_another_owner_salon(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    headers = auth_headers(client, "owner@test.com")

    response = client.get(
        f"/api/v1/services?salon_id={seeded_salon['other_salon_id']}",
        headers=headers,
    )

    assert response.status_code == 403


def test_protected_services_require_auth(client: TestClient, seeded_salon: dict[str, int]) -> None:
    response = client.get(f"/api/v1/services?salon_id={seeded_salon['salon_id']}")

    assert response.status_code == 401
