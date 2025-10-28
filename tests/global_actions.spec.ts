import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths, waitForLoad, getToolButton } from './helpers';

test.describe('Global Actions Tests', () => {
  test('should split subpaths into independent paths', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create path with subpaths
    await getToolButton(page, 'Pencil').click();
    
    // Enable "Add Subpath" mode
    await page.locator('[aria-label="Add Subpath"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.up();
    await page.waitForTimeout(100);
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.up();

    // Switch to select mode to see path operations
    await getToolButton(page, 'Select').click();
    
    // Select the path with subpaths
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );

    // Wait for Path Operations panel to appear
    await page.waitForTimeout(100);

    // Verify Split subpaths button is available
    const splitButton = page.locator('[aria-label="Split subpaths"]');
    await expect(splitButton).toBeVisible();

    // Trigger split action
    await splitButton.click();

    // Verify independent paths created
    const paths = await getCanvasPaths(page).count();
    expect(paths).toBeGreaterThan(1);
  });

  test('should reverse direction of selected subpaths', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create path with subpaths
    await getToolButton(page, 'Pencil').click();
    
    // Enable "Add Subpath" mode
    await page.locator('[aria-label="Add Subpath"]').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw first subpath (horizontal line)
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.up();
    await page.waitForTimeout(100);
    
    // Draw second subpath (vertical line)
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.up();

    // Switch to select mode
    await getToolButton(page, 'Select').click();
    
    // Select the path
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );

    // Verify Subpath button is enabled (since path has multiple subpaths)
    const subpathButton = page.locator('[title="Subpath"]');
    await expect(subpathButton).not.toBeDisabled();

    // Enter subpath mode
    await subpathButton.click();

    // Wait for subpath mode to activate
    await page.waitForTimeout(100);

    // Select the first subpath (horizontal line)
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.2
    );

    // Wait for SubPath Operations panel to appear
    await page.waitForTimeout(100);

    // Verify Reverse button is available
    const reverseButton = page.locator('[aria-label="Reverse subpath direction"]');
    await expect(reverseButton).toBeVisible();

    // Get initial path data to verify direction change
    const initialPaths = await getCanvasPaths(page);
    const initialPathData = await initialPaths.first().getAttribute('d');

    // Reverse the subpath direction
    await reverseButton.click();

    // Verify direction was reversed by checking that path data changed
    const finalPaths = await getCanvasPaths(page);
    const finalPathData = await finalPaths.first().getAttribute('d');
    
    // The path data should be different after reversing
    expect(finalPathData).not.toBe(initialPathData);
  });
});