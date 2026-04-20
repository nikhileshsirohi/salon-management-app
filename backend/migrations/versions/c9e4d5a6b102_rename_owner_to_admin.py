"""rename owner role and owner_user_id to admin

Revision ID: c9e4d5a6b102
Revises: b2c7d9a1f034
Create Date: 2026-04-19 18:30:00.000000
"""

from __future__ import annotations

from alembic import op

revision = "c9e4d5a6b102"
down_revision = "b2c7d9a1f034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute("ALTER TYPE userrole RENAME VALUE 'owner' TO 'admin'")
    else:
        # SQLite et al. store enums as CHECK strings; just update the data.
        op.execute("UPDATE users SET role = 'admin' WHERE role = 'owner'")

    # Rename the FK column across dialects via batch (SQLite-compatible).
    with op.batch_alter_table("salons") as batch:
        batch.alter_column("owner_user_id", new_column_name="admin_user_id")

    # batch_alter_table in PostgreSQL does not automatically rename the related
    # index/constraint names. Do that explicitly, guarded for other backends.
    if dialect == "postgresql":
        op.execute(
            "ALTER INDEX IF EXISTS ix_salons_owner_user_id "
            "RENAME TO ix_salons_admin_user_id"
        )
        op.execute(
            "ALTER TABLE salons RENAME CONSTRAINT uq_salons_owner_user_id "
            "TO uq_salons_admin_user_id"
        )


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute(
            "ALTER TABLE salons RENAME CONSTRAINT uq_salons_admin_user_id "
            "TO uq_salons_owner_user_id"
        )
        op.execute(
            "ALTER INDEX IF EXISTS ix_salons_admin_user_id "
            "RENAME TO ix_salons_owner_user_id"
        )

    with op.batch_alter_table("salons") as batch:
        batch.alter_column("admin_user_id", new_column_name="owner_user_id")

    if dialect == "postgresql":
        op.execute("ALTER TYPE userrole RENAME VALUE 'admin' TO 'owner'")
    else:
        op.execute("UPDATE users SET role = 'owner' WHERE role = 'admin'")
