# Architecture Decision Records

**Status:** Decision log initialized; no product architecture decisions approved yet  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-13

---

## 1. Purpose

Record consequential architecture choices with the context and trade-offs that justify them. An ADR records a decision; it is not a feature spec or a place to present an unapproved option as settled.

## 2. When to Write an ADR

Write an ADR when a choice materially affects system boundaries, data ownership, API compatibility, security, consistency, reliability, operations, cost, or the effort required to reverse course. Routine local implementation choices do not need ADRs.

## 3. Statuses

- **Proposed:** options are being evaluated; not yet approved.
- **Accepted:** decision owner approved the choice.
- **Superseded:** a later ADR replaced it; link the replacement.
- **Rejected:** considered and declined; retain the reason for future context.

## 4. Decision Backlog

The following topics need decisions before the related implementation is locked in. They are not decisions yet.

| Topic                                       | Related document                                     | Owner / status                                                                           |
| ------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| User/list/team/workspace ownership boundary | `../system-design/01-list-data-and-ownership.md`     | Owner to assign; open                                                                    |
| MongoDB or alternative persistence choice   | `../architecture/03-architecture-overview.md`        | Owner to assign; open                                                                    |
| Authentication/session strategy             | `../system-design/06-auth-and-permissions.md`        | Owner to assign; open                                                                    |
| Role and action matrix                      | `../system-design/06-auth-and-permissions.md`        | Proposed in [ADR-0001](0001-team-membership-and-permissions.md); Adeel approval required |
| Realtime v1 scope and consistency           | `../system-design/05-workflows-and-failure-cases.md` | Owner to assign; open                                                                    |
| API compatibility/versioning policy         | `../system-design/04-api-contracts.md`               | Owner to assign; open                                                                    |
| Saved-view visibility and ownership         | `../system-design/03-columns-and-saved-views.md`     | Owner to assign; open                                                                    |
| Performance workload and acceptance profile | `../system-design/07-performance-and-operations.md`  | Owner to assign; open                                                                    |
| Deployment, backup, and recovery objectives | `../system-design/07-performance-and-operations.md`  | Owner to assign; open                                                                    |

## 5. ADR Template

Create one file per decision using the next available number, for example `0001-list-ownership-boundary.md`.

```md
# ADR-NNNN: [Decision title]

**Status:** Proposed | Accepted | Rejected | Superseded  
**Date:** YYYY-MM-DD  
**Decision owner:** [Name]  
**Related docs:** [links]

## Context

What problem or driver requires a decision? Include constraints and evidence.

## Decision

What was chosen? Keep this section empty or explicitly proposed until approved.

## Options Considered

| Option | Benefits | Costs / risks |
| ------ | -------- | ------------- |

## Consequences

What becomes easier, harder, required, or intentionally excluded?

## Validation

What evidence, experiment, or review checks the decision?

## References

- Related requirements, design documents, or prior ADRs.
```

## Decision Review Rules

An ADR should name the driver and evidence requiring a choice, compare viable options using consistent criteria, state consequences and reversibility, and define validation. Keep proposed decisions marked until the decision owner accepts them. Link superseded records instead of rewriting their historical rationale.

## 6. Change Log

| Date       | Change                                   | Author                             |
| ---------- | ---------------------------------------- | ---------------------------------- |
| 2026-10-13 | Decision log and initial backlog created | Codex draft; owner review required |

---

**End of Document**
