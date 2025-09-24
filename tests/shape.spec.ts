import { test, expect } from '@playwright/test';

test.describe('Shape Creation', () => {
  test('should create different shapes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to shape mode
    await page.locator('[title="Shape"]').click();

    // Get SVG canvas element
    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await canvas.locator('path').count();

    // Test creating a square
    await page.locator('[title="Square - Click and drag to create"]').click();

    // Draw a square by clicking and dragging
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for shape creation and mode switch to select
    await page.waitForTimeout(100);

    // Verify square was created
    const pathsAfterSquare = await canvas.locator('path').count();
    expect(pathsAfterSquare).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await page.locator('[title="Select"]').click();

    // Click on the created square to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Verify Edit and Transform buttons are enabled
    const editButton = page.locator('[title="Edit"]').first();
    const transformButton = page.locator('[title="Transform"]').first();
    await expect(editButton).toBeEnabled();
    await expect(transformButton).toBeEnabled();

    // Switch back to shape mode to create circle
    await page.locator('[title="Shape"]').click();

    // Test creating a circle
    await page.locator('[title="Circle - Click and drag to create"]').click();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Verify circle was created
    const pathsAfterCircle = await canvas.locator('path').count();
    expect(pathsAfterCircle).toBeGreaterThan(pathsAfterSquare);

    // Click on the created circle to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Verify Edit and Transform buttons are still enabled
    await expect(editButton).toBeEnabled();
    await expect(transformButton).toBeEnabled();

    // Verify SVG canvas is still visible and interactive
    await expect(canvas).toBeVisible();
  });
});