## ADDED Requirements

### Requirement: UI shows robot state and task state

The system SHALL provide a Traditional Chinese control UI that shows the robot's current state, active task, recent activity events, and pending approvals.

#### Scenario: Active task visible

- **WHEN** a task is in progress
- **THEN** the UI SHALL display the task objective, current step, and last updated time

#### Scenario: No active task

- **WHEN** no task is active
- **THEN** the UI SHALL display an idle state without pretending that background work is happening

### Requirement: UI provides approval surface

The system SHALL display tool approval requests with action summary, risk level, requested input, and approve/deny controls.

#### Scenario: Approval required

- **WHEN** a tool call requires approval
- **THEN** the UI SHALL show the approval request before execution and keep the tool pending until the user responds

#### Scenario: Approval denied

- **WHEN** the user denies a tool request
- **THEN** the UI SHALL show the denial result and the runtime SHALL record the denial event

### Requirement: UI is mobile-first and copy-safe

The system SHALL use responsive layout, touch targets of at least 44px, and Traditional Chinese UI copy.

#### Scenario: Mobile viewport

- **WHEN** the UI is opened on a mobile-width viewport
- **THEN** primary controls SHALL remain reachable without horizontal scrolling
