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


def test_stylist_cannot_access_owner_services(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    headers = auth_headers(client, "stylist@test.com")

    response = client.get(
        f"/api/v1/services?salon_id={seeded_salon['salon_id']}",
        headers=headers,
    )

    assert response.status_code == 403


def test_stylist_can_read_own_availability(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    headers = auth_headers(client, "stylist@test.com")

    response = client.get(
        f"/api/v1/stylist/me/availability?service_id={seeded_salon['service_id']}&date=2026-04-20",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["stylist_id"] == seeded_salon["stylist_id"]
    assert len(response.json()["slots"]) > 0


def test_owner_signup_creates_owner_and_single_salon(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/owner-signup",
        json={
            "email": "new-owner@test.com",
            "password": "password123",
            "salon_name": "New Salon",
            "salon_address": "Main Road",
            "salon_phone": "1234567890",
            "timezone": "Asia/Kolkata",
        },
    )

    assert response.status_code == 201
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    salon_response = client.get("/api/v1/salon/me/current", headers=headers)

    assert salon_response.status_code == 200
    assert salon_response.json()["name"] == "New Salon"


def test_public_salons_lists_available_salons(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    response = client.get("/api/v1/public/salons")

    assert response.status_code == 200
    assert any(salon["id"] == seeded_salon["salon_id"] for salon in response.json()["salons"])


def test_user_can_change_own_password(client: TestClient, seeded_salon: dict[str, int]) -> None:
    headers = auth_headers(client, "owner@test.com")

    response = client.put(
        "/api/v1/auth/me/password",
        headers=headers,
        json={"current_password": "password123", "new_password": "newpassword123"},
    )

    assert response.status_code == 200
    new_headers = auth_headers(client, "owner@test.com", password="newpassword123")
    assert "Authorization" in new_headers


def test_stylist_can_update_own_profile_without_owner_access(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    headers = auth_headers(client, "stylist@test.com")

    response = client.put(
        "/api/v1/stylist/me/profile",
        headers=headers,
        json={"name": "Updated Stylist", "phone": "1112223333", "specialties": ["Color"]},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated Stylist"
    assert response.json()["email"] == "stylist@test.com"
    assert response.json()["specialties"] == ["Color"]


def test_owner_can_update_stylist_profile_but_not_email(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    headers = auth_headers(client, "owner@test.com")

    response = client.put(
        f"/api/v1/stylists/{seeded_salon['stylist_id']}",
        headers=headers,
        json={
            "name": "Owner Updated Stylist",
            "phone": "4445556666",
            "specialties": ["Cuts"],
            "password": "newpassword123",
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Owner Updated Stylist"
    assert response.json()["email"] == "stylist@test.com"
    assert response.json()["specialties"] == ["Cuts"]
    assert auth_headers(client, "stylist@test.com", password="newpassword123")


def test_stylist_can_update_only_own_booking(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    availability = client.get(
        "/api/v1/public/availability"
        f"?stylist_id={seeded_salon['stylist_id']}"
        f"&service_id={seeded_salon['service_id']}"
        "&date=2026-04-20"
    )
    slot = availability.json()["slots"][0]
    booking_response = client.post(
        "/api/v1/public/bookings",
        json={
            "stylist_id": seeded_salon["stylist_id"],
            "service_id": seeded_salon["service_id"],
            "customer_name": "Stylist Customer",
            "customer_phone": "9999999999",
            "starts_at_utc": slot["starts_at_utc"],
        },
    )
    assert booking_response.status_code == 201
    booking_id = booking_response.json()["id"]

    stylist_headers = auth_headers(client, "stylist@test.com")
    status_response = client.put(
        f"/api/v1/stylist/me/bookings/{booking_id}/status",
        headers=stylist_headers,
        json={"status": "completed"},
    )
    payment_response = client.put(
        f"/api/v1/stylist/me/bookings/{booking_id}/payment-status",
        headers=stylist_headers,
        json={"status": "paid"},
    )

    assert status_response.status_code == 200
    assert status_response.json()["status"] == "completed"
    assert payment_response.status_code == 200
    assert payment_response.json()["payment_status"] == "paid"
