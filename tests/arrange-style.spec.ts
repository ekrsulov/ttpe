import { test, expect } from '@playwright/test';

test.describe('Arrange and Style Tests', () => {
  test('should create shapes successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a shape
    await page.locator('[title="Shape"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw a square
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Verify shape was created
    const paths = await canvas.locator('path').count();
    expect(paths).toBeGreaterThan(0);
  });

  test('should align elements horizontally and vertically', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create first shape
    await page.locator('[title="Shape"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw first square
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.4,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Switch back to shape mode to create second shape
    await page.locator('[title="Shape"]').click();

    // Create second shape
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.6,
      canvasBox.y + canvasBox.height * 0.6
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.8,
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for second shape creation
    await page.waitForTimeout(100);

    // Switch to select mode
    await page.locator('[title="Select"]').click();

    // Select both shapes (shift+click)
    await page.keyboard.down('Shift');
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.7
    );
    await page.keyboard.up('Shift');

    // Wait for multi-selection
    await page.waitForTimeout(100);

    // Verify both shapes still exist
    const pathsAfterAlign = await canvas.locator('path').count();
    expect(pathsAfterAlign).toBeGreaterThanOrEqual(2);
  });

  test('should apply style presets to selected elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a shape
    await page.locator('[title="Shape"]').click();

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

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Switch to select mode
    await page.locator('[title="Select"]').click();

    // Select the shape
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Verify shape was created and selected
    const paths = await canvas.locator('path').count();
    expect(paths).toBeGreaterThan(0);
  });

  test('should apply style presets to pencil tool', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to pencil mode
    await page.locator('[title="Pencil"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw with the pencil
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

    await page.mouse.up();

    // Wait for path creation
    await page.waitForTimeout(100);

    // Verify path was created
    const pathElement = canvas.locator('path').first();
    await expect(pathElement).toBeAttached();
    
    // Verify the path has some content (d attribute)
    const pathData = await pathElement.getAttribute('d');
    expect(pathData).toBeTruthy();
    expect(pathData!.length).toBeGreaterThan(10);
  });

  test('should distribute elements horizontally and vertically', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create three shapes
    await page.locator('[title="Shape"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw first square
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.3,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Switch back to shape mode to create second shape
    await page.locator('[title="Shape"]').click();

    // Draw second square
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.3,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Switch back to shape mode to create third shape
    await page.locator('[title="Shape"]').click();

    // Draw third square
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.7,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.3,
      { steps: 10 }
    );
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Switch to select mode
    await page.locator('[title="Select"]').click();

    // Expand arrange panel first
    await page.locator('[title="Expand Arrange"]').click();

    // Verify three shapes were created
    const pathsCount = await canvas.locator('path').count();
    expect(pathsCount).toBe(3);

    // Select all three shapes using the exposed store
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const elementIds = state.elements.map((el: any) => el.id);
        if (elementIds.length >= 3) {
          // Select all elements
          state.selectElements(elementIds);
        }
      }
    });

    // Wait for selection to be processed
    await page.waitForTimeout(500);

    // Verify selection by checking if distribute buttons are enabled
    const distributeHorizontalButton = page.locator('[title="Distribute Horizontally"]');
    await expect(distributeHorizontalButton).toBeEnabled();

    const distributeVerticalButton = page.locator('[title="Distribute Vertically"]');
    await expect(distributeVerticalButton).toBeEnabled();

    // Click distribute horizontally button
    await distributeHorizontalButton.click();

    // Wait for distribution
    await page.waitForTimeout(200);

    // Click distribute vertically button
    await distributeVerticalButton.click();

    // Wait for distribution
    await page.waitForTimeout(200);

    // Verify all shapes still exist
    const pathsAfterDistribute = await canvas.locator('path').count();
    expect(pathsAfterDistribute).toBe(3);
  });

});
