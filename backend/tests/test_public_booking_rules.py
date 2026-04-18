from fastapi.testclient import TestClient


def test_public_booking_rejects_double_booking(
    client: TestClient,
    seeded_salon: dict[str, int],
) -> None:
    availability = client.get(
        "/api/v1/public/availability"
        f"?stylist_id={seeded_salon['stylist_id']}"
        f"&service_id={seeded_salon['service_id']}"
        "&date=2026-04-20"
    )
    assert availability.status_code == 200
    slot = availability.json()["slots"][0]

    payload = {
        "stylist_id": seeded_salon["stylist_id"],
        "service_id": seeded_salon["service_id"],
        "customer_name": "Customer One",
        "customer_phone": "9999999999",
        "customer_email": "customer@test.com",
        "starts_at_utc": slot["starts_at_utc"],
    }

    first = client.post("/api/v1/public/bookings", json=payload)
    second = client.post("/api/v1/public/bookings", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409


def test_public_booking_slot_disappears_after_booking(
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
    client.post(
        "/api/v1/public/bookings",
        json={
            "stylist_id": seeded_salon["stylist_id"],
            "service_id": seeded_salon["service_id"],
            "customer_name": "Customer One",
            "customer_phone": "9999999999",
            "starts_at_utc": slot["starts_at_utc"],
        },
    )

    after_booking = client.get(
        "/api/v1/public/availability"
        f"?stylist_id={seeded_salon['stylist_id']}"
        f"&service_id={seeded_salon['service_id']}"
        "&date=2026-04-20"
    )

    returned_starts = {item["starts_at_utc"] for item in after_booking.json()["slots"]}
    assert slot["starts_at_utc"] not in returned_starts
