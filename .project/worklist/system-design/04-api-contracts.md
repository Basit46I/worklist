# API Contracts

**Version:** 0.2  
**Status:** Proposed contract outline  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-13  
**Related Docs:** `01-list-data-and-ownership.md`, `02-sort-filter-search-group.md`, `05-workflows-and-failure-cases.md`

---

## 1. Purpose

Set API boundary principles and candidate operations. This is not a final route or schema commitment.

## 2. API Principles

- Express contracts in product/domain language, not database-document shape.
- Authenticate the caller and authorize resource access on every protected operation.
- Validate request parameters at the feature boundary with runtime schemas.
- Return stable machine-readable error codes mapped deliberately to HTTP status.
- Keep feature contracts local unless web and API genuinely share a contract; then publish through the controlled `packages/types` API.
- State-changing operations that may be retried need idempotency or an explicit duplicate/conflict policy.
- Limit page size, search length, filter depth, and bulk operation size.

## 3. Candidate Operations

| Operation                                     | Intent                                   | Notes to resolve                                          |
| --------------------------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `GET /lists/{listId}/items`                   | Query visible items                      | Sort/filter/search/group, cursor, counts, response limits |
| `POST /lists/{listId}/items`                  | Create an item                           | Allowed fields, duplicate request behavior                |
| `GET /lists/{listId}/items/{itemId}`          | Read item detail                         | Authorization scope and expansion fields                  |
| `PATCH /lists/{listId}/items/{itemId}`        | Update selected fields                   | Concurrency token and validation                          |
| `DELETE /lists/{listId}/items/{itemId}`       | Remove or archive item                   | Recovery/retention policy                                 |
| `POST /lists/{listId}/items/bulk`             | Apply a bounded action to selected items | Atomicity, limits, partial-result contract                |
| `GET/POST/PATCH/DELETE /lists/{listId}/views` | Manage saved views                       | Visibility and owner policy                               |

Route style and versioning strategy require an ADR before external consumers depend on them.

## 4. Query Contract (Candidate)

A list query may accept a validated filter expression, search term, sort list, grouping field, and cursor/page size. The client must not send raw MongoDB operators, arbitrary field paths, or unbounded query expressions.

Response may include items, next cursor, and optional total/group counts. Exact count cost and whether counts are returned must be decided.

## Current List Query Implementation (2026-10-14)

`GET /work-items` accepts a bounded `limit` (1–100, default 50), an opaque continuation `cursor`, case-insensitive search across title, description, status, priority, and assignee, status, supported sort field/direction, and up to ten validated filter conditions with AND/OR logic. The server enforces the authenticated team scope and applies these query conditions before sorting and paging. It sorts with the selected field and `_id` as a deterministic tie-breaker, fetches one extra record to determine whether another page exists, and returns `{ items, nextCursor }`. No total count is returned. The web client requests 50 items and exposes Load more; grouping remains client-side, while the loaded group and item rows are virtualized in the scroll viewport with dynamic row measurement. This documents source behavior, not a finalized public compatibility guarantee.

## Current Bulk Operation Result (2026-10-14)

Bulk deletion returns a deleted count and a result for every submitted item ID (`deleted`, `not_found`, or `failed`). Bulk status/priority updates return an applied count and a result for every ID (`applied`, `not_found`, or `failed`). A complete success returns 200; mixed or failed item outcomes return 207 Multi-Status. The UI exposes each outcome and keeps failed rows selected for retry. Operations are bounded to 100 item IDs, scoped to the authenticated team, and run with bounded concurrency. They do not promise all-or-nothing transaction semantics.

Saved views support authenticated `GET`/`POST`/`PATCH`/`DELETE` operations. `PATCH /saved-views/{viewId}` validates the replacement name and complete view state, then updates only a view owned by the current user within the authenticated team. Missing or foreign views return the same not-found result.

## Current Account and Team Operations (2026-10-14)

- `POST /auth/register` creates an unverified account and sends a verification link; it does not issue a session.
- `POST /auth/verification/request` sends a resend link without confirming whether the email needs verification; `POST /auth/verification/confirm` consumes a one-time token.
- `POST /auth/password/forgot` returns a generic accepted response; `POST /auth/password/reset` consumes a one-time token, changes the password, and revokes existing sessions.
- `POST /auth/invitations` is owner-only and invites an unregistered address as `editor` or `viewer`; `POST /auth/invitations/accept` consumes the link and creates or reactivates a one-team account.
- `GET /auth/team/members` lists members for owners. `PATCH /auth/team/members/{memberId}` changes a non-owner member to editor/viewer. `DELETE /auth/team/members/{memberId}` removes a non-owner and revokes sessions. All protected queries use the authenticated team scope.
- Email operations require a complete SMTP configuration. Token digests, not raw action tokens, are stored in MongoDB.

