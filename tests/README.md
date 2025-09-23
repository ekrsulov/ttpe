# TTPE Playwright Tests

This directory contains end-to-end tests for the TTPE (Text-to-Path Editor) application using Playwright.

## Test Structure

The tests cover the main functionalities of the application:

- **basic.spec.ts**: Basic application loading and mode switching
- **pencil.spec.ts**: Pencil drawing functionality
- **shape.spec.ts**: Shape creation (squares, circles, triangles, rectangles)
- **text.spec.ts**: Text input and formatting
- **selection.spec.ts**: Element selection and transformation
- **edit.spec.ts**: Path editing with smooth brush

## Running Tests

### Prerequisites

Make sure you have Playwright installed:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Run All Tests

```bash
npm test
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Specific Test File

```bash
npx playwright test pencil.spec.ts
```

### Run Tests in Headed Mode (visible browser)

```bash
npx playwright test --headed
```

### Generate Test Report

```bash
npx playwright show-report
```

## Test Configuration

The tests are configured in `playwright.config.ts` with:

- Base URL: `http://localhost:5173`
- Automatic dev server startup
- Tests run in Chromium, Firefox, and WebKit
- HTML test reports

## Test Coverage

The tests cover:

1. **Application Loading**
   - Canvas and sidebar presence
   - Plugin button availability

2. **Mode Switching**
   - Switching between different tools (Select, Pencil, Shape, Text, etc.)

3. **Pencil Drawing**
   - Drawing paths on canvas
   - Switching between new path and add subpath modes

4. **Shape Creation**
   - Creating different shapes (square, circle, triangle, rectangle)
   - Switching between shape types

5. **Text Functionality**
   - Entering text
   - Changing font properties (size, weight, style)
   - Font selection

6. **Selection and Transformation**
   - Selecting created elements
   - Transformation panel functionality
   - Duplicating elements
   - Toggle coordinates and rulers

7. **Edit Functionality**
   - Smooth brush mode toggling
   - Adjusting brush settings (radius, strength, tolerance)
   - Applying smooth brush effects

## Writing New Tests

When adding new tests:

1. Create a new `.spec.ts` file in the `tests/` directory
2. Use descriptive test names and `test.describe` blocks
3. Follow the existing pattern of creating elements before testing interactions
4. Use `page.locator()` with appropriate selectors (titles, text content, etc.)
5. Test both positive and negative scenarios where applicable

## Debugging Tests

To debug failing tests:

1. Run tests in headed mode: `npx playwright test --headed`
2. Use the Playwright UI: `npm run test:ui`
3. Add `await page.pause()` in test code for manual inspection
4. Check the HTML report for screenshots and traces

## CI/CD Integration

For CI/CD pipelines, you can:

1. Install browsers in CI: `npx playwright install --with-deps`
2. Run tests with retries: `npx playwright test --retries=2`
3. Generate reports: `npx playwright test --reporter=html,json`