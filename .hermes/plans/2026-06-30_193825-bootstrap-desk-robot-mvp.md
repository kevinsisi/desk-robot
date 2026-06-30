# Desk Robot MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Bootstrap `desk-robot` as a local-first desktop companion at `https://robot.sisihome.org` with an evidence-backed agent runtime, safe tool registry, SQLite persistence, camera/microphone permission support, and a Traditional Chinese control UI.

**Architecture:** Use an npm workspaces monorepo with `packages/server` for Fastify + TypeScript + SQLite runtime APIs, and `packages/client` for React + TypeScript + Vite + Tailwind UI. Runtime state is persisted as sessions, messages, tasks, approvals, tool events, and runtime events; the UI only renders state derived from those records.

**Tech Stack:** TypeScript, React, Vite, Tailwind CSS, Fastify, better-sqlite3, Vitest, GitHub Actions.

---

## Current Context

- Repo cloned at `/Users/ching/HomeProject/desk-robot`.
- Current remote: `https://github.com/kevinsisi/desk-robot.git`.
- Current commit: `46a2c5a Initial commit`.
- Repo currently contains rules/skills/OpenSpec scaffolding but no runnable product app.
- Active OpenSpec change: `openspec/changes/bootstrap-desk-robot-mvp/`.

## Scope Boundaries

### In scope

- Runnable local app skeleton.
- Evidence-backed robot state and activity stream.
- Explicit active task state model.
- SQLite persistence.
- Safe, initially minimal capability registry.
- Approval queue UI and API.
- HTTPS secure-context route at `robot.sisihome.org` for browser camera/microphone support.
- Explicit camera/microphone permission probes; no auto-start capture.
- CI with typecheck/test/build.

### Out of scope for MVP

- Physical robot hardware.
- Camera/microphone capture.
- Home Assistant or shell-control tools.
- Always-listening or hidden camera/microphone recording.
- Multi-user auth.
- Fake autonomous animations/status not backed by events.

## Step-by-step Plan

### Task 1: Bootstrap monorepo package structure

**Objective:** Create the root workspace and base TypeScript tooling.

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.github/workflows/ci.yml`

**Implementation notes:**
- Root scripts: `dev`, `build`, `test`, `typecheck`, `lint`.
- Workspaces: `packages/server`, `packages/client`.
- Use npm workspaces unless repo constraints change.

**Verification:**

```bash
npm install
npm run typecheck
npm run test
npm run build
```

Expected initially after Task 1: scripts exist; app packages may still be minimal stubs.

### Task 2: Create backend package

**Objective:** Add a runnable Fastify server with health endpoint and typed config.

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/app.ts`
- Create: `packages/server/src/config.ts`
- Create: `packages/server/src/app.test.ts`

**Expected API:**
- `GET /health` → `{ ok: true, version: string }`

**Verification:**

```bash
npm run --workspace @desk-robot/server test
npm run --workspace @desk-robot/server build
```

### Task 3: Add SQLite persistence layer

**Objective:** Store sessions, messages, tasks, approvals, tool events, and runtime events.

**Files:**
- Create: `packages/server/src/db/schema.ts`
- Create: `packages/server/src/db/database.ts`
- Create: `packages/server/src/repositories/sessionRepository.ts`
- Create: `packages/server/src/repositories/taskRepository.ts`
- Create: `packages/server/src/repositories/eventRepository.ts`
- Create: `packages/server/src/db/database.test.ts`

**Data model:**
- `sessions(id, created_at, updated_at)`
- `messages(id, session_id, role, content, created_at)`
- `tasks(id, session_id, objective, status, current_step, updated_at)`
- `approvals(id, task_id, tool_name, summary, risk_level, status, created_at, resolved_at)`
- `tool_events(id, task_id, tool_name, status, safe_summary, created_at)`
- `runtime_events(id, session_id, task_id, type, safe_summary, payload_json, created_at)`

**Verification:**

```bash
npm run --workspace @desk-robot/server test -- database
```

### Task 4: Add runtime state service

**Objective:** Implement state transitions for messages, tasks, updates, cancellations, and UI projections.

**Files:**
- Create: `packages/server/src/runtime/runtimeService.ts`
- Create: `packages/server/src/runtime/types.ts`
- Create: `packages/server/src/runtime/runtimeService.test.ts`
- Modify: `packages/server/src/app.ts`

