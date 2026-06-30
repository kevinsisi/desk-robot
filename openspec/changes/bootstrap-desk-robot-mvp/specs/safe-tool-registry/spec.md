## ADDED Requirements

### Requirement: Tools are declared in a capability registry

The system SHALL define tools in a central registry with name, description, input schema, permission level, timeout, retry policy, and output redaction policy.

#### Scenario: Register read-only tool

- **WHEN** a read-only tool is added
- **THEN** it SHALL declare its schema, timeout, and safe output formatter before it can be called

#### Scenario: Reject unknown tool

- **WHEN** the runtime is asked to call a tool not present in the registry
- **THEN** it SHALL reject the call and record a failed tool event

### Requirement: Side-effect tools require approval

The system SHALL require explicit user approval before executing any tool marked as side-effecting or sensitive.

#### Scenario: Side-effect tool requested

- **WHEN** an agent requests a side-effecting tool
- **THEN** the runtime SHALL create an approval request and SHALL NOT execute the tool until approved

### Requirement: Tool calls have bounded execution

The system SHALL enforce per-tool timeout and retry policy for every tool call.

#### Scenario: Tool timeout

- **WHEN** a tool exceeds its configured timeout
- **THEN** the runtime SHALL stop waiting, mark the call failed, and record the timeout in tool events

#### Scenario: Retry exhausted

- **WHEN** a retryable tool fails beyond its retry policy
- **THEN** the runtime SHALL return the real failure state without fabricating a successful result
