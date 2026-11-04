# PostgreSQL container notes

The Podman stack uses the official PostgreSQL 17 image:

- Image: `docker.io/library/postgres:17`
- Database name: `skillmatrix`
- Username: `skillmatrix`
- Password: `password`

Configuration values are defined in `podman/.env` and consumed by `podman/podman-compose.yml`.

Persistent data is stored in the named volume `skill-matrix-db-data`.

No custom init scripts are required because the backend applies the schema and seed data through Liquibase on startup.

