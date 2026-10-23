# `@workspace/worklist-ui`

Reusable Worklist UI components for workspace applications. The package owns its UI and presentation logic; callers provide data, event handlers, and routing adapters.

## Workspace usage

Add the package to a workspace app:

```json
{
  "dependencies": {
    "@workspace/worklist-ui": "workspace:*"
  }
}
```

Import components and contracts from the public entry point:

```tsx
import {
  WorklistBoard,
  WorklistControls,
  WorklistTable,
  WorklistAuthScreen,
  WorklistShell,
} from "@workspace/worklist-ui";
import type {
  WorkItem,
  WorklistAuthScreenProps,
  WorklistShellProps,
} from "@workspace/worklist-ui";
```

The list and board components receive items and callbacks as props. They do not load data or call the API themselves. `WorklistAuthScreen` accepts optional route links; `WorklistShell` accepts a `renderLink` adapter so a consuming app can provide its router without making this package depend on Next.js.

## Styling requirements

Import both `@workspace/ui/styles.css` and `@workspace/worklist-ui/styles.css` in the consuming app. Configure its CSS pipeline to scan this package's `src/**/*.tsx` files for Tailwind classes. The UI primitives are supplied by `@workspace/ui`.

## Workspace boundary

This is a private pnpm workspace package. Any app in this repository can use it through `workspace:*`; it is not currently published to npm for unrelated repositories.
