# Schema initialization

Version 1 creates `users`, `hospitals`, and `research_records` through SQLAlchemy metadata on startup. The owner field is a foreign key to users; email/kind/owner are indexed. SQLite is local-only; production may use PostgreSQL with psycopg.

This baseline does not include automatic upgrade/downgrade migrations. Back up the database before changing the schema. Introduce Alembic revisions for production evolution rather than expecting create_all to alter existing tables.
