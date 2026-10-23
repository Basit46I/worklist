# ADR-0003: Due-Date Filters, Bulk Edit Fields, and Comment Refresh

**Status:** Implemented provisionally — product-owner review pending  
**Date:** 2026-10-14  
**Decision owner:** Product owner  
**Related docs:** `../system-design/02-sort-filter-search-group.md`, `../system-design/04-api-contracts.md`, `../system-design/05-workflows-and-failure-cases.md`

## Decision

1. Due-date filters accept strict `YYYY-MM-DD` calendar dates in UTC and the operators equals, before, and after. Equality covers `[date start, next date start)`. Before means earlier than date start. After means at or after next date start. This prevents local-time and inclusive-end ambiguity.
2. A bulk request updates one field at a time: status, priority, assignee, or due date. It carries explicit task IDs only and remains capped at 100; each task receives its own outcome.
3. Creating a comment publishes the existing authenticated team refresh event only after MongoDB persistence succeeds. Expanded comment panels re-fetch comments on that signal. The stream remains process-local and is not a multi-instance guarantee.

## Consequences

- API query and saved-view validation share the same supported due-date operators and strict date value format.
- Client-side comparisons operate on ISO date strings, matching the server's UTC date-only behavior.
- Bulk edit reuses the existing per-item result contract; a failed row remains selected for retry.
- Event delivery signals a refresh, not a durable event log. Reconnection still relies on loading the authoritative comments endpoint.
- These implementation rules are provisional and do not constitute product-owner approval.

## Validation

- API and web typechecks and lint are required for this change.
- Confirm date boundary behavior, viewer write denial, and refresh behavior with a live API/database before production use.
