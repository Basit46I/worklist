# Use Cases

**Version:** 1.2  
**Status:** Draft  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-14  
**Related Docs:** `04-personas.md`, `06-features.md`

---

## 1. Purpose and Scope

Describe primary v1 interactions as actors, triggers, flows, and outcomes. Technical implementation and API details belong in system-design documents.

## UC-01: Create a New Item

**Actor:** Authenticated user with create permission  
**Trigger:** Selects “New Item”

**Flow:**

1. The create form opens.
2. User enters title and any supported fields.
3. User saves.
4. The item appears in the list according to the active view and ordering rules.

**Outcome:** The item is persisted and visible to users with access.

## UC-02: Sort the List

**Actor:** User with list access  
**Trigger:** Activates a sortable column header

**Flow:**

1. First activation sorts ascending.
2. Second activation sorts descending.
3. Third activation clears sorting, if this cycle is confirmed.

**Outcome:** Visible items follow the selected sort; whether sort is encoded in the URL remains to be decided.

## UC-03: Filter the List

**Trigger:** Opens the filter control

**Flow:** User adds field/operator/value conditions, chooses AND/OR composition, and applies or edits them.

**Outcome:** Only items matching the defined filter semantics appear. Invalid or unsupported conditions receive a clear explanation.

## UC-04: Group the List

**Trigger:** Chooses a “Group by” field

**Flow:** Items are arranged under group headings; each group may show a count and may be collapsed.

**Outcome:** Items are organised by the selected field. Null/empty values and group ordering need specified rules.

## UC-05: Configure Columns

**Trigger:** Opens column controls

**Flow:** User shows or hides supported columns and reorders them. Resizing is optional until behavior is confirmed.

**Outcome:** The list displays the user's column layout; persistence scope (session, user, or saved view) is an open decision.

## UC-06: Search Items

**Trigger:** Types in the search field

**Flow:** Search begins after a defined minimum input and debounce interval. Matching fields, case/diacritic behavior, and highlighting need specification.

**Outcome:** Matching items appear, with an empty-results state when none match.

## UC-07: Bulk Action

**Actor:** User with permission to perform the selected operation  
**Trigger:** Selects multiple items

**Flow:** A bulk-action bar appears; user chooses an action, confirms destructive actions, and receives a result summary.

**Outcome:** The action succeeds for eligible items; partial failures are reported without hiding successful or failed item outcomes.

## UC-08: Save a View

**Trigger:** Chooses “Save View”

**Flow:** Current sort, filter, grouping, and column configuration are given a name and saved.

**Outcome:** View can be opened later. Private/shared scope, ownership, and edit permissions remain to be decided.

## UC-09: Expand a Row

**Trigger:** Activates the row expand control

**Flow:** Additional item details are shown inline while preserving the user's place in the list.

**Outcome:** Details are viewed without navigating away. Comments are included only if they are part of the agreed scope.

## UC-10: See Another User's Change

**Actors:** Two users with access to the same list  
**Trigger:** One user changes an item

**Flow:** The change is persisted, communicated to other viewers, and reconciled with any concurrent edits.

**Outcome:** Users converge on the agreed item state. Delivery mechanism, latency target, conflict handling, and stale-client behavior are open design questions.

## Edge Cases

- Empty list: explain how to create the first item.
- No filter/search matches: show an empty result state and a way to clear criteria.
- Network failure: preserve safe local input where possible, show status, and offer retry.
- Permission denied: do not reveal or mutate inaccessible data.
- Concurrent edits: show or resolve conflicts according to the selected consistency policy.

## Open Questions

- Can bulk selection include items on other pages or all filter matches?
- Is real-time sync required for v1, and what does the latency target measure?
- Which operations update the URL or persist in a saved view?

## Workflow Review Lens

Before implementation, give each use case explicit preconditions (identity, permission, resource), success postconditions, and alternate/failure outcomes. Clarify retry safety, concurrency, and partial success for mutations. Distinguish an empty query result from request failure. Cross-component recovery details belong in system-design workflow documentation.

## Current Interaction Note (2026-10-14)

UC-04 group headings now collapse and expand with an accessible control. While more cursor pages remain, group counts are labeled as loaded counts rather than totals; groups combine the currently loaded pages and continue to update as more pages arrive. Virtualized rendering keeps only visible group/task rows and overscan rows mounted.

## Current Interaction Notes (2026-10-14)

- UC-01 creation accepts title, status, priority, assignee text, and due date; the UI supplies defaults for fields the user leaves unchanged.
- UC-03 search is debounced and searches titles across the full team dataset through the API; filters cover status, priority, and assignee using AND/OR rules.
- UC-05 column visibility, order, and widths are stored with a private saved view. Saved views can be selected and deleted; deleting a view does not delete tasks.
- UC-07 destructive single and bulk deletes require confirmation. Bulk status/priority updates and deletions display aggregate summaries plus per-task outcomes; failed rows stay selected for retry. Selection is limited to 100 loaded rows per bulk action, matching the server batch cap.
- All supported item fields can be updated in the row; current expanded detail is a summary and does not include comments.

## Authentication and Route Flow (2026-10-14)

- `/sign-in` is the dedicated login URL; `/sign-up` is the dedicated registration URL.
- `/worklist` is protected. A visitor without a valid session is redirected to `/sign-in`.
- Successful registration or login navigates to `/worklist`.
- Sign out revokes the server session, clears its cookie, and navigates to `/sign-in`; it must not route to registration.

## Change Log

| Date       | Version | Change                                                                                           | Author                             |
| ---------- | ------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 2026-10-14 | 1.2     | Recorded dedicated sign-in/sign-up routes, protected worklist redirect, and sign-out destination | Codex draft; owner review required |
| 2026-10-13 | 1.1     | Added subject-specific architecture-lens review guidance; decisions remain draft                 | Codex draft; owner review required |
| 2026-10-12 | 1.0     | Initial draft supplied in chat                                                                   | [You]                              |

---

**End of Document**

## Implementation update (2026-10-14)

- UC-07: the table header selects the currently loaded matching rows, limited to 100 in current list order; unloaded rows are never implicitly selected.
- UC-08: saved views default to private. The creator can share/unshare with the team; teammates can open shared views but cannot modify or delete them.
- UC-09: expanded task details include comments. Owners/editors can append comments; all team members can read them. Comments are append-only and removed when the task is deleted.
- These behaviors are provisional pending product-owner review; see ../decisions/0002-comments-shared-views-and-bulk-selection.md.

## Additional implementation update (2026-10-14)

- UC-03 supports due date equals, before, and after, with strict UTC calendar-day boundaries.
- UC-07 bulk operations support status, priority, assignee, and due-date changes, one field per request and at most 100 selected tasks.
- UC-10's existing authenticated team refresh stream also refreshes an expanded task's comments after a teammate posts.
