import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths, waitForLoad, getToolButton } from './helpers';

// Helper function to draw a zig-zag pattern with multiple jumps and small irregularities
async function drawZigZagPath(page: any, canvasBox: any) {
  // Start drawing
  await page.mouse.move(
    canvasBox.x + canvasBox.width * 0.1,
    canvasBox.y + canvasBox.height * 0.5
  );
  await page.mouse.down();

  // Create zig-zag pattern with multiple jumps and small irregularities (100 steps total)
  const segments = 8; // 8 main segments for zig-zag
  const totalSteps = 100;
  const stepsPerSegment = Math.floor(totalSteps / segments);
  
  for (let i = 0; i < segments; i++) {
    const progress = (i + 1) / segments;
    const baseX = canvasBox.x + canvasBox.width * (0.1 + progress * 0.6);
    const yOffset = (i % 2 === 0) ? -0.15 : 0.15; // Main zig-zag movement
    const baseY = canvasBox.y + canvasBox.height * (0.5 + yOffset);
    
    // Add small irregularities/picos to make the path rough
    const irregularities = 3; // 3 small movements per segment
    const irregularitySteps = Math.floor(stepsPerSegment / irregularities);
    
    for (let j = 0; j < irregularities; j++) {
      const irregularityProgress = j / irregularities;
      const irregularityX = baseX - (canvasBox.width * 0.6 / segments) * (1 - irregularityProgress);
      
      // Add small random-like movements (±0.02 in both directions)
      const smallXOffset = (Math.sin(i * 2 + j * 3) * 0.02); // Pseudo-random small movements
      const smallYOffset = (Math.cos(i * 1.5 + j * 2.5) * 0.02);
      
      const finalX = irregularityX + canvasBox.width * smallXOffset;
      const finalY = baseY + canvasBox.height * smallYOffset;
      
      await page.mouse.move(finalX, finalY, { steps: irregularitySteps });
    }
  }

  await page.mouse.up();
}

test.describe('Edit Functionality', () => {
  test('should toggle smooth brush mode', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path first
    await getToolButton(page, 'Pencil').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Draw a zig-zag path with multiple jumps
    await drawZigZagPath(page, canvasBox);

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await getToolButton(page, 'Select').click();

    // Try clicking on canvas at the path location
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Now switch to edit mode (should be enabled since we have a selected element)
    const editButton = getToolButton(page, 'Edit');
    await expect(editButton).toBeEnabled();
    await editButton.click();

    // Check that edit panel is visible
    await expect(page.getByRole('heading', { name: 'Smooth Brush' })).toBeVisible();

    // Test toggling brush mode - find the brush mode button
    const brushModeButton = page.locator('text=Brush Mode:').locator('xpath=following-sibling::button').first();
    await expect(brushModeButton).toBeVisible();
    await expect(brushModeButton).toHaveText('Off');

    await brushModeButton.click();
    await expect(brushModeButton).toHaveText('On');

    // Test that radius slider appears when brush is active (use first occurrence for Smooth Brush)
    await expect(page.locator('text=Radius:').first()).toBeVisible();
  });

  test('should adjust smooth brush settings', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path and switch to edit mode
    await getToolButton(page, 'Pencil').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Draw a zig-zag path with multiple jumps
    await drawZigZagPath(page, canvasBox);

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await getToolButton(page, 'Select').click();

    // Try clicking on canvas at the path location
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Switch to edit mode
    const editButton = getToolButton(page, 'Edit');
    await expect(editButton).toBeEnabled();
    await editButton.click();

    // Activate brush mode
    const brushModeButton = page.locator('text=Brush Mode:').locator('xpath=following-sibling::button').first();
    await expect(brushModeButton).toHaveText('Off');
    await brushModeButton.click();
    await expect(brushModeButton).toHaveText('On');

    // Test strength slider - check for the label
    const strengthLabel = page.locator('text=Strength:');
    await expect(strengthLabel).toBeVisible();

    // Test simplify points checkbox - click the label instead
    const simplifyLabel = page.locator('text=Simplify Points');
    await simplifyLabel.click();
    const simplifyCheckbox = page.locator('#simplifyPoints');
    await expect(simplifyCheckbox).toBeChecked();

    // Test tolerance slider - should appear after checking simplify
    const toleranceLabel = page.locator('text=Tolerance:').first();
    await expect(toleranceLabel).toBeVisible();

    // Test min distance slider - should appear after checking simplify  
    const minDistLabel = page.locator('text=Min Dist:').first();
    await expect(minDistLabel).toBeVisible();
  });

  test('should apply smooth brush', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path and switch to edit mode
    await getToolButton(page, 'Pencil').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Draw a zig-zag path with multiple jumps
    await drawZigZagPath(page, canvasBox);

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathsAfterCreation = await getCanvasPaths(page).count();
    expect(pathsAfterCreation).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await getToolButton(page, 'Select').click();

    // Try clicking on canvas at the path location
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Switch to edit mode
    const editButton = getToolButton(page, 'Edit');
    await expect(editButton).toBeEnabled();
    await editButton.click();

    // Test apply button is visible when brush is off
    const applyButton = page.locator('button', { hasText: 'Apply' }).first();
    await expect(applyButton).toBeVisible();

    // Click apply (though it may not do much without selected points)
    await applyButton.click();
  });

  test('should show round path functionality', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Create a path using pencil tool
    await getToolButton(page, 'Pencil').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a simple square path
    const startX = canvasBox.x + canvasBox.width * 0.2;
    const startY = canvasBox.y + canvasBox.height * 0.3;
    const endX = canvasBox.x + canvasBox.width * 0.6;
    const endY = canvasBox.y + canvasBox.height * 0.7;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, startY, { steps: 10 });
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.move(startX, endY, { steps: 10 });
    await page.mouse.move(startX, startY, { steps: 10 });
    await page.mouse.up();

    // Switch to select mode and select the path
    await getToolButton(page, 'Select').click();
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5
    );

    // Switch to edit mode to access Round Path
    const editButton = getToolButton(page, 'Edit');
    await expect(editButton).toBeEnabled();
    await editButton.click();

    // Look for the Round Path section header
    const roundPathSection = page.locator('h2', { hasText: 'Round Path' });
    await expect(roundPathSection).toBeVisible();

    // Test apply button for Round Path
    const roundButton = page.locator('button', { hasText: 'Apply' }).nth(1); // Second Apply button
    await expect(roundButton).toBeVisible();
    await roundButton.click({ force: true });

    // Wait for the rounding operation to complete
    await page.waitForTimeout(500);
  });
});