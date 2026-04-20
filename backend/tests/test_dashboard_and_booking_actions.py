from decimal import Decimal

from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def dashboard_revenue(client: TestClient, salon_id: int, headers: dict[str, str]) -> Decimal:
    response = client.get(
        f"/api/v1/dashboard/summary?salon_id={salon_id}&date=2026-04-20",
        headers=headers,
    )
    assert response.status_code == 200
    return Decimal(str(response.json()["metrics"]["today_revenue"]))


def create_public_booking(
    client: TestClient,
    seeded_salon: dict[str, int],
    slot_index: int,
) -> dict:
    availability = client.get(
        "/api/v1/public/availability"
        f"?stylist_id={seeded_salon['stylist_id']}"
        f"&service_id={seeded_salon['service_id']}"
        "&date=2026-04-20"
    )
    assert availability.status_code == 200
    slot = availability.json()["slots"][slot_index]

    response = client.post(
        "/api/v1/public/bookings",
        json={
            "stylist_id": seeded_salon["stylist_id"],
            "service_id": seeded_salon["service_id"],
            "customer_name": f"Customer {slot_index}",
            "customer_phone": "9999999999",
            "starts_at_utc": slot["starts_at_utc"],
        },
    )
    assert response.status_code == 201
    return response.json()


def test_dashboard_revenue_counts_paid_bookings_only_and_keeps_paid_cancellations(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    headers = auth_headers(client, "admin@test.com")
    booking = create_public_booking(client, seeded_salon, 0)

    assert dashboard_revenue(client, seeded_salon["salon_id"], headers) == Decimal("0.00")

    paid_response = client.put(
        f"/api/v1/bookings/{booking['id']}/payment-status",
        headers=headers,
        json={"status": "paid"},
    )
    assert paid_response.status_code == 200
    assert dashboard_revenue(client, seeded_salon["salon_id"], headers) == Decimal("25.00")

    cancel_response = client.post(
        f"/api/v1/bookings/{booking['id']}/cancel",
        headers=headers,
        json={"reason": "Customer cancelled"},
    )
    assert cancel_response.status_code == 200
    assert dashboard_revenue(client, seeded_salon["salon_id"], headers) == Decimal("25.00")


def test_cancelled_unpaid_booking_cannot_be_marked_paid(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    headers = auth_headers(client, "admin@test.com")
    booking = create_public_booking(client, seeded_salon, 0)

    cancel_response = client.post(
        f"/api/v1/bookings/{booking['id']}/cancel",
        headers=headers,
        json={"reason": "Customer cancelled"},
    )
    assert cancel_response.status_code == 200

    paid_response = client.put(
        f"/api/v1/bookings/{booking['id']}/payment-status",
        headers=headers,
        json={"status": "paid"},
    )

    assert paid_response.status_code == 400
