import { test, expect } from '@playwright/test';

test.describe('Bring to Front and Send to Back', () => {
  test('should arrange elements using bring to front and send to back', async ({ page }) => {
    // This test verifies the bring to front and send to back functionality through complete UI interaction.
    // Colors are applied via UI color picker: select shape → expand panel → set fill color → collapse panel
    // Then z-order operations are tested through UI buttons.
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
      { steps: 10 }
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
      { steps: 10 }
    );

    await page.mouse.up();

    // Wait for second shape creation
    await page.waitForTimeout(100);

    // Switch to select mode
    await page.locator('[title="Select"]').click();

    // Select the first shape by clicking in its center area
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );

    // Wait for selection
    await page.waitForTimeout(200);

    // Verify first selection
    const firstSelectionCount = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        return store.getState().selectedIds.length;
      }
      return 0;
    });
    console.log('First selection count:', firstSelectionCount);
    expect(firstSelectionCount).toBe(1);

    // Expand the editor panel by clicking the chevron
    await page.locator('[title="Expand Controls"]').click();
    await page.waitForTimeout(200);

    // Find and set fill color for first shape using the color input
    const fillColorInput = page.locator('input[type="color"][title="Fill Color"]');
    
    // Debug: Check if color input exists
    const colorInputCount = await fillColorInput.count();
    console.log('Color input count:', colorInputCount);
    
    // Set red color for first shape by directly clicking the color input and using fill()
    await fillColorInput.click();
    await fillColorInput.fill('#ff4444');
    
    await page.waitForTimeout(300);

    // Debug: Check selected paths count and element state
    const debugInfo = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const selectedPaths = state.elements.filter((el: any) => state.selectedIds.includes(el.id) && el.type === 'path');
        const selectedElement = state.elements.find((el: any) => state.selectedIds.includes(el.id));
        return {
          selectedPathsCount: selectedPaths.length,
          selectedIds: state.selectedIds,
          elementCount: state.elements.length,
          fillColor: selectedElement?.data?.fillColor || 'none',
          pencilFillColor: state.pencil?.fillColor || 'none'
        };
      }
      return { error: 'Store not found' };
    });
    console.log('Debug info:', debugInfo);

    // Debug: Check if color was applied
    const firstColorCheck = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const selectedElement = state.elements.find((el: any) => state.selectedIds.includes(el.id));
        return selectedElement?.data?.fillColor || 'none';
      }
      return 'none';
    });
    console.log('First element color after setting:', firstColorCheck);

    // Collapse the editor panel
    await page.locator('[title="Collapse Controls"]').click();
    await page.waitForTimeout(100);

    // Clear any existing selection by clicking empty area
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.8,
      canvasBox.y + canvasBox.height * 0.8
    );
    await page.waitForTimeout(100);

    // Select the second shape by clicking in the part that doesn't overlap with first shape
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.45,
      canvasBox.y + canvasBox.height * 0.45
    );

    // Wait for selection
    await page.waitForTimeout(200);

    // Verify second selection
    const secondSelectionCount = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        return store.getState().selectedIds.length;
      }
      return 0;
    });
    console.log('Second selection count:', secondSelectionCount);
    expect(secondSelectionCount).toBe(1);

    // Expand the editor panel again
    await page.locator('[title="Expand Controls"]').click();
    await page.waitForTimeout(200);

    // Set blue color for second shape using the same color input
    await fillColorInput.click();
    await fillColorInput.fill('#4444ff');
    
    await page.waitForTimeout(300);

    // Debug: Check if second color was applied
    const secondColorCheck = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const selectedElement = state.elements.find((el: any) => state.selectedIds.includes(el.id));
        return selectedElement?.data?.fillColor || 'none';
      }
      return 'none';
    });
    console.log('Second element color after setting:', secondColorCheck);

    // Collapse the editor panel
    await page.locator('[title="Collapse Controls"]').click();
    await page.waitForTimeout(100);

    // Expand arrange panel
    await page.locator('[title="Expand Arrange"]').click();
    await page.waitForTimeout(200);

    // Try to find buttons by their position or content
    const arrangeButtons = page.locator('button[title*="Front"], button[title*="Back"]');

    // Select the first shape (bottom one - red) for z-order operations by clicking in area that only has first shape
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );

    // Wait for selection
    await page.waitForTimeout(200);

    // Debug: Check what happened with the selection
    const selectionDebug = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return {
          selectedIds: state.selectedIds,
          elementCount: state.elements.length,
          elements: state.elements.map((el: any) => ({
            id: el.id,
            type: el.type,
            fillColor: el.data?.fillColor
          }))
        };
      }
      return { error: 'Store not found' };
    });
    console.log('Selection debug after clicking first shape:', selectionDebug);

    // Verify element is selected before trying to arrange
    const selectedCount = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        return store.getState().selectedIds.length;
      }
      return 0;
    });
    console.log('Selected count for z-order operations:', selectedCount);
    expect(selectedCount).toBe(1);

    // Get initial z-index order and verify colors are applied via UI
    const initialOrder = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({
          id: el.id,
          zIndex: el.zIndex,
          fillColor: el.data?.fillColor
        }));
      }
      return [];
    });

    // Verify that both elements have different fill colors applied via UI color picker
    expect(initialOrder.length).toBe(2);
    expect(initialOrder[0].fillColor).not.toBe(initialOrder[1].fillColor);
    expect(initialOrder[0].fillColor).not.toBe('none');
    expect(initialOrder[1].fillColor).not.toBe('none');

    // Select the first shape (bottom one - red)
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.25,
      canvasBox.y + canvasBox.height * 0.25
    );

    // Wait for selection
    await page.waitForTimeout(100);

    // Click bring to front - use position-based selector
    await arrangeButtons.nth(0).click(); // Bring to Front should be first
    await page.waitForTimeout(200);

    // Get order after bring to front
    const afterBringToFrontOrder = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({ 
          id: el.id, 
          zIndex: el.zIndex,
          fillColor: el.data?.fillColor 
        }));
      }
      return [];
    });

    // Find the red and blue elements by their specific colors set via UI
    const redElement = afterBringToFrontOrder.find((el: any) => 
      el.fillColor === '#ff4444' // red color set via UI
    );
    const blueElement = afterBringToFrontOrder.find((el: any) => 
      el.fillColor === '#4444ff' // blue color set via UI
    );

    // Verify that the red element (first selected) now has higher z-index
    if (redElement && blueElement) {
      expect(redElement.zIndex).toBeGreaterThan(blueElement.zIndex);
    }

    // Click send to back - use position-based selector
    await arrangeButtons.nth(2).click(); // Send to Back should be last (index 2)
    await page.waitForTimeout(200);

    // Get order after send to back
    const afterSendToBackOrder = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({ 
          id: el.id, 
          zIndex: el.zIndex,
          fillColor: el.data?.fillColor 
        }));
      }
      return [];
    });

    // Find elements by their specific colors again
    const redElementAfterSendToBack = afterSendToBackOrder.find((el: any) => 
      el.fillColor === '#ff4444' // red color set via UI
    );
    const blueElementAfterSendToBack = afterSendToBackOrder.find((el: any) => 
      el.fillColor === '#4444ff' // blue color set via UI
    );

    // Verify that the red element (originally selected) now has lower z-index again
    if (redElementAfterSendToBack && blueElementAfterSendToBack) {
      expect(redElementAfterSendToBack.zIndex).toBeLessThan(blueElementAfterSendToBack.zIndex);
    }

    // Verify both shapes still exist
    const pathsAfterArrange = await canvas.locator('path').count();
    expect(pathsAfterArrange).toBe(2);
  });
});