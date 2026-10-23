# ADR-0002: Comments, Shared Views, and Loaded-Row Selection

**Status:** Implemented provisionally — product-owner review pending  
**Date:** 2026-10-14  
**Decision owner:** Product owner  
**Related docs:** `../system-design/01-list-data-and-ownership.md`, `../system-design/03-columns-and-saved-views.md`, `../system-design/05-workflows-and-failure-cases.md`

## Context

The current list has inline task details and private saved views. Product notes left comments and view sharing open. Bulk operations already have a 100-item server cap, while users can load additional pages in the UI.

## Decision

This implementation uses three bounded behaviors:

1. Comments are append-only task records stored separately, scoped by team and task. Each record contains the authenticated author ID/name, body (up to 2,000 characters), and creation time. Team members can read; owners and editors can add. Task deletion removes its comments. Editing comments, deleting individual comments, attachments, and activity history are excluded.
2. Saved views are private by default. A creator can explicitly switch a view to team visibility or back to private. Team members can open shared views; only the creator can update or delete. The view never grants access beyond current team authorization.
3. The list header selects matching rows currently loaded in the UI. It never implies selection of unloaded server results. Selection is capped at 100, consistent with the bulk API. When more than 100 matching rows are loaded, selection takes the first 100 in list order.

## Consequences

- Comments use a separate MongoDB collection and a team/task/time index; the API derives author and team from the authenticated session.
- Existing saved views without a visibility field are treated as private. New views explicitly persist their visibility.
- Shared view reads are scoped to the caller's team; write and delete operations remain scoped to the creator.
- “Select loaded” is a convenience for currently loaded rows, not “select all matching results.” The interface reports the cap when it truncates the selection.
- These behaviors are implemented but remain provisional until product-owner review. Revisit if the product requires comment moderation, view-level roles, or server-wide selection.

## Validation

- API and web TypeScript typechecks pass.
- Review team isolation, viewer read-only behavior, comment cleanup, creator-only view management, and the loaded-row selection cap before production release.
