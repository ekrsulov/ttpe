---
id: overview
title: Event Bus Overview
sidebar_label: Overview
---

# Event Bus Overview

The Canvas Event Bus is a type-safe pub/sub system that decouples plugins from direct canvas manipulation.

## Architecture

```typescript
class CanvasEventBus {
  subscribe<K extends keyof EventMap>(
    eventType: K, 
    handler: (payload: EventMap[K]) => void
  ): () => void;
  
  emit<K extends keyof EventMap>(
    eventType: K, 
    payload: EventMap[K]
  ): void;
  
  clear(): void;
}
```

## Event Types

- **pointerdown**: Canvas pointer press
- **pointermove**: Canvas pointer movement
- **pointerup**: Canvas pointer release
- **keyboard**: Keyboard events
- **wheel**: Scroll/zoom events

## Usage

```typescript
// Subscribe
const unsubscribe = eventBus.subscribe('pointerdown', (payload) => {
  console.log(payload.point, payload.activePlugin);
});

// Emit
eventBus.emit('pointermove', { event, point, target, activePlugin, helpers, state });

// Cleanup
unsubscribe();
```

See [Event Topics](./topics) for payload schemas.
