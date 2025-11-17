---
id: bezier-circle
title: Bezier Circle Constant
sidebar_label: Bezier Circle Constant
---

# Bezier Circle Approximation Constant

The repository uses a small constant for improved cubic Bezier circle approximation, exposed as `BEZIER_CIRCLE_KAPPA`.

Location:
- `src/utils/bezierCircle.ts`

Purpose
- A 'perfect' circle can be approximated using 4 cubic Bezier segments. The control point distance relative to the radius is a known constant (often referred to as kappa/kappa).
- Historically there are two common constants used in different sources (0.552284749831 and 0.551915024494). We standardized on the improved value of `0.551915024494` for better visual accuracy.

Usage
- The constant is used in shape generation (`src/plugins/shape/ShapePreview.tsx`), path operations (`src/utils/pathOperationsUtils.ts`), path parsing/import (`src/utils/pathParserUtils.ts`, `src/utils/svgImportUtils.ts`), and any geometry generator where circles or circular arcs are approximated via Bezier curves.

Examples
- In the shape generator for a circle, the control points are calculated using `radius * BEZIER_CIRCLE_KAPPA` to produce a visually more accurate circle using cubic Bezier segments.

Notes
- The constant is exported as `BEZIER_CIRCLE_KAPPA` and available to all modules that need consistent circle approximations.
- If you need to tweak circle appearance or revert to the older constant for a specific reason, update `src/utils/bezierCircle.ts` accordingly and add a clear note to the changelog or comments. However, changing this value may alter existing SVG imports/exports and visual results.