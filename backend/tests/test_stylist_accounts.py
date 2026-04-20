from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def test_admin_creates_stylist_login_account(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    admin_headers = auth_headers(client, "admin@test.com")

    response = client.post(
        "/api/v1/stylists",
        headers=admin_headers,
        json={
            "salon_id": seeded_salon["salon_id"],
            "email": "newstylist@test.com",
            "password": "password123",
            "name": "New Stylist",
            "phone": "+91 70000 00000",
            "specialties": ["Haircut", "Color"],
            "is_active": True,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "newstylist@test.com"
    assert body["user_id"] is not None

    stylist_headers = auth_headers(client, "newstylist@test.com")
    me = client.get("/api/v1/auth/me", headers=stylist_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "stylist"


def test_stylist_schedule_uses_logged_in_stylist(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    stylist_headers = auth_headers(client, "stylist@test.com")

    response = client.get(
        "/api/v1/stylist/me/schedule?date=2026-04-20",
        headers=stylist_headers,
    )

    assert response.status_code == 200
    assert response.json() == []
