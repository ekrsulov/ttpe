import { test, expect } from '@playwright/test';

test.describe('TTPE Application', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check that the SVG canvas and sidebar are present
    await expect(page.locator('svg[viewBox*="0 0"]').first()).toBeVisible();
    await expect(page.locator('[style*="position: absolute"][style*="right: 0"]').first()).toBeVisible();

    // Check that plugin buttons are present
    const pluginButtons = ['Select', 'Subpath', 'Transform', 'Edit', 'Pan', 'Pencil', 'Text', 'Shape'];
    for (const button of pluginButtons) {
      await expect(page.locator(`[title="${button}"]`)).toBeVisible();
    }
  });

  test('should switch between different modes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test switching to pencil mode
    await page.locator('[title="Pencil"]').click();
    await expect(page.locator('text=Pencil')).toBeVisible();

    // Test switching to shape mode
    await page.locator('[title="Shape"]').click();
    await expect(page.locator('text=Shape')).toBeVisible();

    // Test switching to text mode
    await page.locator('[title="Text"]').click();
    await expect(page.locator('text=Text')).toBeVisible();
  });

  test('should switch modes with double click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a shape to test double click
    await page.locator('[title="Shape"]').click();
    await page.locator('[title="Square - Click and drag to create"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

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

    // Verify the path was created
    const pathsAfterCreation = await canvas.locator('path').count();
    expect(pathsAfterCreation).toBeGreaterThan(0);

    // Double click on the created square (this should select it and switch modes)
    await page.mouse.dblclick(
      canvasBox.x + canvasBox.width * 0.31,
      canvasBox.y + canvasBox.height * 0.31
    );

    // Wait for mode switch
    await page.waitForTimeout(100);

    // Check that transformation panel is visible (indicating transformation mode is active)
    const transformationPanel = page.locator('div').filter({ hasText: 'Select an element to transform' }).first();
    await expect(transformationPanel).toBeVisible();
  });

  test('should return to select mode with Escape key', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to pencil mode
    await page.locator('[title="Pencil"]').click();

    // Wait for mode switch
    await page.waitForTimeout(100);

    // Press Escape to return to select mode
    await page.keyboard.press('Escape');

    // Wait for mode switch
    await page.waitForTimeout(100);

    // Check that select mode is active (Select button should be active)
    const selectButton = page.locator('[title="Select"]');
    // Since IconButton doesn't have a class, check that it has the active background color
    await expect(selectButton).toHaveCSS('background-color', 'rgb(0, 123, 255)');
  });

  test('should clear selections with Escape key before changing modes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a shape
    await page.locator('[title="Shape"]').click();
    await page.locator('[title="Square - Click and drag to create"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

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
    await page.waitForTimeout(200);

    // Click on the created square to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Switch to transform mode
    await page.locator('[title="Transform"]').click();
    await page.waitForTimeout(100);

    // Verify element is selected in transform mode
    await expect(page.locator('text=1 element selected')).toBeVisible();

    // Press Escape - should clear selection and change to select mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Check that select mode is active
    const selectButton = page.locator('[title="Select"]');
    await expect(selectButton).toHaveCSS('background-color', 'rgb(0, 123, 255)');
  });
});