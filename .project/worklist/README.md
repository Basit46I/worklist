# Worklist Project Documentation

**Status:** Draft documentation set  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-14

---

## 1. Purpose

This folder contains product knowledge and system design drafts for Worklist, a team work-management product centered on a flexible list. It records the intended product, the decisions still awaiting owner review, and the architecture lenses used to shape implementation.

A **Draft** has been prepared for owner review; it is not an approved commitment. Open questions remain unresolved until an owner decides them. A first authenticated, MongoDB-backed Worklist vertical slice is now implemented in `apps/web` and `servers/api`; see the implementation status below. Production readiness and the remaining v1 features are not yet complete.

## 2. Reading and Design Order

1. Understand the product and users.
2. Identify constraints, assumptions, and ranked measurable drivers.
3. Shape architecture boundaries and record consequential decisions.
4. Design data, list query behavior, APIs, workflows, security, performance, and operations.
5. Review against requirements and relevant architecture lenses.
6. Implement only after the required decisions and acceptance criteria are agreed.

The handbook lifecycle is:

`UNDERSTAND → FRAME → REASON → SHAPE → DECIDE → BASELINE → DESIGN → REVIEW → BUILD → EVOLVE`

## 3. Product Documents (`product/`)

| Document          | Purpose                                                      | Status |
| ----------------- | ------------------------------------------------------------ | ------ |
| `01-vision.md`    | Product purpose, target outcomes, and success measures       | Draft  |
| `02-problem.md`   | User problem, audiences, alternatives, and impact hypotheses | Draft  |
| `03-goals.md`     | Goals, non-goals, and provisional success criteria           | Draft  |
| `04-personas.md`  | Representative users and anti-persona hypothesis             | Draft  |
| `05-use-cases.md` | Actors, triggers, flows, outcomes, and edge cases            | Draft  |
| `06-features.md`  | Feature IDs, priorities, release scope, and open questions   | Draft  |
| `07-roadmap.md`   | Proposed phases, milestones, and dependency hypotheses       | Draft  |

## 4. Architecture Documents (`architecture/`)

| Document                        | Purpose                                                        | Status                                |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| `01-context-and-scope.md`       | System boundary, actors, external systems, and scope           | Draft                                 |
| `02-drivers-and-constraints.md` | Ranked quality drivers, constraints, assumptions, and unknowns | Draft                                 |
| `03-architecture-overview.md`   | Current repository baseline and proposed component boundaries  | Draft; proposed baseline not approved |

## 5. System Design Documents (`system-design/`)

| Document                            | Purpose                                                           | Status |
| ----------------------------------- | ----------------------------------------------------------------- | ------ |
| `01-list-data-and-ownership.md`     | Candidate entities, ownership, relationships, and invariants      | Draft  |
| `02-sort-filter-search-group.md`    | Query semantics, ordering, grouping, and edge cases               | Draft  |
| `03-columns-and-saved-views.md`     | Column configuration, persistence scope, and view sharing         | Draft  |
| `04-api-contracts.md`               | Candidate operations, request/query boundaries, and errors        | Draft  |
| `05-workflows-and-failure-cases.md` | Create/edit/bulk/query/realtime flows and failure branches        | Draft  |
| `06-auth-and-permissions.md`        | Trust boundaries, identity, authorization, and security questions | Draft  |
| `07-performance-and-operations.md`  | Workload, performance measures, reliability, and operations       | Draft  |

## 6. Operations Runbook

`operations/01-production-readiness.md` records the host-independent deployment, release-smoke-check, privacy, and MongoDB Atlas backup/restore preparation. Production hosting, SMTP credentials, Atlas backup settings, alert routing, and restore drills must still be configured by the account owner.

## 7. Decisions (`decisions/`)

`decisions/README.md` contains the ADR process and initial open decision backlog. No Worklist architecture decision is approved yet; ADR-0001 is a proposed membership policy awaiting owner review. Record a consequential decision with its context, options, trade-offs, consequences, and validation; do not silently turn an assumption into a decision.

## 8. Relationship to Source Code

These documents are project knowledge and belong under `.project/worklist/`. Application implementation stays in its owning workspace units, such as `apps/web` and `servers/api`. Generic reusable UI belongs in `packages/ui`; shared contracts belong in `packages/types` only when there is genuine cross-workspace reuse. This documentation plan does not authorize changes to the repository control plane or architecture policy.

## 9. Local Setup Required

A reachable MongoDB server is an external prerequisite for registration, login, saved views, and work-item persistence. If Atlas is already configured and the local app can save and reload data, keep that setup; otherwise configure it locally without committing credentials:

