# Feature List

**Version:** 1.2  
**Status:** Draft  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-14  
**Related Docs:** `05-use-cases.md`, `07-roadmap.md`

---

## 1. Purpose and Scope

Master index of proposed v1 features with IDs, priority, and a short description. Detailed behavior belongs in use cases and system-design documents.

## 2. Feature Table

| ID   | Feature               | Priority | Release | Description                                                                                                 |
| ---- | --------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| F-01 | Registration/login    | P0       | v1      | Email/password sessions with email verification and one-time password recovery; requires SMTP configuration |
| F-02 | List view             | P0       | v1      | Main work-item screen                                                                                       |
| F-03 | Create item           | P0       | v1      | Add a row                                                                                                   |
| F-04 | Edit item             | P0       | v1      | Inline or form-based; interaction to decide                                                                 |
| F-05 | Delete item           | P0       | v1      | Confirmation and recovery behavior to specify                                                               |
| F-06 | Sort                  | P0       | v1      | Sort supported columns                                                                                      |
| F-07 | Filter                | P0       | v1      | AND/OR rules to define                                                                                      |
| F-08 | Search                | P0       | v1      | Debounced search across supported task fields                                                               |
| F-09 | Group                 | P1       | v1      | Group by supported field                                                                                    |
| F-10 | Show/hide columns     | P1       | v1      | Column chooser                                                                                              |
| F-11 | Reorder columns       | P1       | v1      | Drag-based ordering proposed                                                                                |
| F-12 | Resize columns        | P2       | v1      | Drag or keyboard-adjust column edge; saved with view                                                        |
| F-13 | Select multiple items | P1       | v1      | Checkboxes                                                                                                  |
| F-14 | Bulk actions          | P1       | v1      | Delete and edit proposed; permissions and partial failure to define                                         |
| F-15 | Inline row expansion  | P2       | v1      | Show item details                                                                                           |
| F-16 | Saved views           | P1       | v1      | Named list configurations                                                                                   |
| F-17 | Large-list handling   | P1       | v1      | Bounded cursor pages and virtualized rows                                                                   |
| F-18 | Real-time sync        | P2       | v1?     | Authenticated server-sent refresh events; single API process only; multi-instance broker remains open       |
| F-19 | Permissions           | P0       | v1      | Provisional Owner/Editor/Viewer rules, invitations, role changes, and member removal; one team per account  |
| F-20 | Telemetry             | P2       | v1      | Minimal structured request telemetry; no query, body, identity, IP, or work-item content                    |

## 3. Priority Definitions

| Priority | Meaning                                   |
| -------- | ----------------------------------------- |
| P0       | Must have; blocks launch                  |
| P1       | Important; target for v1                  |
| P2       | Nice to have; may move to a later release |

## 4. Release Definitions

| Release | Meaning              |
| ------- | -------------------- |
| v1      | First public release |
| v2      | Next planned release |
| Later   | Unscheduled backlog  |

The phase labels in the roadmap are delivery stages, while v1/v2 are release targets. Feature-to-phase mapping still needs agreement.

## 5. Examples

F-06 (Sort) is described by UC-02 and will receive detailed behavior in `../system-design/02-sort-filter-search-group.md`.

## 6. Edge Cases

- Conflicting feature requests are decided by the product owner and recorded.
- Features too large for review or delivery are split into smaller outcomes.

## 7. Open Questions

- Is F-18 real-time sync part of v1?
- Should F-20 telemetry be P1 or remain P2?
- What exactly does “permissions” include in v1?
- Which features map to each roadmap phase?

## Capability and Traceability Lens

Feature IDs are a catalogue, not detailed requirements or proof of approval. Link each feature to use cases and define observable acceptance criteria and an owner before build. Priority, release target, and roadmap phase are separate concepts; do not infer one from another. Revisit priority when evidence or dependencies change.

## 8. Change Log

| Date       | Version | Change                                                                           | Author                             |
| ---------- | ------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| 2026-10-13 | 1.1     | Added subject-specific architecture-lens review guidance; decisions remain draft | Codex draft; owner review required |
| 2026-10-12 | 1.0     | Initial draft supplied in chat; wording clarified as provisional                 | [You]                              |

## Implementation Status (2026-10-14)

The current source implements the listed list controls, cursor paging, virtualization, and auth flows. Email verification, one-time password recovery, invitations, owner-only member listing/role changes/removal, viewer mutation denial, authenticated process-local server-sent refresh events, and privacy-minimized request telemetry are also implemented. Email actions require SMTP settings. Membership currently supports one team per account, and role policy remains provisional. Focused tests cover API identity and owner/team authorization, SMTP configuration validation, team-scoped refresh events, work-item/comment input and paging/bulk contracts, saved-view visibility/layout, and client-side list filtering/sorting/grouping. Full browser journeys and database-backed Worklist route coverage remain to be added. This status reports code state; it does not approve feature scope or priorities.

---

**End of Document**

## Implementation update (2026-10-14)

- F-13: added select-loaded control; selection includes only loaded matching tasks and stops at 100.
- F-15: expanded details now include team-scoped, append-only comments; readers may view, owners/editors may add.
- F-16: saved views remain private by default and may be explicitly shared with the team; the creator retains sole update/delete rights.
- These are provisional implementation choices pending product-owner review; see ADR-0002.

## Additional implementation update (2026-10-14)

- F-07 supports due-date equals/before/after filters using UTC calendar-day semantics.
- F-14 bulk edits now include assignee and due date in addition to status and priority; every request still applies one field to at most 100 explicit task IDs.
- F-18 team refresh events now refresh comments in open expanded task details after a comment is saved. The transport is still process-local.
