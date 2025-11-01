import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths, waitForLoad, getToolButton } from './helpers';

test.describe('TTPE Application', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await waitForLoad(page);

    // Check that the SVG canvas is present
    await expect(getCanvas(page)).toBeVisible();

    // Check that the TopActionBar is visible (looking for the container)
    await expect(page.locator('div').filter({ has: getToolButton(page, 'Select') }).first()).toBeVisible();

    // Check that plugin buttons are present in TopActionBar
    const pluginButtons = ['Select', 'Subpath', 'Transform', 'Edit', 'Pencil', 'Text', 'Shape'];
    for (const button of pluginButtons) {
      await expect(getToolButton(page, button)).toBeVisible();
    }
  });

  test('should switch between different modes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Test switching to pencil mode
    await getToolButton(page, 'Pencil').click();
    await expect(page.getByRole('heading', { name: 'Pencil' })).toBeVisible();

    // Test switching to shape mode
    await getToolButton(page, 'Shape').click();
    await expect(page.getByRole('heading', { name: 'Shape' })).toBeVisible();

    // Test switching to text mode
    await getToolButton(page, 'Text').click();
    await expect(page.getByRole('heading', { name: 'Text' })).toBeVisible();
  });

  test('should switch modes with double click', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path to test double click
    await getToolButton(page, 'Pencil').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple path
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify the path was created
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBeGreaterThan(0);

    // Switch to select mode
    await getToolButton(page, 'Select').click();

    // Double click on the created path (this should select it and switch modes)
    await page.mouse.dblclick(
      canvasBox.x + canvasBox.width * 0.15,
      canvasBox.y + canvasBox.height * 0.35
    );

    // Wait for mode switch
    await page.waitForTimeout(100);

    // Check that transformation panel is visible (indicating transformation mode is active)
    const transformationPanel = page.locator('h3', { hasText: 'Transform' });
    await expect(transformationPanel).toBeVisible();
  });

  test('should return to select mode with Escape key', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to pencil mode
    await getToolButton(page, 'Pencil').click();

    // Wait for mode switch
    await page.waitForTimeout(100);

    // Press Escape to return to select mode
    await page.keyboard.press('Escape');

    // Wait for mode switch
    await page.waitForTimeout(100);

    // Check that select mode is active (Select button should be active)
    const selectButton = getToolButton(page, 'Select');
    // Check that the button has the active color (Chakra UI white text for active buttons in light mode)
    await expect(selectButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('should clear selections with Escape key before changing modes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a shape
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Square"]').click();

    const canvas = getCanvas(page);
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
    await getToolButton(page, 'Transform').click();
    await page.waitForTimeout(100);

    // Verify the transformation panel is visible (will show "Select an element to transform" when nothing is selected yet)
    // After clicking, there should be no error and panel should be visible
    await expect(page.getByRole('heading', { name: 'Transform' })).toBeVisible();

    // Press Escape - should clear selection and change to select mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Check that select mode is active
    const selectButton = getToolButton(page, 'Select');
    await expect(selectButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  });
});