import { test, expect } from '@playwright/test';
import { getCanvas, waitForLoad, getToolButton } from './helpers';

test.describe('Selection and Transformation', () => {
  test('should select and transform elements', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // First create a shape to select
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await canvas.locator('path').count();

    // Draw a square
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
    const pathsAfterCreation = await canvas.locator('path').count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Click on the created square to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Check that transformation panel appears
    await getToolButton(page, 'Transform').click();
    await expect(page.getByRole('heading', { name: 'Transform' })).toBeVisible();

    // Test toggling coordinates
    const coordinatesCheckbox = page.getByRole('checkbox', { name: 'Coordinates' });
    await coordinatesCheckbox.check();
    await expect(coordinatesCheckbox).toBeChecked();

    // Test toggling rulers
    const rulersCheckbox = page.getByRole('checkbox', { name: 'Rulers' });
    await rulersCheckbox.check();
    await expect(rulersCheckbox).toBeChecked();
  });

  test('should duplicate selected elements', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Circle"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await canvas.locator('path').count();

    // Draw a circle
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
    const pathsAfterCreation = await canvas.locator('path').count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Click on the created circle to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Check that select panel is visible (the Select button should be active/highlighted)
    await getToolButton(page, 'Select').click();
    
    // Wait for panel to appear
    await page.waitForTimeout(100);

    // Check that duplicate button is available and enabled
    const duplicateButton = page.locator('[aria-label="Duplicate"]');
    await expect(duplicateButton).toBeVisible();
    await expect(duplicateButton).toBeEnabled();

    // Click duplicate
    await duplicateButton.click();

    // Wait for duplication
    await page.waitForTimeout(100);

    // Verify another element was created
    const pathsAfterDuplication = await canvas.locator('path').count();
    expect(pathsAfterDuplication).toBeGreaterThan(pathsAfterCreation);
  });
});