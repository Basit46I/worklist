# Worklist frontend handoff for Claude

This is a focused frontend handoff from the Worklist monorepo, not a complete runnable clone of the whole application. It includes the web app source and its reusable UI packages, root architecture guidance, and all design references from `New folder/`.

## Included
- `apps/web/`: existing Next.js frontend routes, feature components, API client integration, styling, and frontend configuration.
- `packages/worklist-ui/`: shared Worklist presentation components and models.
- `packages/ui/`: shared UI primitives, compositions, theme and component configuration.
- `New folder/`: every supplied UI reference image.
- Root `AGENTS.md`, `architecture.yaml`, `package.json`, `pnpm-workspace.yaml`, and `README.md` for project conventions/context.
- `CLAUDE_UI_HANDOFF_PROMPT.md`: staged, one-page-at-a-time implementation brief.

## Intentionally excluded
Backend/server source, real `.env` files or credentials, `node_modules`, `.next`, generated `dist` output, test result artifacts and unrelated packages. Frontend API client files remain included so Claude can preserve request contracts without receiving secrets.

## Start here
1. Attach this ZIP to Claude and paste `CLAUDE_UI_HANDOFF_PROMPT.md`.
2. Ask Claude to complete the **List page only** first. The prompt directs it to stop when that page is done and wait for your approval.
3. After reviewing List, tell Claude to continue to Board. Review it, then ask for Calendar as a separate pass.
4. Do not provide SMTP/database passwords or `.env` values.