# Sort, Filter, Search, and Group Design

**Version:** 0.2  
**Status:** Draft for review  
**Owner:** [Your Name]  
**Reviewer:** Adeel  
**Last Updated:** 2026-10-13  
**Related Docs:** `01-list-data-and-ownership.md`, `03-columns-and-saved-views.md`, `04-api-contracts.md`

---

## 1. Purpose

Define observable list-query behavior independently of UI widgets or database implementation.

## 2. Query Model (Proposed)

A list query may contain:

```text
ListQuery = {
  search?: SearchExpression,
  filters?: FilterExpression,
  sort?: SortTerm[],
  groupBy?: FieldId,
  page?: CursorPage
}
```

The wire format and whether the URL is canonical for view state remain to be decided. Validate fields and operators against an allowlist; never pass raw client field names directly to a database query builder.

## 3. Sorting

- Sort only fields explicitly declared sortable.
- Direction is `asc` or `desc`.
- Define null ordering, text collation/case behavior, date/time zone interpretation, and stable tie-breaking.
- Add a unique stable tie-breaker such as item ID so equal values do not jump unpredictably between pages.
- The initial interaction draft cycles ascending → descending → unsorted; confirm whether this is the intended UI behavior.
- Multi-column sorting is not in the initial feature draft and remains an open decision.

## 4. Filtering

A filter condition consists of an allowed field, an allowed operator for that field type, and a validated value. Candidate operators include equality, inequality, contains, is-empty, before/after, and range, but the v1 set needs product approval.

- AND and OR composition must be explicit in the query model.
- Parentheses/grouping and precedence must be defined; do not rely on implicit UI ordering.
- Invalid fields/operators return a stable validation error.
- Define behavior for empty values, missing values, arrays, and dates.
- Enforce resource authorization before returning filtered records or counts.

## 5. Search

Initial draft proposes starting after two characters with a 300 ms debounce. Those values are provisional and are primarily client interaction behavior.

Decide:

- Which fields are searched (for example title only versus title and description).
- Case, diacritic, token, and substring behavior.
- Whether search is database-native, indexed, or limited to a page.
- Whether results highlight matches.
- Minimum and maximum query length and abuse limits.

## 6. Grouping

- Group only by fields that support meaningful grouping.
- Define ordering of groups, including empty/null values.
- Define whether group counts represent all matches or only the current page.
- Define collapse-state persistence and whether multiple grouping levels are supported.
- When combined with sort, specify whether sorting applies globally, within each group, or both.

## 7. Composition and Precedence

Recommended query order is authorization scope → filter/search matching → grouping/sorting → pagination/windowing, while counts are computed against the intended pre-pagination result set. Exact count requirements can change cost and must be explicit.

The semantic query must have one consistent interpretation whether executed on the server or represented in a saved view. UI-only filtering of a partial server page must not be presented as filtering the entire dataset.

## 8. URL and Saved-State Behavior

- Decide which query parameters are shareable/bookmarkable.
- Encode only validated, non-sensitive view state in the URL.
- Define how browser back/forward restores query state.
- Saved-view persistence rules are described in `03-columns-and-saved-views.md`.

## 9. Empty and Failure States

- No matching items: return an empty result with normal pagination metadata.
- Invalid query: return a clear validation error without executing an unsafe query.
- Unsupported sort/filter field: identify the invalid field/operator.
- Query timeout/store failure: return a retryable service error; do not return partial results as complete.

## 10. Open Questions

- Which field/operator matrix is in v1?
- Are nested AND/OR groups required?
- Which exact search fields and matching rules are expected?
- Are counts exact, approximate, or omitted for large results?
- Are multi-sort or multi-level grouping required?

## Query Semantics and Performance Lens

Treat the query as a validated declarative contract shared by UI, API, and saved views. Specify field/operator compatibility, null and missing-value semantics, deterministic ordering, grouping/count scope, and pagination consistency. Authorization constrains candidate records before rows or aggregate counts are exposed. Bound query complexity and test representative query shapes before choosing indexes or optimisations.

## Current Grouping Implementation (2026-10-14)

Group headings collapse and expand in the client. Groups contain the currently loaded pages; when the API has another cursor page, each heading labels its count as items loaded so far rather than a total. Rows are rendered through a viewport virtualizer with dynamic measurement for expanded task details. A complete 10k-row workload remains unbenchmarked.

Search runs across title, description, status, priority, and assignee. A valid exact `YYYY-MM-DD` query also matches items with that UTC due date; partial or localized date phrases are not interpreted as dates. Query matching and cursor pagination happen on the server before the UI renders the result pages.

## 11. Change Log

| Date       | Version | Change                                                                           | Author                             |
| ---------- | ------- | -------------------------------------------------------------------------------- | ---------------------------------- |
| 2026-10-13 | 0.2     | Added subject-specific architecture-lens review guidance; decisions remain draft | Codex draft; owner review required |
| 2026-10-13 | 0.1     | Initial behavior contract draft; semantics remain open for approval              | Codex draft; owner review required |

---

**End of Document**

## Due-date filter implementation (2026-10-14)

The filter builder supports due date equals, before, and after using strict UTC calendar dates (`YYYY-MM-DD`). “Before” excludes the selected date; “after” excludes the selected date. Server queries use an inclusive start and exclusive next-day boundary for equality, and the same semantics are used in the client model and saved-view validation. Other operators are rejected for date fields.
