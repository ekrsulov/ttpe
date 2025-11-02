---
id: topics
title: Event Topics
sidebar_label: Topics
---

# Event Topics

Complete reference for all event payloads.

## CanvasPointerEventPayload

```typescript
interface CanvasPointerEventPayload {
  event: PointerEvent;
  point: Point;                    // SVG coordinates
  target: EventTarget | null;
  activePlugin: string | null;
  helpers: CanvasPointerEventHelpers;
  state: CanvasPointerEventState;
}
```

## CanvasKeyboardEventPayload

```typescript
interface CanvasKeyboardEventPayload {
  event: KeyboardEvent;
  activePlugin: string | null;
}
```

## CanvasWheelEventPayload

```typescript
interface CanvasWheelEventPayload {
  event: WheelEvent;
  activePlugin: string | null;
  svg?: SVGSVGElement | null;
}
```

See [Event Patterns](./patterns) for common usage patterns.