**API:**
- `GET /api/state`
- `POST /api/messages`
- `POST /api/tasks/:id/cancel`

**Verification:**

```bash
npm run --workspace @desk-robot/server test -- runtime
```

### Task 5: Add capability registry and approval flow

**Objective:** Define safe tool metadata and approval-gated execution skeleton.

**Files:**
- Create: `packages/server/src/tools/registry.ts`
- Create: `packages/server/src/tools/types.ts`
- Create: `packages/server/src/tools/executor.ts`
- Create: `packages/server/src/tools/executor.test.ts`
- Modify: `packages/server/src/app.ts`

**API:**
- `GET /api/tools`
- `POST /api/tool-requests`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/deny`

**Verification:**

```bash
npm run --workspace @desk-robot/server test -- tools
```

### Task 6: Create frontend package

**Objective:** Add Vite React UI foundation with version footer.

**Files:**
- Create: `packages/client/package.json`
- Create: `packages/client/index.html`
- Create: `packages/client/vite.config.ts`
- Create: `packages/client/tsconfig.json`
- Create: `packages/client/src/main.tsx`
- Create: `packages/client/src/App.tsx`
- Create: `packages/client/src/version.ts`
- Create: `packages/client/src/styles.css`

**Verification:**

```bash
npm run --workspace @desk-robot/client build
```

### Task 7: Build robot control UI

**Objective:** Show robot state, active task, activity stream, and approval queue in Traditional Chinese.

**Files:**
- Create: `packages/client/src/api/client.ts`
- Create: `packages/client/src/components/RobotFace.tsx`
- Create: `packages/client/src/components/TaskPanel.tsx`
- Create: `packages/client/src/components/ActivityStream.tsx`
- Create: `packages/client/src/components/ApprovalQueue.tsx`
- Create: `packages/client/src/components/MediaPermissionPanel.tsx`
- Modify: `packages/client/src/App.tsx`

**Design direction:** Compact industrial control panel, not generic gradient cards.

**Verification:**

```bash
npm run --workspace @desk-robot/client build
```

### Task 8: Add SSE runtime event stream

**Objective:** Let the UI receive runtime events without polling everything.

**Files:**
- Create: `packages/server/src/runtime/eventBus.ts`
- Modify: `packages/server/src/app.ts`
- Modify: `packages/client/src/api/client.ts`
- Modify: `packages/client/src/App.tsx`

**API:**
- `GET /api/events/stream` as `text/event-stream`.

**Verification:**

```bash
npm run test
npm run build
```


### Task 8.5: Add camera/microphone permission probe

**Objective:** Confirm browser media-device capability from the HTTPS domain without starting hidden recording.

**Files:**
- Create: `packages/client/src/components/MediaPermissionPanel.tsx`
- Modify: `packages/client/src/App.tsx`

**Behavior:**
- Show whether `navigator.mediaDevices?.getUserMedia` is available.
- Start camera/microphone check only after a user click/tap.
- Stop tracks immediately after permission probing unless the user explicitly enters a future capture mode.
- Show Traditional Chinese errors for denied permission or non-secure origins.

**Verification:**

```bash
npm run --workspace @desk-robot/client build
# after deployment: open https://robot.sisihome.org and verify browser media permission prompt works
```

### Task 9: Add CI and completion follow-through

**Objective:** Ensure every push runs install, typecheck, tests, and builds.

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `CLAUDE.md` if the project-specific app rules need codification.
- Update: OpenSpec tasks/specs if implementation discovers requirement changes.

**Verification:**

```bash
npm run typecheck
npm run test
npm run build
git status --short
```

## Risks and Defaults

- **Product identity:** default to compact industrial UI until user picks another visual tone.
- **Tool safety:** keep MVP tools read-only or approval-gated; do not add shell/Home Assistant tools yet.
- **Fake liveness:** every UI status must come from runtime state/events.
- **Deployment:** defer public domain deployment until local MVP and safety boundaries pass.

## Open Questions for User Review

1. 第一版要偏「工業控制台」還是「可愛桌寵」？我建議先工業控制台，避免假活著感。
2. 第一個真實工具要接「專案/檔案狀態」還是先完全只做 runtime skeleton？我建議先 skeleton。
3. MVP 完成後要不要直接部署到 `robot.sisihome.org`？我建議先掛 HTTPS domain，正式工具權限模型穩定後再開更多能力。
