## Purpose

Short, project-specific notes to make AI coding agents productive in this repo.

## Big picture

- React 19 + TypeScript + Vite; UI with Chakra UI.
- SVG canvas editor built around a plugin system; tools contribute UI, behavior, shortcuts, and store slices.
- State: Zustand with Zundo history (50, debounced ~100ms) and `persist` storage key `canvas-app-state`.
- Boot: `src/main.tsx` sets `pluginManager.setStoreApi(canvasStoreApi)` then registers `CORE_PLUGINS` from `src/plugins/index.tsx`.
- Runtime: `src/utils/pluginManager.ts` wires plugin registration, event-bus interactions, scoped shortcuts, and canvas layer composition.

## Where things live

- `src/plugins/<id>/`: each tool (index with PluginDefinition, slice factory, overlays/panels).
- `src/store/`: core slices and dynamic slice registration (`canvasStore.ts`).
- `src/utils/`: helpers (bounds/transform, import/export, snapping, guidelines, `pluginManager.ts`).
- `src/canvas/`: controller, event bus, geometry, common overlays.
- `tests/`: Playwright E2E flows; `playwright.config.ts` runs dev server on 5174.

## Plugin essentials

- Define `PluginDefinition` (see `src/types/plugins.ts`): `id`, `metadata`, optional `handler(event, point, target, context)`, `keyboardShortcuts`, `overlays`, `canvasLayers`, `panels`, `actions`, `slices`, and optional `createApi`.
- Visuals: contribute `canvasLayers` (background/midground/foreground). Example layers and selection visuals are in `src/plugins/index.tsx`.
- Shortcuts: declare combos in `keyboardShortcuts`; they are auto-scoped to the active tool and can add `options.when`.
- Slices: add state via `PluginSliceFactory`; registered at runtime by the plugin manager.

## Patterns that matter

- IDs: elements/groups use string IDs; groups store `childIds`. Use geometry helpers (`src/utils/*`, `src/canvas/geometry/*`) for bounds and transforms.
- Communication: prefer the Canvas Event Bus (`src/canvas/CanvasEventBusContext`) and plugin APIs over direct component calls.
- Keyboard: use centralized shortcut registry (through the plugin manager), not ad-hoc listeners.
- Theming: Chakra color-mode aware overlays; see adaptive selection rectangle in `src/plugins/index.tsx`.

## Dev workflows

- Dev: `npm run dev` (app on 5173; tests use 5174).
- Build: `npm run build`; Types: `npm run type-check`; Lint: `npm run lint`.
- Tests: `npm run test:ui` (Playwright UI; webServer auto-starts).
- Docs: `cd doc && npm i && npm run start` (Docusaurus).

## Add a new tool (quick recipe)

1) Create `src/plugins/myTool/` with `slice.ts` and `index.ts` exporting `PluginDefinition`.
2) Register in `CORE_PLUGINS` (`src/plugins/index.tsx`).
3) Use helpers in `src/utils/*` (bounds, transforms, snapping) and add `canvasLayers`/shortcuts as needed.
4) If other tools must call it, expose `createApi` and access via `pluginManager.getPluginApi('myTool')`.

## Gotchas

- Don’t mutate plugin state outside its slice; use setters created by the slice factory.
- History debounce can coalesce rapid updates; batch if you need finer undo steps.
- Shortcuts are tool-scoped; for global ones, contribute an overlay with `placement: 'global'` or an always-on plugin.

Refs: `src/types/plugins.ts`, `src/utils/pluginManager.ts`, `src/plugins/index.tsx`, `src/store/canvasStore.ts`, `playwright.config.ts`.

Last updated: 2025-11-10
