# Worklist Feature Notes

## Workspace templates

Templates are user-managed, team-shared MongoDB records. Editors can create, edit, and delete them; authenticated workspace members can read them. A template contains a name, description, ordered statuses, and up to 50 task titles. Applying one creates a normal team List with that workflow, then adds starter tasks through the existing authenticated API. Starter tasks begin in the first status, use Medium priority, and receive due dates one day apart. The created tasks can be changed or deleted afterward.

Template definitions are no longer bundled in the web app. List creation and task creation are separate API writes; if a later task request fails, the List may exist with only some starter tasks. The UI reports this partial outcome and opens the new List so the user can continue.

## List hierarchy and workflows

Each List stores a Space name (default `General`) and an optional Folder name. These values are team-owned List metadata, so Lists can be located as `Space / Folder / List` without changing existing task ownership or IDs. This is a lightweight hierarchy: Spaces and Folders are not yet separate independently managed records.

Each List also stores its ordered status names in its settings. Existing Lists keep the default `To do`, `In progress`, and `Done` workflow. Editors can set 2–12 unique statuses from the List controls. The API checks task creation, status updates, bulk updates, and moves against the destination List's workflow. A status currently used by tasks cannot be removed until those tasks are moved to another allowed status.

## Dashboard and workspace navigation

`/dashboard` summarizes tasks loaded from the authenticated Lists and paginated Work Items API. Its scope selector, status totals, due-soon queue, priority/assignee workload, and per-List progress use saved workspace data rather than sample values. The optional **My tasks** control filters the summary and deadline queue by the signed-in user's display name; task assignment is still a free-text field, so teams should use consistent member names. The attention panels surface unassigned tasks, pending/requested approval, tasks blocked by unfinished or missing dependencies, and Lists whose tracked time is over their configured budget. Work Item refresh events reload the dashboard. The desktop sidebar and mobile bottom navigation connect the Dashboard and Worklist; account actions use the existing session sign-out endpoint.

The Worklist requests bounded cursor pages and virtualizes visible task rows. Realtime events are coalesced into one refresh during event bursts; the browser reconciles the active view after SSE reconnect, network recovery, or returning to a visible tab. This improves recovery for a single API process but does not provide cross-instance delivery or a durable event log.

Task/list write controls are shown only for recognized Owner and Editor roles, and the API denies writes unless the session role is exactly Owner or Editor. Team member administration remains Owner-only. The team panel includes the current role matrix; role policy remains provisional pending product-owner review.

The API does not currently expose task-completion history or an activity feed, so the dashboard does not invent a completed-per-day chart or recent activity entries. Sign-in, registration, invitations, email verification, and password recovery continue to use the existing authenticated API endpoints.

The Worklist offers List, Board, and Calendar views. The Calendar reads saved tasks and supports Month, Week, and Day layouts. Previous/next navigation follows the active layout; Today returns to the current date, and zoom controls move between Day, Week, and Month. Selecting a date in Month opens its Day view. Multi-day tasks appear on each date from start through due date. Existing records without a start date use their due date as the start, so no migration is required.

The Dashboard composes the saved workspace data into an editable status board, a Calendar, and five task KPIs (total, in progress, completed, overdue, completion percentage), followed by detailed workspace reports. Board status changes use the existing authenticated Work Item API; work remains scoped to the selected workspace/list and member filter. The KPI strip reflects current saved data and does not show historical momentum or fabricated week-over-week trends.

## Large-team readiness snapshot

- Bulk selection and bulk mutation are bounded to 100 explicit loaded task IDs.
- Work-item reads use cursor pagination (50 by default; API maximum 100), and the table virtualizes rendered rows.
- Authenticated team refresh events use a process-local server-sent event hub. They refresh connected clients but are not a durable notification inbox and do not support cross-instance delivery.
- The 10,000-task performance target has not been benchmarked. Measure representative query and render workloads before claiming that target.

## Share a local preview

Install the ngrok CLI and authenticate it with your ngrok account. Then run `node codebase/cli/repo.mjs run web:dev:share` from the repository root. This starts ngrok and both development servers, prints the HTTPS URL, and routes browser API requests through the web app so teammates only need one link. Keep the command running while the preview is in use; stopping it closes the public tunnel. This is a temporary development preview, not a production deployment.
