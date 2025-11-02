---
id: code-standards
title: Code Standards
sidebar_label: Code Standards
---

# Code Standards

Coding conventions for TTPE.

## TypeScript

- Use strict mode
- No implicit `any`
- Prefer interfaces for public APIs
- Use types for unions and intersections

## React

- Functional components only
- Use hooks (no class components)
- Memo expensive computations
- Use `useCallback` for stable references

## File Organization

```
plugin/
├── index.ts          # Plugin definition
├── slice.ts          # Zustand slice
├── Panel.tsx         # UI components
└── Overlay.tsx
```

## Naming

- **Files**: PascalCase for components, camelCase for utilities
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types**: PascalCase

## Formatting

Use ESLint and Prettier (if configured):

```bash
npm run lint
```

## Testing

- Write E2E tests for user-facing features
- Use descriptive test names
- Test happy path and edge cases

## Git Commits

Follow Conventional Commits:

```
feat: add new plugin
fix: resolve selection bug
docs: update plugin guide
```
