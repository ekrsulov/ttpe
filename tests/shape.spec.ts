import { test, expect } from '@playwright/test';
import { getCanvas, waitForLoad, getToolButton } from './helpers';

test.describe('Shape Creation', () => {
  test('should create different shapes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to shape mode
    await getToolButton(page, 'Shape').click();

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await canvas.locator('path').count();

    // Test creating a square
    await page.locator('[aria-label="Square"]').click();

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
    await getToolButton(page, 'Select').click();

    // Click on the created square to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Verify Edit and Transform buttons are enabled
    const editButton = getToolButton(page, 'Edit');
    const transformButton = getToolButton(page, 'Transform');
    await expect(editButton).toBeEnabled();
    await expect(transformButton).toBeEnabled();

    // Switch back to shape mode to create circle
    await getToolButton(page, 'Shape').click();

    // Test creating a circle
    await page.locator('[aria-label="Circle"]').click();

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