---
id: patterns
title: Event Patterns
sidebar_label: Patterns
---

# Event Patterns

Common patterns for working with the event bus.

## Plugin-Scoped Handlers

```typescript
eventBus.subscribe('pointerdown', (payload) => {
  if (payload.activePlugin !== 'my-plugin') return;
  // Handle event
});
```

## Error Handling

```typescript
eventBus.subscribe('pointerdown', (payload) => {
  try {
    // Handle event
  } catch (error) {
    console.error('Handler error:', error);
  }
});
```

## Cleanup

```typescript
const unsubscribe = eventBus.subscribe('pointermove', handler);

// Later
unsubscribe();
```
