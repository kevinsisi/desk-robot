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


### Requirement: UI supports explicit camera and microphone permission flow

The system SHALL support browser camera and microphone access from the HTTPS `robot.sisihome.org` secure context, with capture started only after explicit user action.

#### Scenario: User grants camera and microphone permission

- **WHEN** the user explicitly starts a camera or microphone check and grants browser permission
- **THEN** the UI SHALL show the granted device state without implying background recording is active

#### Scenario: User denies camera or microphone permission

- **WHEN** the user denies camera or microphone permission
- **THEN** the UI SHALL show a clear Traditional Chinese permission error and SHALL NOT retry capture automatically

#### Scenario: Non-secure context blocks media devices

- **WHEN** the UI is opened from a non-secure origin that cannot use `navigator.mediaDevices`
- **THEN** the UI SHALL explain that camera and microphone require `https://robot.sisihome.org` or localhost development mode
