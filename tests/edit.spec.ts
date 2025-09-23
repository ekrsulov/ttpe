import { test, expect } from '@playwright/test';

test.describe('Edit Functionality', () => {
  test('should toggle smooth brush mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a path first
    await page.locator('[title="Pencil"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await canvas.locator('path').count();

    // Draw a path
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

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await canvas.locator('path').count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await page.locator('[title="Select"]').click();

    // Try clicking on canvas at the path location
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Now switch to edit mode (should be enabled since we have a selected element)
    const editButton = page.locator('[title="Edit"]');
    await expect(editButton).toBeEnabled();
    await editButton.click();

    // Check that edit panel is visible
    await expect(page.locator('span', { hasText: 'Smooth Brush' })).toBeVisible();

    // Test toggling brush mode
    const brushModeButton = page.locator('button', { hasText: 'OFF' });
    await expect(brushModeButton).toBeVisible();

    await brushModeButton.click();
    await expect(page.locator('button', { hasText: 'ON' })).toBeVisible();

    // Test that radius slider appears when brush is active
    await expect(page.locator('text=Radius:')).toBeVisible();
  });

  test('should adjust smooth brush settings', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a path and switch to edit mode
    await page.locator('[title="Pencil"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await canvas.locator('path').count();

    // Draw a path
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.6,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await canvas.locator('path').count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await page.locator('[title="Select"]').click();

    // Try clicking on canvas at the path location
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Switch to edit mode
    const editButton = page.locator('[title="Edit"]');
    await expect(editButton).toBeEnabled();
    await editButton.click();

    // Activate brush mode
    await page.locator('button', { hasText: 'OFF' }).click();

    // Test strength slider
    const strengthSlider = page.locator('input[type="range"]').first();
    await strengthSlider.evaluate((el: HTMLInputElement) => el.value = '0.5');

    // Test simplify points checkbox
    const simplifyCheckbox = page.locator('#simplifyPoints');
    await simplifyCheckbox.check();
    await expect(simplifyCheckbox).toBeChecked();

    // Test that tolerance slider appears
    await expect(page.locator('text=Tolerance:')).toBeVisible();

    // Test tolerance slider
    const toleranceSlider = page.locator('input[type="range"]').nth(1);
    await toleranceSlider.evaluate((el: HTMLInputElement) => el.value = '2.5');

    // Test min distance slider
    const minDistSlider = page.locator('input[type="range"]').nth(2);
    await minDistSlider.evaluate((el: HTMLInputElement) => el.value = '1.5');
  });

  test('should apply smooth brush', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a path and switch to edit mode
    await page.locator('[title="Pencil"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await canvas.locator('path').count();

    // Draw a path
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await canvas.locator('path').count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await page.locator('[title="Select"]').click();

    // Try clicking on canvas at the path location
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Switch to edit mode
    const editButton = page.locator('[title="Edit"]');
    await expect(editButton).toBeEnabled();
    await editButton.click();

    // Test apply button is visible when brush is off
    const applyButton = page.locator('button', { hasText: 'Apply Smooth Brush' });
    await expect(applyButton).toBeVisible();

    // Click apply (though it may not do much without selected points)
    await applyButton.click();
  });
});