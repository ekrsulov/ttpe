import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths, waitForLoad, getToolButton } from './helpers';

test.describe('Style Eyedropper Tests', () => {
  test('should change stroke color using color controls', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw circle
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );
    await page.mouse.up();

    // Select circle
    await getToolButton(page, 'Select').click();
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.225,
      canvasBox.y + canvasBox.height * 0.225
    );

    // Enter edit mode
    await getToolButton(page, 'Edit').click();

    // Expand color controls if collapsed
    const colorControlsToggle = page.locator('[aria-label="Expand Color Controls"]');
    if (await colorControlsToggle.isVisible()) {
      await colorControlsToggle.click();
    }

    // Change stroke color to red using the color input
    const strokeColorInputs = page.locator('input[type="color"]').nth(1); // Second color input is stroke
    await strokeColorInputs.fill('#ff0000');

    // Verify the path has red stroke
    const paths = await getCanvasPaths(page);
    const path = paths.first();
    const stroke = await path.getAttribute('stroke');
    expect(stroke).toBe('#ff0000');
  });

  test('should copy and apply stroke style', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create first shape and change its stroke color
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw first circle
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );
    await page.mouse.up();

    // Select first circle
    await getToolButton(page, 'Select').click();
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.225,
      canvasBox.y + canvasBox.height * 0.225
    );

    // Enter edit mode and change stroke color to red
    await getToolButton(page, 'Edit').click();

    // Expand color controls if collapsed
    const colorControlsToggle = page.locator('[aria-label="Expand Color Controls"]');
    if (await colorControlsToggle.isVisible()) {
      await colorControlsToggle.click();
    }

    // Change stroke color of first circle to red
    const strokeColorInputs = page.locator('input[type="color"]').nth(1);
    await strokeColorInputs.fill('#ff0000');

    // Verify first circle has red stroke
    let paths = await getCanvasPaths(page);
    let firstPath = paths.first();
    let stroke = await firstPath.getAttribute('stroke');
    expect(stroke).toBe('#ff0000');

    // Create second circle
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Circle"]').click();

    // Draw second circle
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.45,
      canvasBox.y + canvasBox.height * 0.25
    );
    await page.mouse.up();

    // Select first circle again to copy its style
    await getToolButton(page, 'Select').click();
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.225,
      canvasBox.y + canvasBox.height * 0.225
    );

    // Click Copy Style button
    await page.locator('[aria-label="Copy Style"]').click();

    // Click on second circle to apply the style
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.425,
      canvasBox.y + canvasBox.height * 0.225
    );

    // Verify second circle has red stroke
    paths = await getCanvasPaths(page);
    const secondPath = paths.nth(1);
    stroke = await secondPath.getAttribute('stroke');
    expect(stroke).toBe('#ff0000');
  });
});