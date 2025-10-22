import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths, waitForLoad, getToolButton } from './helpers';

test.describe('Pencil Drawing', () => {
  test('should draw with pencil tool', async ({ page }) => {
    await page.goto('/');

    // Switch to pencil mode
    await getToolButton(page, 'Pencil').click();

    // Get SVG canvas element
    const canvas = getCanvas(page);

    // Count initial paths
    const initialPaths = await getCanvasPaths(page).count();

    // Draw a simple line by simulating mouse events
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Start drawing from center-left to center-right with continuous drawing
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.mouse.down();

    // Draw a zigzag pattern
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.4,
      { steps: 5 }
    );
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.6,
      { steps: 5 }
    );
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4,
      { steps: 5 }
    );
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.6,
      { steps: 5 }
    );
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 5 }
    );
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 5 }
    );

    await page.mouse.up();

    // Verify that something was drawn (should have more paths now)
    const pathsAfterDrawing = await getCanvasPaths(page).count();
    expect(pathsAfterDrawing).toBeGreaterThan(initialPaths);

    // Switch to select mode to verify the drawing is selectable
    await getToolButton(page, 'Select').click();

    // Try to select the drawn path
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5
    );

    // Verify that edit and transform buttons are enabled (indicating selection worked)
    const editButton = getToolButton(page, 'Edit').first();
    const transformButton = getToolButton(page, 'Transform').first();
    await expect(editButton).toBeEnabled();
    await expect(transformButton).toBeEnabled();
  });

  test('should toggle between new path and add subpath modes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to pencil mode
    await getToolButton(page, 'Pencil').click();

    // Check that pencil panel is visible
    await expect(page.locator('text=Pencil')).toBeVisible();

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial paths
    const initialPaths = await getCanvasPaths(page).count();

    // The buttons should exist
    const newPathButton = page.locator('[aria-label="New Path"]');
    const addSubpathButton = page.locator('[aria-label="Add Subpath"]');

    await expect(newPathButton).toBeVisible();
    await expect(addSubpathButton).toBeVisible();

    // Click add subpath button to switch to subpath mode
    await addSubpathButton.click();

    // Buttons should still be visible
    await expect(newPathButton).toBeVisible();
    await expect(addSubpathButton).toBeVisible();

    // Draw first stroke (horizontal line)
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.3,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait a bit before drawing second stroke
    await page.waitForTimeout(200);

    // Draw second stroke (vertical line, separated from first)
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.4
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 10 }
    );

    await page.mouse.up();

    // Verify that only one path element was created (both strokes are subpaths of the same path)
    const pathsAfterDrawing = await getCanvasPaths(page).count();
    expect(pathsAfterDrawing).toBe(initialPaths + 1);

    // Switch to select mode
    await getToolButton(page, 'Select').click();

    // Try to select the path
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.35,
      canvasBox.y + canvasBox.height * 0.45
    );

    // Verify that edit and transform buttons are enabled
    const editButton = getToolButton(page, 'Edit').first();
    const transformButton = getToolButton(page, 'Transform').first();
    await expect(editButton).toBeEnabled();
    await expect(transformButton).toBeEnabled();

    // Switch to edit mode to see subpaths
    await editButton.click();

    // The path should be editable and show both subpaths
    await page.waitForTimeout(200);
  });
});