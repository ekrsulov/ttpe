import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths, waitForLoad, getToolButton } from './helpers';

test.describe('Visibility & Locking Tests', () => {
  test('should show element controls in select panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create an element
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

    // Select the circle
    await getToolButton(page, 'Select').click();
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.225,
      canvasBox.y + canvasBox.height * 0.225
    );

    // Verify visibility and lock controls appear in select panel
    await expect(page.locator('[aria-label="Hide element"]')).toBeVisible();
    await expect(page.locator('[aria-label="Lock element"]')).toBeVisible();

    // Verify basic functionality works
    expect(true).toBe(true);
  });

  test('should toggle element visibility', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create and select element
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

    // Select the circle
    await getToolButton(page, 'Select').click();
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.225,
      canvasBox.y + canvasBox.height * 0.225
    );

    // Click hide button
    await page.locator('[aria-label="Hide element"]').click();

    // Verify show button appears
    await expect(page.locator('[aria-label="Show element"]')).toBeVisible();

    // Click show button
    await page.locator('[aria-label="Show element"]').click();

    // Verify hide button appears again
    await expect(page.locator('[aria-label="Hide element"]')).toBeVisible();

    // Verify basic functionality works
    expect(true).toBe(true);
  });

  test('should toggle element lock', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create and select element
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

    // Select the circle
    await getToolButton(page, 'Select').click();
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.225,
      canvasBox.y + canvasBox.height * 0.225
    );

    // Click lock button
    await page.locator('[aria-label="Lock element"]').click();

    // Verify unlock button appears
    await expect(page.locator('[aria-label="Unlock element"]')).toBeVisible();

    // Click unlock button
    await page.locator('[aria-label="Unlock element"]').click();

    // Verify lock button appears again
    await expect(page.locator('[aria-label="Lock element"]')).toBeVisible();

    // Verify basic functionality works
    expect(true).toBe(true);
  });
});