# Remediation Report

## Overview
A review of the codebase identified one unused action in the canvas store and duplicated color conversion helpers in two utility modules. The work completed in this change removes the unused action and centralises the shared colour conversion logic so that future improvements touch a single well-tested helper.

## Unused Code
### `finishPath` canvas action
- **Location:** `src/store/canvasStore.ts`
- **Issue:** The `finishPath` action was exposed through the `useCanvasStore` interface but was never invoked by any component or hook. Keeping the noop action inflated the public API of the store, which increases maintenance costs and can mislead contributors into thinking additional cleanup is required when finishing pencil operations.
- **Remediation:** The action has been removed from both the store type definition and the store implementation. This keeps the public surface area focused on actively supported workflows.

## Duplicated Code
### Hex-to-HSL conversion helpers
- **Locations:** `src/utils/opticalAlignmentUtils.ts` and `src/utils/presets.ts`
- **Issue:** Each module declared an almost identical `hexToHsl` helper. Maintaining two copies of the same algorithm risks logic drift and forces future fixes to be applied twice. For example, enhancing colour validation would have required touching both files.
- **Remediation:** A shared `hexToHsl` helper now lives in `src/utils/canvasColorUtils.ts`. Both modules import the centralised function, eliminating duplication while keeping consistent return semantics for existing callers.

## Follow-up Opportunities
- Consider extracting additional colour utilities (such as the inline `hexToRgb` helper inside `getContrastingColor`) into the same shared module when the need arises. This will further reduce duplication as colour handling evolves.
- If new pencil-tool lifecycle hooks are required in the future, document them clearly in the store so their responsibilities are easy to audit. Keeping the store API lean makes it easier to spot genuinely unused behaviour.