## 5. Error Contract

| Condition                       |                                     Candidate HTTP status | Stable code example                     |
| ------------------------------- | --------------------------------------------------------: | --------------------------------------- |
| Invalid request                 |                                                       400 | `VALIDATION_ERROR`                      |
| Unauthenticated                 |                                                       401 | `UNAUTHENTICATED`                       |
| Authenticated but unauthorized  |                            403 or concealed 404 by policy | `FORBIDDEN`                             |
| Resource missing                |                                                       404 | `NOT_FOUND`                             |
| Version conflict                |                                                       409 | `CONFLICT`                              |
| Rate/size limit reached         | 429 for authentication throttling; 413 for payload limits | `rate_limited` or a specific limit code |
| Temporary service/store failure |                                                       503 | `SERVICE_UNAVAILABLE`                   |
| Unexpected failure              |                                                       500 | `INTERNAL_ERROR`                        |

Do not return stack traces, secrets, or persistence internals to clients. Error detail and whether forbidden resources are concealed are security decisions.

## 6. Pagination and Stable Ordering

Cursor pagination is a candidate for large lists; its sort key must be stable and include a unique tie-breaker. Page size must be bounded. Offset pagination remains an option for small datasets but may become costly or unstable as data changes.

## 7. Open Questions

- Is the API public or only consumed by the web app in v1?
- Which URL versioning and compatibility policy is appropriate?
- Which operations require idempotency keys?
- Should bulk operations be all-or-nothing or return per-item results?
- Which list query capabilities and count metadata are required?

## Contract and Boundary Review

For each operation document caller identity, resource scope, validation, success shape, error codes, retry safety, and limits. Keep public contracts independent of persistence models and manage compatibility intentionally. Specify bulk atomicity and per-item outcomes; specify stable continuation semantics for paginated queries. Share schemas only when genuine cross-workspace reuse exists.

## 8. Change Log

| Date       | Version | Change                                                                           | Author                             |
| ---------- | ------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| 2026-10-13 | 0.2     | Added subject-specific architecture-lens review guidance; decisions remain draft | Codex draft; owner review required |
| 2026-10-13 | 0.1     | Initial candidate API contract outline                                           | Codex draft; owner review required |

---

**End of Document**

## Current implementation addendum (2026-10-14)

- GET /work-items/{itemId}/comments returns comments only for a task in the authenticated user's team; unknown or cross-team task IDs return not found.
- POST /work-items/{itemId}/comments accepts a trimmed 1–2,000 character body. The server derives author and team from the session. Owners/editors may post; viewers are read-only.
- Saved-view create/update accept visibility private or team; omission defaults to private. Listing includes the caller's private views and team-shared views. Update/delete remain creator-scoped.
- Bulk selection is by explicit task IDs and capped at 100; no select-all-matching server operation exists.

## Bulk update and date filter additions (2026-10-14)

Bulk update accepts one selected field per request: status, priority, assignee, or due date. Item IDs remain explicit and limited to 100; per-item outcomes remain partial-success results. Due-date filter values must be strict UTC calendar dates. `equals` matches that date; `before` means earlier than its UTC start; `after` means on the following UTC day or later. Comment creation publishes the existing team refresh event after persistence so expanded comment lists re-fetch.

## Task workflow additions (2026-10-22)

- Work items accept up to 50 checklist entries, up to 50 unique dependency IDs, and an optional daily, weekly, or monthly recurrence interval.
- Dependency IDs are validated against the authenticated team and task list. Self-links and circular chains are rejected; a task cannot become Done while a dependency is unfinished.
- Completing a recurring task creates the next occurrence and resets checklist completion. A unique team/series/due-date index makes repeated completion requests idempotent.
- `GET /work-items/{itemId}/activity` returns the latest 100 activity entries for an existing task in the authenticated team. Task creation, edits, comments, and deletion are recorded.
- The dashboard adds an overdue-by-owner breakdown to its existing live workspace metrics.

These are current implementation details and remain provisional until product review. Activity is task-scoped; deleted tasks no longer expose their retained history through the task detail endpoint.

## Task management additions (2026-10-22)

- Work items support up to 20 unique labels (max 32 characters each); labels are searchable and included in task CSV exports.
- Editors can duplicate a task. The copy resets checklist completion, recurrence, and dependency links to avoid carrying workflow state unintentionally.
- Editors can archive and restore tasks. Normal list queries return active tasks; `includeArchived=true` returns archived tasks for that list.
- CSV export contains the currently loaded tasks that match the active search and filters. It is not an all-pages export when the list is paginated.
- The worklist page supports `N` to open task creation and `/` to focus search. Shortcuts are disabled while the user is typing in a form field.
