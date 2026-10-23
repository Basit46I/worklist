# Architectural Drivers, Constraints, and Assumptions

**Version:** 0.2  
**Status:** Draft for review  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-13  
**Related Docs:** `01-context-and-scope.md`, `03-architecture-overview.md`, `../product/03-goals.md`

---

## 1. Purpose

Separate requirements that genuinely shape system structure from ordinary features and unverified assumptions. Drivers below are provisional until the owner ranks and accepts their measures.

## 2. Candidate Architectural Drivers

| Rank | Candidate driver                      | Draft measure / evidence                                                                     | Structural implications to evaluate                                                                   |
| ---: | ------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
|    1 | Data isolation and permissions        | No user may read or mutate an item outside their authorized scope; define role/action matrix | Resource scoping on every query and mutation; membership/authorization boundary; security tests       |
|    2 | Interactive list performance          | Draft target: P95 under 200 ms, but operation, dataset, and measurement point are undefined  | Query indexes, bounded responses, server pagination, UI rendering strategy; benchmark before choosing |
|    3 | List growth                           | Draft says 10k+ rows; confirm per-list count, fields, concurrent users, and growth           | Avoid loading/rendering every row at once; query and UI design need separate limits                   |
|    4 | Correct concurrent edits              | Define whether conflicting edits may be rejected, merged, or last-write-wins                 | Versioning/conditional writes, explicit conflict response, client refresh behavior                    |
|    5 | Collaboration freshness (conditional) | Draft target under 500 ms; clarify whether this is event delivery, UI update, or end-to-end  | Realtime channel, reconnect and event deduplication only if realtime is approved                      |
|    6 | Small-team operability                | Team size and operational capacity not yet quantified                                        | Prefer few runtime components and managed, observable boundaries; avoid premature microservices       |

The handbook recommends a short, ranked set of drivers, measurable where possible, with each structural decision traceable to one or more drivers. This table is a candidate list, not an approved ranking.

## 3. Repository Constraints (Confirmed)

- Repository is the workspace; units live directly under roots such as `apps/web` and `servers/api`.
- Package manager is pnpm; internal package dependencies use `workspace:*`.
- The control plane is repository-owned under `codebase/`; it is not to be replaced by Turborepo, Nx, or Lerna.
- Current code conventions require strict TypeScript, feature ownership, explicit dependencies, and no explicit `any`.
- Generic UI is owned by `packages/ui`; product-specific UI belongs in the application/feature.
- The API uses Express and its server-owned MongoDB/Mongoose integration. Auth, work-item, and saved-view feature models and repositories persist data through that boundary; local development was verified against the configured Atlas cluster.
- App and server work does not authorize control-plane or foundation redesign.

## 4. Assumptions to Validate

| Assumption                                                               | Why it matters                                     | Validation owner / method           |
| ------------------------------------------------------------------------ | -------------------------------------------------- | ----------------------------------- |
| Initial users are small teams and freelancers                            | Defines onboarding and sharing needs               | Product owner / user research       |
| Users need one or more shared lists                                      | Drives container and membership model              | Product owner / workflow interviews |
| Common fields include title, description, status, due date, and assignee | Drives item model and filtering                    | Product owner / feature scope       |
| Real-time may be desired                                                 | Adds delivery, reconnect, and consistency concerns | Product owner / decide v1 scope     |
| Web-first is sufficient initially                                        | Constrains client/runtime scope                    | Product owner / validate with users |

## 5. Known Constraints and Unknowns

- No project start date, team capacity, or supported deployment region has been supplied.
- “Zero data loss” needs an operational definition, recovery-point objective, backup policy, and failure model.
- P95 200 ms must state whether it applies to API query latency or perceived UI update time.
- “10k rows” must clarify per view, per list, or per account and include field sizes and concurrency.
- Role-based permissions are a feature goal, but role names and permitted actions are undefined.

## 6. Open Questions

1. Which three to seven drivers matter most for v1, in what order?
2. What load profile and latency measures will be used for acceptance?
3. What is the expected number of lists, items, fields, and concurrent editors?
4. What security, privacy, data-retention, and recovery obligations apply?

## Driver Traceability and Quality Scenarios

Before design approval, convert accepted drivers into scenarios with stimulus, operating condition, expected response, and measurable response measure. Link each consequential architecture choice to the driver it serves and record introduced cost or risk. Current ranking and numeric targets are not accepted requirements.

## Current Implementation Evidence (2026-10-14)

- MongoDB readiness returned HTTP 200 with the database available during local verification. This confirms connectivity, not production backup or recovery readiness.
- The web/API use an HTTP cookie session. Local origins should use the same hostname (`localhost`) so the browser sends the SameSite=Lax session cookie.
- The list API applies team scope, supported search/filter/sort, and cursor pagination before returning bounded pages. Group rendering and virtualization are client responsibilities.
- The draft 10k-row, P95 latency, and real-time targets remain unbenchmarked and unapproved. See the performance system design for workload questions.

## 7. Change Log

| Date       | Version | Change                                                                           | Author                             |
| ---------- | ------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| 2026-10-13 | 0.2     | Added subject-specific architecture-lens review guidance; decisions remain draft | Codex draft; owner review required |
| 2026-10-13 | 0.1     | Initial driver/constraint draft; measures marked provisional                     | Codex draft; owner review required |

---

**End of Document**
