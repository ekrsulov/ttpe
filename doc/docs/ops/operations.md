---
id: operations
title: Operations
sidebar_label: Operations
---

# Operations

Build, test, and deployment workflows.

## Build

```bash
npm run build
```

Output: `dist/` directory with optimized bundles.

## Development

```bash
npm run dev
```

Runs Vite dev server on port 5173.

## Testing

```bash
npm run test:ui     # Playwright UI mode
npm run test        # Run all tests
```

## Type Checking

```bash
npm run type-check
```

## Linting

```bash
npm run lint
```

## Deployment

1. Build: `npm run build`
2. Preview: `npm run preview`
3. Deploy `dist/` to hosting (Netlify, Vercel, etc.)

## CI/CD

Configure GitHub Actions or similar for:
- Automated testing on PR
- Type checking
- Build verification
- Deployment on merge to main
