## Context

The repo is currently a workflow/template seed: it has project rules, skills, and OpenSpec config, but no runnable application code. `desk-robot` should start as a local-first HomeProject app that gives the user a visible desktop companion plus a bounded agent runtime.

The governing stack defaults are React + TypeScript + Vite, Tailwind CSS, Node.js + TypeScript backend, and SQLite via `better-sqlite3`. Agent behavior must be explicit and auditable: no fake liveness, no hidden tool execution, no unbounded autonomy.

## Goals / Non-Goals

**Goals:**

- Bootstrap a runnable monorepo with `packages/client` and `packages/server`.
- Provide a local backend runtime for sessions, messages, active tasks, approvals, tool events, and persisted state.
- Provide a Traditional Chinese UI at `https://robot.sisihome.org` that shows robot state, active task progress, activity evidence, approval prompts, and browser camera/microphone permission state.
- Define tool capabilities as data with permission levels, timeouts, retries, and safe result reporting.
- Ship tests, build scripts, version constants, and CI foundations from the first product commit.

**Non-Goals:**

- No physical robot hardware integration in the MVP.
- No always-listening microphone or camera capture in the MVP; camera/microphone support must be explicit, user-triggered, permission-aware, and only available from the HTTPS secure context.
- No remote code execution, shell control, or Home Assistant operations until explicit capability gates are designed.
- No fake autonomous status text that is not backed by persisted events or runtime state.
- No multi-user auth in the first local MVP.

## Decisions

### Decision: Use npm workspaces monorepo

Use root `package.json` with `packages/client` and `packages/server` workspaces.

Alternatives considered:
- Single Vite app only: faster UI start, but no durable runtime boundary.
- Separate repos: unnecessary overhead before the product shape stabilizes.

Rationale: keeps client/server independently testable while preserving a simple local dev flow.

### Decision: Use Fastify + TypeScript for the backend

The server should expose `/health`, REST endpoints for current state, and SSE for event streaming.

Alternatives considered:
- Express: acceptable, but Fastify gives stronger schema and plugin ergonomics.
- FastAPI: useful for Python-first services, but this project should stay TypeScript end-to-end unless a later AI/runtime dependency forces Python.

### Decision: Use SQLite with event-log-first persistence

Persist sessions, messages, tasks, approvals, tool_events, and runtime_events. Derive UI projections from stored state instead of inventing status text.

Alternatives considered:
- In-memory only: fast but breaks resume and evidence requirements.
- Postgres: heavier than needed for local-first single-user MVP.

### Decision: Capability registry before tools

Each tool must be declared centrally with name, description, input schema, permission level, timeout, retry policy, and output redaction policy. MVP tools should be read-only or simulated until approval UX is proven.

Alternatives considered:
- Hardcoded tool handlers in route code: faster initially but creates unsafe sprawl.
- Full agent framework dependency: too much abstraction before core product semantics are known.

### Decision: UI is an evidence-backed control surface, not a mascot-only toy

The first UI should include a robot face/status area, message/activity stream, active task panel, and approval queue. Copy must be Traditional Chinese.

Alternatives considered:
- Pure chat UI: too generic and hides the robot/task concept.
- Animated mascot first: risks fake liveness before runtime behavior exists.

### Decision: Reserve `robot.sisihome.org` as the HTTPS secure-context domain

Use `https://robot.sisihome.org` as the canonical private/Tailscale URL for the desk robot UI. The route should target the future web service on port `8723` and keep same-origin API/SSE/media permission flows so browser camera and microphone APIs are available without mixed-content issues.

Alternatives considered:
- `desk-robot.sisihome.org`: descriptive but longer and less memorable.
- HTTP-only local URL: insufficient for browser camera/microphone APIs outside localhost secure-context exceptions.

## Risks / Trade-offs

- Scope creep into a full personal assistant → Keep MVP local, explicit, and approval-gated.
- Agent loops or repeated tool calls → Add persisted active task state and anti-loop counters before adding powerful tools.
- UI over-promises autonomy → Only render status from persisted events/tasks.
- Tool results leak sensitive data → Add redaction policy and result shaping in the capability registry.
- Fastify/SQLite integration choices may need migration later → Keep storage access behind small repository modules.
- Browser media permissions vary across Safari/iOS/Chrome → Keep camera/microphone access user-triggered, surface permission errors clearly, and verify on HTTPS domain before claiming support.

## Migration Plan

1. Bootstrap the monorepo and local scripts.
2. Add database schema/migrations and typed repositories.
3. Add runtime state machine and event append APIs.
4. Add UI projection endpoints and SSE stream.
5. Add UI surfaces for robot state, task state, events, and approvals.
6. Add camera/microphone permission probes in the UI without auto-start capture.
7. Add tests/build/CI.

Rollback is simple until deployment: revert the product-code commits and keep OpenSpec artifacts as the planning source.

## Open Questions

- Should the first visual identity lean industrial, minimal, or organic? Default recommendation: compact industrial control panel with a small expressive robot face.
- Should the first external integration be local file/project awareness, HomeProject status, or calendar/reminders? Default recommendation: local project/task awareness only.
- Should the app be deployed immediately under `robot.sisihome.org` after MVP, or stay local until tool safety is proven?
