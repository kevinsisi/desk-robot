## ADDED Requirements

### Requirement: SQLite stores runtime records

The system SHALL use SQLite to store sessions, messages, tasks, approvals, tool events, and runtime events.

#### Scenario: Database initializes on first run

- **WHEN** the server starts with no existing database
- **THEN** it SHALL create the required schema before accepting requests

#### Scenario: Message and event consistency

- **WHEN** a message is stored
- **THEN** the related runtime event SHALL be stored in the same logical operation or the request SHALL fail cleanly

### Requirement: Persistence layer provides typed access

The system SHALL access SQLite through typed repository modules rather than raw queries scattered across route handlers.

#### Scenario: Route reads current state

- **WHEN** an API route needs current task state
- **THEN** it SHALL call a repository/runtime service instead of embedding SQL in the route handler

### Requirement: Stored events support UI projections

The system SHALL keep enough event data to reconstruct recent activity for the UI.

#### Scenario: Activity stream loaded

- **WHEN** the UI requests recent activity
- **THEN** the system SHALL return ordered persisted events with timestamps, type, and safe summary text
