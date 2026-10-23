# Columns and Saved Views Design

**Version:** 0.2  
**Status:** Draft for review  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-13  
**Related Docs:** `01-list-data-and-ownership.md`, `02-sort-filter-search-group.md`, `04-api-contracts.md`

---

## 1. Purpose

Define how a user configures list presentation and how a reusable view captures that configuration.

## 2. Column Model

A column should refer to an approved field definition rather than arbitrary executable behavior. A field definition may specify ID, label, value type, visibility defaults, and whether it supports sorting, filtering, grouping, and editing.

The initial product draft mentions show/hide, reorder, and resize. It does not yet establish whether users can create custom fields. Custom fields are therefore not assumed here.

## 3. Column Preferences

Candidate configuration:

```text
ColumnLayout = {
  orderedColumnIds: FieldId[],
  hiddenColumnIds: FieldId[],
  widths?: Record<FieldId, number>
}
```

Validation must reject unknown IDs, duplicate IDs, invalid widths, and layouts that hide required system fields if any exist. Decide whether minimum/maximum widths are enforced by UI only or also normalized at persistence boundaries.

## 4. Persistence Scope (Decision Needed)

Possible scopes:

1. Temporary page state.
2. Per-user default layout for a list.
3. Layout stored inside a saved view.
4. Shared team default with personal overrides.

The initial draft says layout is saved but does not identify which scope. Do not silently choose one.

## 5. Saved View Model

A saved view may capture:

- Name and optional description.
- List/container reference.
- Filter, search, sort, and grouping state.
- Visible/ordered columns and optional widths.
- Owner, visibility scope, and timestamps.
- Version for safe updates if concurrent editing matters.

Saved views store declarative, validated configuration—not raw database queries or executable code.

## 6. Sharing and Authorization

The product must decide whether views are private, shared, or both. For shared views, define who can create, edit, delete, and change visibility. Opening a saved view must still apply current item-level access; a view is not a permission grant.

## 7. UX and Failure Behavior

- Renaming a view should not change its query.
- Deleting a view should not delete list items.
- An obsolete field in a saved view should be handled with a recoverable warning or migration policy.
- A view that references inaccessible data must not reveal it.
- Unsaved configuration changes should have a clear save/discard behavior.

## 8. Open Questions

- Are views personal, shared, or both in v1?
- Is there a default view per user or list?
- Are custom fields supported?
- Are column widths saved and synchronized across devices?
- Can shared users edit a view, or only duplicate it?

## State, Ownership, and UX Lens

Separate transient interaction state, URL/shareable state, personal preferences, and persisted saved-view state. For each, name its owner, lifetime, visibility, and conflict behavior. A saved view is configuration, never an authorization grant; opening it must apply current access. Define recovery for deleted or renamed fields so users can repair outdated views.

## Current Implementation Note (2026-10-14)

The current UI supports showing/hiding and drag-reordering the four supported item columns. A keyboard-accessible resize separator adjusts widths from 100 to 480 pixels; saved views store those widths together with their other list configuration. Saved views are private to the creating user and team. Users can create, update/rename, select, and delete their own saved views. Updating a view replaces its name and full configuration in one request. The model remains intentionally limited to the fields currently supported by Worklist; this is an implementation snapshot, not an approved product contract.

## 9. Change Log

| Date       | Version | Change                                                                           | Author                             |
| ---------- | ------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| 2026-10-13 | 0.2     | Added subject-specific architecture-lens review guidance; decisions remain draft | Codex draft; owner review required |
| 2026-10-13 | 0.1     | Initial configuration contract draft; scope not yet approved                     | Codex draft; owner review required |

---

**End of Document**

## Current implementation addendum (2026-10-14)

Saved views default to private. Their creator can explicitly share one with the team or make it private again. Team members can open shared views; only the creator can update or delete them. Opening a view never changes item authorization. This visibility policy is provisional pending product-owner review.
