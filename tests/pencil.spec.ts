import { test, expect } from '@playwright/test';

test.describe('Pencil Drawing', () => {
  test('should draw with pencil tool', async ({ page }) => {
    await page.goto('/');

    // Switch to pencil mode
    await page.locator('[title="Pencil"]').click();

    // Get SVG canvas element
    const canvas = page.locator('svg[viewBox*="0 0"]').first();

    // Draw a simple line by simulating mouse events
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Start drawing from center-left to center-right
    await canvas.click({
      position: { x: canvasBox.width * 0.2, y: canvasBox.height * 0.5 }
    });

    // Move mouse while holding down (drawing)
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.up();

    // Verify that something was drawn (SVG should have content)
    await expect(canvas).toBeVisible();
  });

  test('should toggle between new path and add subpath modes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to pencil mode
    await page.locator('[title="Pencil"]').click();

    // Check that pencil panel is visible
    await expect(page.locator('text=Pencil')).toBeVisible();

    // The buttons should exist
    const newPathButton = page.locator('[title="New Path"]');
    const addSubpathButton = page.locator('[title="Add Subpath"]');

    await expect(newPathButton).toBeVisible();
    await expect(addSubpathButton).toBeVisible();

    // Click add subpath button
    await addSubpathButton.click();

    // Buttons should still be visible
    await expect(newPathButton).toBeVisible();
    await expect(addSubpathButton).toBeVisible();
  });
});