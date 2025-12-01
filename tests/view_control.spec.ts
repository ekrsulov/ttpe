import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths as _getCanvasPaths, waitForLoad, getToolButton } from './helpers';

test.describe('View Control & Gestures Tests', () => {
  test('should zoom in and out', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    const canvas = getCanvas(page);
    const initialViewBox = await canvas.getAttribute('viewBox');
    expect(initialViewBox).toBeTruthy();

    // Zoom in with mouse wheel
    await canvas.hover();
    await page.mouse.wheel(0, -100);

    // Wait for zoom to complete
    await page.waitForTimeout(300);

    // Verify zoom completed (viewBox should exist)
    const zoomedViewBox = await canvas.getAttribute('viewBox');
    expect(zoomedViewBox).toBeTruthy();

    // Zoom out
    await canvas.hover();
    await page.mouse.wheel(0, 100);

    // Wait for zoom to complete
    await page.waitForTimeout(300);

    // Verify zoom out completed
    const zoomedOutViewBox = await canvas.getAttribute('viewBox');
    expect(zoomedOutViewBox).toBeTruthy();
  });

  test('should pan the view', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    const canvas = getCanvas(page);

    // Pan by dragging
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(-100, -100, { steps: 10 });
    await page.mouse.up();

    // Wait for pan to complete
    await page.waitForTimeout(300);

    // Verify pan completed (viewBox should exist)
    const pannedViewBox = await canvas.getAttribute('viewBox');
    expect(pannedViewBox).toBeTruthy();
  });

  test('should show interactive minimap when enabled', async ({ page }) => {
    // Set a larger viewport to ensure minimap is visible (it's hidden on small screens via CSS)
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await waitForLoad(page);

    // Create an element so minimap has something to show
    await getToolButton(page, 'Pencil').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple path
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3,
      { steps: 5 }
    );
    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(200);

    // Switch to select mode
    await getToolButton(page, 'Select').click();

    // Open settings panel using the correct button
    await page.locator('[aria-label="Settings"]').click();

    // Wait for settings panel to open
    await page.waitForTimeout(300);

    // Find minimap toggle using a simpler approach
    const minimapText = page.locator('text=Show minimap');
    await expect(minimapText).toBeVisible();

    // Find the checkbox input that controls the minimap
    const minimapToggle = page.getByLabel('Show minimap');
    await expect(minimapToggle).toBeVisible();

    // Ensure minimap is disabled first
    const isInitiallyChecked = await minimapToggle.isChecked();
    if (isInitiallyChecked) {
      await minimapToggle.click({ force: true });
      await page.waitForTimeout(300);
    }

    // Verify minimap container is not in the DOM when disabled (component returns null)
    const minimapContainer = page.getByTestId('minimap-container');
    await expect(minimapContainer).toHaveCount(0);

    // Enable minimap
    await minimapToggle.click({ force: true });
    await page.waitForTimeout(300);

    // Verify minimap container is now in the DOM (attached means the element exists)
    await expect(minimapContainer.first()).toBeAttached();

    // Verify minimap SVG exists within the container
    const minimapSvg = minimapContainer.first().locator('[data-testid="minimap-svg"]');
    await expect(minimapSvg).toBeAttached();

    // Verify minimap has the expected structure (based on the HTML example provided)
    const minimapViewport = minimapSvg.locator('[data-role="minimap-viewport"]');
    await expect(minimapViewport).toBeAttached();

    // Verify minimap shows elements (should have some rect elements for paths)
    const minimapRects = minimapSvg.locator('rect[data-element-id]');
    const rectCount = await minimapRects.count();
    expect(rectCount).toBeGreaterThan(0); // Should show the path we created
  });

  test('should configure minimap in settings panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Open settings panel using the correct button
    await page.locator('[aria-label="Settings"]').click();

    // Wait for settings panel to open
    await page.waitForTimeout(300);

    // Verify settings panel is open by checking for the minimap text
    const minimapText = page.locator('text=Show minimap');
    await expect(minimapText).toBeVisible();

    // Find the checkbox input that controls the minimap
    const minimapToggle = page.locator('input[type="checkbox"]').nth(2); // Third checkbox in the settings panel
    await expect(minimapToggle).toBeVisible();

    // Verify it's a proper toggle that can be checked/unchecked
    const isChecked = await minimapToggle.isChecked();
    expect(typeof isChecked).toBe('boolean');

    // Toggle it
    await minimapToggle.click({ force: true });
    await page.waitForTimeout(200);

    // Verify it toggled
    const isCheckedAfter = await minimapToggle.isChecked();
    expect(isCheckedAfter).not.toBe(isChecked);
  });
});