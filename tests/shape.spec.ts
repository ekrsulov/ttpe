import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths, waitForLoad, getToolButton } from './helpers';

test.describe('Shape Creation', () => {
  test('should create different shapes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to shape mode
    await getToolButton(page, 'Shape').click();

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Test creating a square
    await page.locator('[aria-label="Square"]').click();

    // Draw a square by clicking and dragging
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
    const pathsAfterSquare = await getCanvasPaths(page).count();
    expect(pathsAfterSquare).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await getToolButton(page, 'Select').click();

    // Click on the created square to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Verify Edit and Transform buttons are enabled
    const editButton = getToolButton(page, 'Edit');
    const transformButton = getToolButton(page, 'Transform');
    await expect(editButton).toBeEnabled();
    await expect(transformButton).toBeEnabled();

    // Switch back to shape mode to create circle
    await getToolButton(page, 'Shape').click();

    // Test creating a circle
    await page.locator('[aria-label="Circle"]').click();

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
    const pathsAfterCircle = await getCanvasPaths(page).count();
    expect(pathsAfterCircle).toBeGreaterThan(pathsAfterSquare);

    // Click on the created circle to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Verify Edit and Transform buttons are still enabled
    await expect(editButton).toBeEnabled();
    await expect(transformButton).toBeEnabled();

    // Verify SVG canvas is still visible and interactive
    await expect(canvas).toBeVisible();
  });

  test('should create shape when starting over existing element', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // First, create a square
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Square"]').click();

    const firstSquareX = canvasBox.x + canvasBox.width * 0.3;
    const firstSquareY = canvasBox.y + canvasBox.height * 0.3;

    await page.mouse.move(firstSquareX, firstSquareY);
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    const pathsAfterFirstShape = await getCanvasPaths(page).count();

    // Now create a second shape, starting the drag over the first shape
    await getToolButton(page, 'Shape').click();
    await page.locator('[aria-label="Circle"]').click();

    // Start dragging from the center of the first square (over existing element)
    const secondShapeStartX = canvasBox.x + canvasBox.width * 0.4;
    const secondShapeStartY = canvasBox.y + canvasBox.height * 0.4;
    
    await page.mouse.move(secondShapeStartX, secondShapeStartY);
    await page.mouse.down();

    // Drag to a new location
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.7,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Verify that the second shape was created successfully
    const pathsAfterSecondShape = await getCanvasPaths(page).count();
    expect(pathsAfterSecondShape).toBeGreaterThan(pathsAfterFirstShape);

    // Switch to select mode and verify the new shape can be selected
    await getToolButton(page, 'Select').click();
    
    // Click on the second shape to select it
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.55,
      canvasBox.y + canvasBox.height * 0.55
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Verify Edit and Transform buttons are enabled (shape is selected)
    const editButton = getToolButton(page, 'Edit');
    const transformButton = getToolButton(page, 'Transform');
    await expect(editButton).toBeEnabled();
    await expect(transformButton).toBeEnabled();
  });
});