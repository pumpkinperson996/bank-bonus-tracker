# distribution (delta)

## ADDED Requirements

### Requirement: Runnable container image
The repository SHALL provide a Dockerfile building a self-contained image (no Node install or native toolchain required at runtime) and a docker-compose file that runs it with SQLite state persisted on a host volume. CI SHALL publish the image to GHCR on master pushes and version tags, and the READMEs SHALL document `docker run`/`docker compose up` as the recommended install path in both languages.

#### Scenario: One-command run
- **WHEN** a user runs `docker compose up` (or the documented docker run with a volume)
- **THEN** the app serves on port 3000 and offers/settings survive container recreation via the mounted data directory

#### Scenario: No secrets in image or context
- **WHEN** the image is built from a working directory containing data.db
- **THEN** data.db is excluded from the build context and absent from the image
