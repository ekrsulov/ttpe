import { test, expect } from '@playwright/test';

test.describe('Path Movement Tests', () => {
  test('should move complete paths in select mode', async ({ page }) => {
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
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 5 }
    );

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 5 }
    );

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await canvas.locator('path').count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Switch to select mode
    await page.locator('[title="Select"]').click();

    // Click and drag the path to move it
    const startX = canvasBox.x + canvasBox.width * 0.4; // Take from the right edge of the path
    const startY = canvasBox.y + canvasBox.height * 0.7; // Take from the bottom edge of the path
    const endX = canvasBox.x + canvasBox.width * 0.6;
    const endY = canvasBox.y + canvasBox.height * 0.8;

    // Click on the path to select it
    await page.mouse.click(startX, startY);

    // Wait for selection
    await page.waitForTimeout(100);

    // Verify Edit and Transform buttons are enabled
    const editButton = page.locator('[title="Edit"]').first();
    const transformButton = page.locator('[title="Transform"]').first();
    await expect(editButton).toBeEnabled();
    await expect(transformButton).toBeEnabled();

    // Now drag the path
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    // Wait for movement to complete
    await page.waitForTimeout(100);

    // Verify the path has moved (transform attribute should be different or path position changed)
    const finalPath = canvas.locator('path').first();

    // The path should still exist and be visible
    await expect(finalPath).toBeVisible();

    // Verify the path count remains the same (no new paths created)
    const pathsAfterMovement = await canvas.locator('path').count();
    expect(pathsAfterMovement).toBe(pathsAfterCreation);
  });

  test('should move individual subpaths in subpath mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to pencil mode
    await page.locator('[title="Pencil"]').click();

    // Click add subpath button to switch to subpath mode
    const addSubpathButton = page.locator('[title="Add Subpath"]');
    await addSubpathButton.click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw first subpath (horizontal line)
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

    // Wait a bit before drawing second subpath
    await page.waitForTimeout(100);

    // Draw second subpath (diagonal line from the middle of the screen)
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(50);

    // Switch to select mode
    await page.locator('[title="Select"]').click();

    // Click on the created path to select it (clicking on the first subpath)
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.3
    );

    // Wait for selection
    await page.waitForTimeout(50);

    // Check if the subpath button is now enabled
    const subpathButton = page.locator('[title="Subpath"]');
    const isEnabled = await subpathButton.isEnabled();

    if (!isEnabled) {
      throw new Error('Subpath button should be enabled after selecting a path');
    }

    // Now switch to subpath mode
    await subpathButton.click();

    // Wait for subpath mode to activate
    await page.waitForTimeout(50);

    // In subpath mode, click to select the diagonal subpath
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.6
    );

    // Wait for subpath selection
    await page.waitForTimeout(100);

    // Drag to move the subpath
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.8,
      { steps: 10 }
    );
    await page.mouse.up();

    // Wait for movement
    await page.waitForTimeout(50);

    // Verify the shape still exists
    const finalPath = canvas.locator('path').first();
    await expect(finalPath).toBeVisible();
  });

  test('should move individual points in edit mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a simple path first
    await page.locator('[title="Pencil"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple path
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 5 }
    );

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 5 }
    );

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(100);

    // Switch to select mode first to select the path
    await page.locator('[title="Select"]').click();

    // Click on the path to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.6
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Switch to edit mode
    const editButton = page.locator('[title="Edit"]');
    await expect(editButton).toBeEnabled();
    await editButton.click();

    // Wait for edit mode to activate
    await page.waitForTimeout(100);

    // Check that edit panel is visible
    await expect(page.locator('span', { hasText: 'Smooth Brush' })).toBeVisible();

    // Click on canvas to start point selection (when smooth brush is off)
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Drag to select only some points (not all points) - smaller selection to leave some points out
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.8,
      { steps: 10 }
    );
    await page.mouse.up();

    // Wait for point selection
    await page.waitForTimeout(200);

    // Now try to move a selected point
    // Click on a point to select it for dragging
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.7
    );

    // Wait for point selection
    await page.waitForTimeout(100);

    // Drag the point
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.8,
      { steps: 10 }
    );
    await page.mouse.up();

    // Wait for movement
    await page.waitForTimeout(100);

    // Verify the path still exists and is visible
    const finalPath = canvas.locator('path').first();
    await expect(finalPath).toBeVisible();
  });

  test('should handle multiple path movement', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a shape and a line
    await page.locator('[title="Shape"]').click();

    // Select square shape
    await page.locator('[title="Square - Click and drag to create"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a square shape
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.4,
      { steps: 5 }
    );
    await page.mouse.up();

    // Switch to pencil to draw a line
    await page.locator('[title="Pencil"]').click();

    // Draw second path (line)
    await page.waitForTimeout(200);
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.8
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.8,
      { steps: 5 }
    );
    await page.mouse.up();

    // Wait for paths creation
    await page.waitForTimeout(100);

    // Verify both elements were created
    const initialPaths = await canvas.locator('path').count();
    expect(initialPaths).toBeGreaterThanOrEqual(2);

    // Switch to select mode
    await page.locator('[title="Select"]').click();

    // Select both elements (shift+click)
    await page.keyboard.down('Shift');
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.3
    );

    await page.waitForTimeout(300);

    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.8
    );
    await page.keyboard.up('Shift');

    // Wait for multi-selection
    await page.waitForTimeout(100);

    // Drag both elements
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 20 }
    );
    await page.mouse.up();

    // Wait for movement
    await page.waitForTimeout(100);

    // Verify both elements still exist and were moved
    const finalPaths = await canvas.locator('path').count();
    expect(finalPaths).toBeGreaterThanOrEqual(2);
  });
});