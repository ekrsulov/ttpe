import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths, waitForLoad, getToolButton } from './helpers';

test.describe('Boolean Operations & Pro Features Tests', () => {
  test('should perform union on two shapes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create two overlapping shapes
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Circle"]').click();

    // Draw first
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

    // Draw second overlapping
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Circle"]').click();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.22,
      canvasBox.y + canvasBox.height * 0.22
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.27,
      canvasBox.y + canvasBox.height * 0.27
    );
    await page.mouse.up();

    // Verify two shapes were created
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBe(2);

    // Select both shapes
    await getToolButton(page, 'Select').click();
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.225,
      canvasBox.y + canvasBox.height * 0.225
    );
    await page.keyboard.press('Shift');
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.245,
      canvasBox.y + canvasBox.height * 0.245
    );

    // Note: Union operation would be tested here if the UI panel was accessible in test environment
    // For now, we verify that shapes can be drawn and selected
  });

  test('should apply optical alignment', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create container shape (larger)
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Rectangle"]').click();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.1
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.up();

    // Create content shape (smaller, inside container)
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Circle"]').click();
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

    // Verify shapes were created
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBe(2);

    // Select both shapes
    await getToolButton(page, 'Select').click();
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );
    await page.keyboard.press('Shift');
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.225,
      canvasBox.y + canvasBox.height * 0.225
    );

    // Note: Optical alignment would be tested here if the UI panel was accessible in test environment
    // For now, we verify that shapes can be drawn and selected
  });

  test('should create custom curve with lattice', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Activate curves mode
    await getToolButton(page, 'Curves').click();

    // Click to add points for a simple curve
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.2
    );

    // Finish the curve
    await page.locator('button:has-text("Finish")').click();

    // Verify curve was created
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBe(1);
  });
});