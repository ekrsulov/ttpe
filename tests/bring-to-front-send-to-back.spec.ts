import { test, expect } from '@playwright/test';

test.describe('Bring to Front and Send to Back', () => {
  test('should arrange elements using bring to front and send to back', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create first shape
    await page.locator('[title="Shape"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Draw first square with slower mouse movement
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.2
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.4,
      { steps: 30 } // Slower movement for better visibility
    );

    await page.mouse.up();

    // Wait for shape creation
    await page.waitForTimeout(100);

    // Switch back to shape mode to create second shape
    await page.locator('[title="Shape"]').click();

    // Create second shape (overlapping with first) with slower mouse movement
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.3,
      canvasBox.y + canvasBox.height * 0.3
    );
    await page.mouse.down();

    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.5,
      canvasBox.y + canvasBox.height * 0.5,
      { steps: 30 } // Slower movement for better visibility
    );

    await page.mouse.up();

    // Wait for second shape creation
    await page.waitForTimeout(100);

    // Get element IDs and apply different fill colors
    const elementIds = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => el.id);
      }
      return [];
    });

    // Apply red fill to first element
    await page.evaluate((id) => {
      const store = (window as any).useCanvasStore;
      if (store) {
        store.getState().updateElement(id, {
          data: {
            ...store.getState().elements.find((el: any) => el.id === id)?.data,
            fillColor: '#ff0000',
            fillOpacity: 0.7
          }
        });
      }
    }, elementIds[0]);

    // Apply blue fill to second element
    await page.evaluate((id) => {
      const store = (window as any).useCanvasStore;
      if (store) {
        store.getState().updateElement(id, {
          data: {
            ...store.getState().elements.find((el: any) => el.id === id)?.data,
            fillColor: '#0000ff',
            fillOpacity: 0.7
          }
        });
      }
    }, elementIds[1]);

    // Switch to select mode
    await page.locator('[title="Select"]').click();

    // Select the first shape (bottom one - red)
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Expand arrange panel
    await page.locator('[title="Expand Arrange"]').click();
    await page.waitForTimeout(200);

    // Try to find buttons by their position or content
    const arrangeButtons = page.locator('button[title*="Front"], button[title*="Back"]');

    // Verify element is selected before trying to arrange
    const selectedCount = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        return store.getState().selectedIds.length;
      }
      return 0;
    });
    expect(selectedCount).toBe(1);

    // Get initial z-index order
    const initialOrder = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({ id: el.id, zIndex: el.zIndex }));
      }
      return [];
    });

    // Click bring to front - use position-based selector
    await arrangeButtons.nth(0).click(); // Bring to Front should be first
    await page.waitForTimeout(200);

    // Get order after bring to front
    const afterBringToFrontOrder = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({ id: el.id, zIndex: el.zIndex }));
      }
      return [];
    });

    // Verify that the selected element (first one) now has higher z-index
    const selectedElementAfterBringToFront = afterBringToFrontOrder.find((el: any) => el.id === elementIds[0]);
    const otherElementAfterBringToFront = afterBringToFrontOrder.find((el: any) => el.id === elementIds[1]);
    expect(selectedElementAfterBringToFront.zIndex).toBeGreaterThan(otherElementAfterBringToFront.zIndex);

    // Click send to back - use position-based selector
    await arrangeButtons.nth(2).click(); // Send to Back should be last (index 2)
    await page.waitForTimeout(200);

    // Get order after send to back
    const afterSendToBackOrder = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({ id: el.id, zIndex: el.zIndex }));
      }
      return [];
    });

    // Verify that the selected element (first one) now has lower z-index again
    const selectedElementAfterSendToBack = afterSendToBackOrder.find((el: any) => el.id === elementIds[0]);
    const otherElementAfterSendToBack = afterSendToBackOrder.find((el: any) => el.id === elementIds[1]);
    expect(selectedElementAfterSendToBack.zIndex).toBeLessThan(otherElementAfterSendToBack.zIndex);

    // Verify both shapes still exist
    const pathsAfterArrange = await canvas.locator('path').count();
    expect(pathsAfterArrange).toBe(2);
  });
});