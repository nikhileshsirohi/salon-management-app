from pathlib import Path


def test_booking_overlap_constraint_migration_exists() -> None:
    migration = Path("migrations/versions/3a2d8f66e5b1_add_booking_overlap_constraints.py")
    content = migration.read_text()

    assert "CREATE EXTENSION IF NOT EXISTS btree_gist" in content
    assert "EXCLUDE USING gist" in content
    assert "tstzrange(starts_at_utc, ends_at_utc, '[)')" in content
    assert "status IN ('booked'::bookingstatus, 'completed'::bookingstatus)" in content
