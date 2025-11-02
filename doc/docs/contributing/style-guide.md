---
id: style-guide
title: Documentation Style Guide
sidebar_label: Style Guide
---

# Documentation Style Guide

Standards for writing documentation.

## Principles

1. **DRY (Don't Repeat Yourself)**: Link instead of duplicating
2. **Precision**: Accurate, tested code examples
3. **Completeness**: No "TBD" placeholders
4. **Actionable**: Copy-paste examples that work

## Formatting

### Headings

- Use sentence case: "Plugin system" not "Plugin System"
- Maximum 3 heading levels in a single document
- Start with H1 (`#`), then H2 (`##`), etc.

### Code Blocks

Always specify language:

```typescript
const example = 'with language';
```

### Links

Use relative links:
- `[Plugin System](../plugins/overview)`
- `[Architecture](../architecture/overview)`

### Lists

- Use `-` for unordered lists
- Use `1.` for ordered lists
- Indent sub-lists with 2 spaces

## Code Examples

### TypeScript

- Use proper types, no `any` unless necessary
- Include imports when relevant
- Show realistic examples, not "foo" and "bar"

### Comments

Only add comments for non-obvious logic:

```typescript
// ✅ Good
const threshold = 10; // Minimum distance in pixels

// ❌ Unnecessary
const threshold = 10; // Set threshold to 10
```

## Terminology

Consistent terms:
- **Plugin** (not tool, module, extension)
- **Slice** (not reducer, store piece)
- **Event Bus** (not message bus, pub/sub)
- **Canvas Store** (not state, global store)

## Mermaid Diagrams

Use for:
- Architecture diagrams
- Sequence flows
- State machines

Keep diagrams simple and focused on one concept.
