# Goals and Non-Goals

**Version:** 1.1  
**Status:** Draft  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-13  
**Related Docs:** `01-vision.md`, `06-features.md`, `07-roadmap.md`

---

## 1. Purpose

Define intended v1 outcomes and exclusions to make scope decisions visible.

## 2. Goals (Draft)

|   # | Goal                                       | Reason                                   |
| --: | ------------------------------------------ | ---------------------------------------- |
|   1 | Provide a fast, interactive list           | Core product experience                  |
|   2 | Sort by supported columns                  | Find and prioritise work                 |
|   3 | Group by a supported column                | Organise work visually                   |
|   4 | Filter using defined AND/OR rules          | Narrow the result set                    |
|   5 | Search across agreed fields                | Find items quickly                       |
|   6 | Show, hide, and reorder columns            | Adapt the table to a workflow            |
|   7 | Perform actions on selected rows           | Reduce repetitive work                   |
|   8 | Expand a row for more detail               | Inspect an item without leaving the list |
|   9 | Save reusable views                        | Reapply list configuration               |
|  10 | Support team collaboration and sync        | Keep collaborators informed              |
|  11 | Authenticate users and enforce permissions | Protect work data                        |
|  12 | Handle large lists acceptably              | Preserve usability as data grows         |

## 3. Non-Goals for Initial Release (Draft)

|   # | Non-goal                     | Reason for deferral                             |
| --: | ---------------------------- | ----------------------------------------------- |
|   1 | Native mobile application    | Start with web; validate demand                 |
|   2 | Offline editing              | Requires sync and conflict-resolution design    |
|   3 | AI features                  | Not required to validate the core product       |
|   4 | Gantt charts                 | Separate planning capability                    |
|   5 | Time tracking                | Separate workflow                               |
|   6 | Invoicing                    | Separate product capability                     |
|   7 | Multiple workspaces per user | Possible later release                          |
|   8 | Custom scripting             | Security and complexity; possible later release |

## 4. Draft Success Criteria

- Users can create and organise a list at the target dataset size, once that size is defined.
- List response-time targets are measured against a named operation and test profile.
- Collaboration updates have a defined latency and consistency expectation.
- Item changes are not silently lost; recovery and conflict behavior are specified.

The earlier numeric targets (10k items, P95 under 200 ms, sync under 500 ms, zero data loss) remain provisional until workload, measurement conditions, and feasibility are agreed.

## 5. Scope Change Rules

- Requests outside agreed goals are recorded for later consideration.
- Conflicting goals are resolved by the product owner, with the trade-off recorded.
- Oversized features are split into smaller outcomes with their own acceptance criteria.

## 6. Open Questions

- Is real-time sync required for v1?
- Are saved views private, shared, or both?
- What list size, latency percentile, and client conditions define success?

## Product and Quality-Attribute Lens

Treat each goal as an outcome to validate and trace structural consequences to architecture drivers. A feature being present does not prove a goal is met. Agree on workload, measurement point, percentile, and failure conditions before setting acceptance thresholds; record trade-offs when goals compete.

## 7. Change Log

| Date       | Version | Change                                                                           | Author                             |
| ---------- | ------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| 2026-10-13 | 1.1     | Added subject-specific architecture-lens review guidance; decisions remain draft | Codex draft; owner review required |
| 2026-10-12 | 1.0     | Initial draft supplied in chat                                                   | [You]                              |

---

**End of Document**
