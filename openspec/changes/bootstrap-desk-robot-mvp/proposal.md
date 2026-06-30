## Why

`desk-robot` needs a concrete MVP direction before product code starts. The goal is to bootstrap a local desktop companion that can observe user intent, keep explicit task state, and safely act through bounded tools without becoming a generic chat UI or fake-liveness toy.

## What Changes

- Create the first runnable project structure for a desktop robot companion.
- Add a local backend agent runtime with explicit task state, capability registry, permission gates, and event logging.
- Add a desktop/mobile-friendly web UI for the robot face, conversation/activity stream, active task panel, and tool approval surface.
- Add persistence for sessions, messages, tasks, approvals, and tool events using SQLite.
- Add an initial safe tool set for local-only actions, with stronger tools disabled until explicitly configured.
- Add build/test/CI/deployment foundations so follow-up work has verification and release paths.

## Capabilities

### New Capabilities

- `desktop-companion-runtime`: Defines agent task/session state, message handling, event logging, interruption/resume behavior, and tool execution boundaries.
- `robot-control-ui`: Defines the user-facing desk robot interface, including Traditional Chinese copy, active task status, approval prompts, and activity evidence.
- `local-persistence`: Defines persisted data for sessions, messages, tasks, approvals, and tool/tool-result events.
- `safe-tool-registry`: Defines how tools are declared, permissioned, approved, timed out, retried, and reported.

### Modified Capabilities

- None.

## Impact

- New monorepo app using React + TypeScript + Vite frontend and Node.js + Fastify/Express + TypeScript backend.
- New SQLite database accessed through `better-sqlite3`.
- New package scripts for dev, build, lint/typecheck, test, and start.
- New CI workflow for install, typecheck, test, and build.
- Later deployment can target a local HomeProject host behind `*.sisihome.org`, but the MVP should run locally first.
