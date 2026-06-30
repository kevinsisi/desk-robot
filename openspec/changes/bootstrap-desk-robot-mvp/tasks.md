## 1. Workspace and Tooling

- [x] 1.1 Create root `package.json` with npm workspaces, shared scripts, and project metadata.
- [x] 1.2 Add root `tsconfig.base.json` and workspace TypeScript conventions.
- [x] 1.3 Add `.gitignore` for Node, build output, SQLite runtime files, and local env files.
- [x] 1.4 Add GitHub Actions CI that runs install, typecheck, test, and build.
- [x] 1.5 Run root install/typecheck/test/build commands and record the concrete output.

## 2. Server Bootstrap

- [x] 2.1 Create `packages/server` package with Fastify, TypeScript, Vitest, and build scripts.
- [x] 2.2 Implement `GET /health` returning `{ ok: true, version }`.
- [x] 2.3 Add server config module for port, database path, and runtime mode.
- [x] 2.4 Add server tests for app creation and `/health`.
- [x] 2.5 Verify server package tests and build pass.

## 3. Local Persistence

- [ ] 3.1 Add SQLite database initialization with schema creation on first run.
- [ ] 3.2 Create tables for sessions, messages, tasks, approvals, tool_events, and runtime_events.
- [ ] 3.3 Add typed repositories for sessions/messages, tasks, and events.
- [ ] 3.4 Add tests for first-run schema creation and message/event consistency.
- [ ] 3.5 Verify persistence tests pass against a temporary SQLite database.

## 4. Runtime State

- [ ] 4.1 Define runtime/task/message/event TypeScript types.
- [ ] 4.2 Implement runtime service for current state projection from persisted records.
- [x] 4.3 Implement message append flow that stores the message and runtime event (in-memory MVP; SQLite persistence remains Task 3).
- [ ] 4.4 Implement active task update and cancellation flows.
- [ ] 4.5 Add `GET /api/state`, `POST /api/messages`, and `POST /api/tasks/:id/cancel` routes.
- [ ] 4.6 Add tests for resume-after-restart, message append, requirement update, and cancellation behavior.

## 5. Safe Tool Registry and Approvals

- [ ] 5.1 Define tool metadata shape with name, description, input schema, permission level, timeout, retry policy, and redaction policy.
- [ ] 5.2 Implement central tool registry with an initial read-only `system.status` style tool or placeholder safe tool.
- [ ] 5.3 Implement executor behavior for unknown tools, timeout handling, retry exhaustion, and safe summaries.
- [ ] 5.4 Implement approval records and approve/deny transitions for side-effecting tools.
- [ ] 5.5 Add `GET /api/tools`, `POST /api/tool-requests`, `POST /api/approvals/:id/approve`, and `POST /api/approvals/:id/deny` routes.
- [ ] 5.6 Add tests for unknown tool rejection, side-effect approval gating, denial recording, timeout, and retry exhaustion.

## 6. Client Bootstrap

- [x] 6.1 Create `packages/client` package with React, Vite, TypeScript, Tailwind, Vitest, and build scripts.
- [x] 6.2 Add `src/version.ts` with `APP_VERSION` and render it in the footer.
- [x] 6.3 Add API client wrapper for state, messages, tools, and approvals.
- [x] 6.4 Add base layout and styling with compact industrial control-panel direction.
- [x] 6.5 Verify client package build passes.

## 7. Robot Control UI

- [x] 7.1 Implement `RobotFace` using only evidence-backed state labels.
- [x] 7.2 Implement `TaskPanel` showing objective, current step, status, and last updated time.
- [x] 7.3 Implement `ActivityStream` from persisted runtime events.
- [x] 7.4 Implement `ApprovalQueue` with approve/deny controls and risk summaries.
- [x] 7.5 Ensure all user-facing copy is Traditional Chinese and mobile-first touch targets are at least 44px.
- [x] 7.6 Add explicit camera/microphone permission probe UI that only starts after user action and handles denied/non-secure-origin states.
- [x] 7.7 Add component or integration tests for idle state, active task state, pending approval display, media permission states, and message append behavior.

## 8. Runtime Event Streaming

- [ ] 8.1 Add server-side event bus for runtime events.
- [ ] 8.2 Add `GET /api/events/stream` SSE endpoint.
- [ ] 8.3 Connect client to SSE and update activity/task state from events.
- [ ] 8.4 Add tests for SSE connection setup and event formatting where practical.

## 9. Verification and Follow-through

- [x] 9.1 Run `npm run typecheck` from the repo root.
- [x] 9.2 Run `npm run test` from the repo root.
- [x] 9.3 Run `npm run build` from the repo root.
- [x] 9.4 Verify `https://robot.sisihome.org` loads through HTTPS after deployment so browser camera/microphone APIs are available.
- [x] 9.5 Update OpenSpec artifacts if implementation changes requirements or design.
- [ ] 9.6 Commit the completed logical unit with a conventional commit message.
- [ ] 9.7 Push to `origin main` or a feature branch as appropriate and track CI result.
