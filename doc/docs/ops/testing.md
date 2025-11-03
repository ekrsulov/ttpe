---
id: testing
title: Testing
sidebar_label: Testing
---

# Testing

Vectornest uses Playwright for end-to-end testing.

## Test Structure

Tests are in `tests/`:
- `basic.spec.ts`: Core functionality
- `align.spec.ts`: Alignment features
- `boolean_ops.spec.ts`: Boolean operations
- ...more feature-specific tests

## Running Tests

```bash
npm run test:ui         # Interactive UI mode
npx playwright test     # Headless mode
npx playwright test --headed  # Headed mode
```

## Writing Tests

```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Test assertions
});
```

## Visual Regression

Playwright supports screenshot comparison:

```typescript
await expect(page).toHaveScreenshot('feature.png');
```

## Test Helpers

Exposed via `window.testHelpers` in non-production builds.

See `src/testing/testHelpers.ts` for available utilities.