1. Copy `servers/api/.env.example` to `servers/api/.env`.
2. Set `MONGODB_URI` to a reachable local MongoDB or MongoDB Atlas database URI. The checked-in example is only a local placeholder.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` if the web app needs a non-default API URL.
4. Start the repository with `pnpm run dev` from the repository root. The API deliberately starts without persistence when `MONGODB_URI` is absent, but protected data operations return HTTP 503 until MongoDB connects.

`.env` and `.env.local` are ignored by Git. Do not put real credentials in this documentation or commit them.

## 10. Reference

- [Architecture & System Design Handbook](https://adeelchainz.github.io/first-step/architecture-handbook)
- Repository guidance: `AGENTS.md`, `CLAUDE.md`, and `architecture.yaml`

## 11. Review Approach and Document Status

Apply the handbook lifecycle and the relevant lens at each decision point; lenses are viewpoints, not a requirement to add every concern to every document. Product, UX, security, data, reliability, performance, and operations considerations belong where they materially affect the subject. All content remains draft until reviewed by its owner. Proposed diagrams, targets, and models are not implementation commitments.

## 12. Implementation Status (2026-10-14)

Implemented: rate-limited registration/login with server-side cookie sessions; email verification and resend; one-time password-reset links that revoke active sessions; owner-sent, expiring editor/viewer invitations with one-team acceptance; provisional owner/editor/viewer mutation authorization; process-local server-sent events that refresh connected worklists; owner-only team member listing, role changes, and removal with session revocation; privacy-minimized structured request telemetry; one owner-led team per new account; team-scoped work-item create/read/update/delete across supported fields, destructive-action confirmation, and bulk status/priority/assignee/due-date update/delete capped at 100 selected rows with per-item result details; private or team-shared saved views; append-only comments; title search; status, priority, assignee, and due-date filters with AND/OR matching; sorting and grouping by supported fields; visible-column selection, drag reordering, and pointer/keyboard resizing; saved views persist filter, sort, group, column order, and widths; and inline summary expansion. List queries run server-side with stable cursor pagination, a maximum API page size of 100, UI pages of 50 items, and virtualized group/task rows in the scroll viewport. The web app has dedicated `/sign-in` and `/sign-up` routes, protects `/worklist`, and sends signed-out users to `/sign-in`. The server fails closed with HTTP 503 when MongoDB is not connected; `/ready` reports that dependency as unavailable while `/health` remains a liveness check, and the Worklist page explains the required setup before offering account actions. The product and architecture documents remain drafts and these implementation choices are provisional pending review.

Still required before a production v1: configure SMTP credentials and verify email delivery; choose hosting and configure production secrets, HTTPS, monitoring, and alerts; set Atlas backup/recovery policy and complete a restore drill; and run the release smoke checks in the operations runbook. If the local Atlas URI is already configured and the app can persist data, the local database setup is complete. Multi-team accounts remain a v2 non-goal; membership management is limited to the single-team model. Live updates currently use process-local server-sent events, so multiple API instances require a shared event broker. Auth throttling currently uses process-local memory and also needs shared storage before multiple API instances. Comments are append-only and sharing/role policies remain provisional; see the linked ADRs. These multi-instance requirements can wait while the app runs as a single API instance.

Focused tests cover API identity and owner/team authorization, SMTP configuration validation, team-scoped refresh events, work-item/comment input and paging/bulk contracts, saved-view visibility/layout, and client-side list filtering/sorting/grouping. Broader database-backed Worklist routes and full browser journeys are still needed before production confidence is complete.

---

**End of Document**

### Latest implementation slice (2026-10-14)

- Expanded tasks now load and show team-scoped comments. Owners and editors can add append-only comments; viewers can read. Deleting a task removes its comments.
- Saved views default to private and can be explicitly shared with the team. Only the creator can update or delete a view.
- The table header selects currently loaded matching tasks. Bulk selection remains capped at 100; if more than 100 rows are loaded, the control selects the first 100 in the current list order.
- These are provisional product choices. See decisions/0002-comments-shared-views-and-bulk-selection.md.

### Task workflow upgrade (2026-10-22)

- Expanded task details support editable checklists and same-list dependency links. The API rejects self/circular or cross-list dependencies and blocks completion while a dependency is still open. Deleting a prerequisite removes its dependency references from remaining tasks.
- Tasks can repeat daily, weekly, or monthly. Completing one creates the next scheduled occurrence, resets its checklist, and uses a unique series/date key to avoid duplicate repeats.
- Task activity records creation, field edits, comments, and deletion. The task detail shows up to the latest 100 events and refreshes from the existing team event stream.
- The dashboard now shows overdue task counts by owner. Existing dashboard summaries continue to use persisted workspace tasks.
- These are implementation choices, not finalized product commitments. Google Drive and outbound email integrations were not added in this slice.

### Additional worklist actions (2026-10-22)

Task labels, task duplication, archive/restore, loaded-results CSV export, and two keyboard shortcuts are implemented. Archive state is stored on the task; the worklist can switch between active and archived tasks. CSV export currently covers the loaded matching page(s) only. These are provisional implementation details. Google Drive and email integrations remain excluded.
