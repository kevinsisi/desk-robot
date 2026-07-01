## ADDED Requirements

### Requirement: Runtime persists explicit session state

The system SHALL persist each user session, message, active task, and runtime event so the desktop companion can resume from stored state instead of relying only on conversation memory.

#### Scenario: Resume active task after restart

- **WHEN** the server restarts while a task is in progress
- **THEN** the server SHALL load the latest active task state from persistence and expose it through the state API

#### Scenario: Append user message

- **WHEN** the user sends a message
- **THEN** the system SHALL store the message and append a runtime event linked to the current session

### Requirement: Runtime distinguishes task updates from redirects

The system SHALL classify incoming user messages during active work as status question, requirement update, clarification, cancellation, or redirect before changing the active task.

#### Scenario: Requirement update during active task

- **WHEN** a user adds a new requirement while a task is active
- **THEN** the system SHALL merge the requirement into the active task state and emit an update event

#### Scenario: Explicit cancellation

- **WHEN** a user explicitly cancels the active task
- **THEN** the system SHALL mark the task cancelled and stop further task execution

### Requirement: Runtime exposes evidence-backed state

The system SHALL expose robot status, active task status, and recent activity only from persisted runtime state and events.

#### Scenario: No fake idle activity

- **WHEN** there are no recent runtime events
- **THEN** the UI state endpoint SHALL return an idle state without invented activity messages

### Requirement: Companion replies use AI TTS

The system SHALL synthesize Desk Bot voice replies through a server-side AI or neural TTS provider instead of browser or OS speech-synthesis voices.

#### Scenario: Assistant reply is spoken naturally

- **WHEN** a new assistant message appears and voice reply is enabled
- **THEN** the client SHALL request `/api/tts` and play the returned audio
- **AND** the server SHALL prefer OpenAI TTS when configured or otherwise use Taiwanese Mandarin Edge neural TTS
- **AND** the client SHALL NOT use browser `speechSynthesis` as a fallback

#### Scenario: AI TTS text is blank

- **WHEN** `/api/tts` receives empty text
- **THEN** it SHALL return `400 empty_text` without generating audio
