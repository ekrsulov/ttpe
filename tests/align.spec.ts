import { test, expect } from '@playwright/test';

test.describe('Align Tests', () => {
  test('should align elements to the left', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Activate shape mode
    await page.locator('[title="Shape"]').click();

    // Select circle shape
    await page.locator('[title="Circle - Click and drag to create"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create 2 circles at different horizontal positions (not aligned)
    const circlePositions = [
      { start: { x: 0.4, y: 0.2 }, end: { x: 0.5, y: 0.3 } }, // Circle at x: 0.4-0.5
      { start: { x: 0.7, y: 0.2 }, end: { x: 0.8, y: 0.3 } }, // Circle at x: 0.7-0.8
    ];

    for (const pos of circlePositions) {
      // Ensure we're in shape mode for each circle
      await page.locator('[title="Shape"]').click();
      await page.locator('[title="Circle - Click and drag to create"]').click();

      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.start.x,
        canvasBox.y + canvasBox.height * pos.start.y
      );
      await page.mouse.down();
      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.end.x,
        canvasBox.y + canvasBox.height * pos.end.y,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(100);
    }

    // Switch to select mode
    await page.locator('[title="Select"]').click();
    await page.waitForTimeout(200);

    // Expand arrange panel
    await page.locator('[title="Expand Arrange"]').click();
    await page.waitForTimeout(200);

    // Get initial positions
    const initialPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        console.log('Number of elements:', state.elements.length);
        console.log('Elements:', state.elements.map((el: any) => ({ id: el.id, type: el.type })));
        console.log('MeasurePath available:', typeof (window as any).measurePath);
        return state.elements.map((el: any) => {
          // Calculate bounds for each element
          const pathData = el.data;
          console.log('Element data for', el.id, ':', JSON.stringify(pathData).substring(0, 200));
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1); // Use zoom 1 for simplicity
          console.log('Bounds for element', el.id, ':', bounds);
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify circles were created
    const pathsCount = await canvas.locator('path').count();
    expect(pathsCount).toBe(circlePositions.length);

    // Select all circles using the exposed store
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const elementIds = state.elements.map((el: any) => el.id);
        if (elementIds.length >= 2) {
          // Select all elements
          state.selectElements(elementIds);
        }
      }
    });

    // Wait for selection to be processed
    await page.waitForTimeout(500);

    // Verify selection by checking if align button is enabled
    const alignButton = page.locator('[title="Align Left"]');
    await expect(alignButton).toBeEnabled();

    // Click align left button
    await alignButton.click();

    // Wait for alignment to complete
    await page.waitForTimeout(200);

    // Get positions after alignment
    const finalPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => {
          // Calculate bounds for each element
          const pathData = el.data;
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1); // Use zoom 1 for simplicity
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify that elements moved (left alignment should make all elements have the same left edge)
    expect(finalPositions.length).toBe(2);
    const targetLeftX = finalPositions[0].minX;
    finalPositions.forEach((pos: any) => {
      expect(pos.minX).toBeCloseTo(targetLeftX, 1); // Allow small tolerance
    });

    // Verify that positions actually changed (at least one element should move)
    const positionsChanged = initialPositions.some((initial: any, index: number) => 
      initial.minX !== finalPositions[index].minX
    );
    expect(positionsChanged).toBe(true);

    // Verify circles still exist after alignment
    const pathsAfterAlign = await canvas.locator('path').count();
    expect(pathsAfterAlign).toBe(circlePositions.length);
  });

  test('should align elements to the center horizontally', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Activate shape mode
    await page.locator('[title="Shape"]').click();

    // Select circle shape
    await page.locator('[title="Circle - Click and drag to create"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create 2 circles at different horizontal positions (not aligned)
    const circlePositions = [
      { start: { x: 0.2, y: 0.2 }, end: { x: 0.3, y: 0.3 } }, // Circle at x: 0.2-0.3
      { start: { x: 0.7, y: 0.2 }, end: { x: 0.8, y: 0.3 } }, // Circle at x: 0.7-0.8
    ];

    for (const pos of circlePositions) {
      // Ensure we're in shape mode for each circle
      await page.locator('[title="Shape"]').click();
      await page.locator('[title="Circle - Click and drag to create"]').click();

      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.start.x,
        canvasBox.y + canvasBox.height * pos.start.y
      );
      await page.mouse.down();
      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.end.x,
        canvasBox.y + canvasBox.height * pos.end.y,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(100);
    }

    // Switch to select mode
    await page.locator('[title="Select"]').click();
    await page.waitForTimeout(200);

    // Expand arrange panel
    await page.locator('[title="Expand Arrange"]').click();
    await page.waitForTimeout(200);

    // Get initial positions
    const initialPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({
          id: el.id,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height
        }));
      }
      return [];
    });

    // Verify circles were created
    const pathsCount = await canvas.locator('path').count();
    expect(pathsCount).toBe(circlePositions.length);

    // Select all circles using the exposed store
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const elementIds = state.elements.map((el: any) => el.id);
        if (elementIds.length >= 2) {
          // Select all elements
          state.selectElements(elementIds);
        }
      }
    });

    // Wait for selection to be processed
    await page.waitForTimeout(500);

    // Verify selection by checking if align button is enabled
    const alignButton = page.locator('[title="Align Center"]');
    await expect(alignButton).toBeEnabled();

    // Click align center button
    await alignButton.click();

    // Wait for alignment to complete
    await page.waitForTimeout(200);

    // Get positions after alignment
    const finalPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => {
          // Calculate bounds for each element
          const pathData = el.data;
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1); // Use zoom 1 for simplicity
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify that elements moved (center alignment should make all elements have the same center X)
    expect(finalPositions.length).toBe(2);
    const centerX = finalPositions[0].minX + finalPositions[0].width / 2;
    finalPositions.forEach((pos: any) => {
      const elementCenterX = pos.minX + pos.width / 2;
      expect(elementCenterX).toBeCloseTo(centerX, 1); // Allow small tolerance
    });

    // Verify that positions actually changed (at least one element should move)
    const positionsChanged = initialPositions.some((initial: any, index: number) => 
      initial.minX !== finalPositions[index].minX
    );
    expect(positionsChanged).toBe(true);

    // Verify circles still exist after alignment
    const pathsAfterAlign = await canvas.locator('path').count();
    expect(pathsAfterAlign).toBe(circlePositions.length);
  });

  test('should align elements to the right', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Activate shape mode
    await page.locator('[title="Shape"]').click();

    // Select circle shape
    await page.locator('[title="Circle - Click and drag to create"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create 2 circles at different horizontal positions (same Y, different X)
    const circlePositions = [
      { start: { x: 0.1, y: 0.2 }, end: { x: 0.2, y: 0.3 } }, // Circle at x: 0.1-0.2, y: 0.2-0.3
      { start: { x: 0.5, y: 0.2 }, end: { x: 0.6, y: 0.3 } }, // Circle at x: 0.5-0.6, y: 0.2-0.3
    ];

    for (const pos of circlePositions) {
      // Ensure we're in shape mode for each circle
      await page.locator('[title="Shape"]').click();
      await page.locator('[title="Circle - Click and drag to create"]').click();

      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.start.x,
        canvasBox.y + canvasBox.height * pos.start.y
      );
      await page.mouse.down();
      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.end.x,
        canvasBox.y + canvasBox.height * pos.end.y,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(100);
    }

    // Switch to select mode
    await page.locator('[title="Select"]').click();
    await page.waitForTimeout(200);

    // Expand arrange panel
    await page.locator('[title="Expand Arrange"]').click();
    await page.waitForTimeout(200);

    // Get initial positions
    const initialPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({
          id: el.id,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height
        }));
      }
      return [];
    });

    // Verify circles were created
    const pathsCount = await canvas.locator('path').count();
    expect(pathsCount).toBe(circlePositions.length);

    // Select all circles using the exposed store
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const elementIds = state.elements.map((el: any) => el.id);
        if (elementIds.length >= 2) {
          // Select all elements
          state.selectElements(elementIds);
        }
      }
    });

    // Wait for selection to be processed
    await page.waitForTimeout(500);

    // Verify selection by checking if align button is enabled
    const alignButton = page.locator('[title="Align Right"]');
    await expect(alignButton).toBeEnabled();

    // Click align right button
    await alignButton.click();

    // Wait for alignment to complete
    await page.waitForTimeout(200);

    // Get positions after alignment
    const finalPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => {
          // Calculate bounds for each element
          const pathData = el.data;
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1); // Use zoom 1 for simplicity
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify that elements moved (right alignment should make all elements have the same right edge)
    expect(finalPositions.length).toBe(2);
    const rightmostX = Math.max(...finalPositions.map((p: any) => p.maxX));
    finalPositions.forEach((pos: any) => {
      expect(pos.maxX).toBeCloseTo(rightmostX, 1); // Allow small tolerance
    });

    // Verify that positions actually changed (at least one element should move)
    const positionsChanged = initialPositions.some((initial: any, index: number) => 
      initial.minX !== finalPositions[index].minX
    );
    expect(positionsChanged).toBe(true);

    // Verify circles still exist after alignment
    const pathsAfterAlign = await canvas.locator('path').count();
    expect(pathsAfterAlign).toBe(circlePositions.length);
  });

  test('should align elements to the top', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Activate shape mode
    await page.locator('[title="Shape"]').click();

    // Select circle shape
    await page.locator('[title="Circle - Click and drag to create"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create 2 circles at different vertical positions (not aligned)
    const circlePositions = [
      { start: { x: 0.2, y: 0.1 }, end: { x: 0.3, y: 0.2 } }, // Circle at y: 0.1-0.2
      { start: { x: 0.2, y: 0.5 }, end: { x: 0.3, y: 0.6 } }, // Circle at y: 0.5-0.6
    ];

    for (const pos of circlePositions) {
      // Ensure we're in shape mode for each circle
      await page.locator('[title="Shape"]').click();
      await page.locator('[title="Circle - Click and drag to create"]').click();

      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.start.x,
        canvasBox.y + canvasBox.height * pos.start.y
      );
      await page.mouse.down();
      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.end.x,
        canvasBox.y + canvasBox.height * pos.end.y,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(100);
    }

    // Switch to select mode
    await page.locator('[title="Select"]').click();
    await page.waitForTimeout(200);

    // Expand arrange panel
    await page.locator('[title="Expand Arrange"]').click();
    await page.waitForTimeout(200);

    // Get initial positions
    const initialPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({
          id: el.id,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height
        }));
      }
      return [];
    });

    // Verify circles were created
    const pathsCount = await canvas.locator('path').count();
    expect(pathsCount).toBe(circlePositions.length);

    // Select all circles using the exposed store
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const elementIds = state.elements.map((el: any) => el.id);
        if (elementIds.length >= 2) {
          // Select all elements
          state.selectElements(elementIds);
        }
      }
    });

    // Wait for selection to be processed
    await page.waitForTimeout(500);

    // Verify selection by checking if align button is enabled
    const alignButton = page.locator('[title="Align Top"]');
    await expect(alignButton).toBeEnabled();

    // Click align top button
    await alignButton.click();

    // Wait for alignment to complete
    await page.waitForTimeout(200);

    // Get positions after alignment
    const finalPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => {
          // Calculate bounds for each element
          const pathData = el.data;
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1); // Use zoom 1 for simplicity
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify that elements moved (top alignment should make all elements have the same top edge)
    expect(finalPositions.length).toBe(2);
    const topmostY = Math.min(...finalPositions.map((p: any) => p.minY));
    finalPositions.forEach((pos: any) => {
      expect(pos.minY).toBeCloseTo(topmostY, 1); // Allow small tolerance
    });

    // Verify that positions actually changed (at least one element should move)
    const positionsChanged = initialPositions.some((initial: any, index: number) => 
      initial.minY !== finalPositions[index].minY
    );
    expect(positionsChanged).toBe(true);

    // Verify circles still exist after alignment
    const pathsAfterAlign = await canvas.locator('path').count();
    expect(pathsAfterAlign).toBe(circlePositions.length);
  });

  test('should align elements to the middle vertically', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Activate shape mode
    await page.locator('[title="Shape"]').click();

    // Select circle shape
    await page.locator('[title="Circle - Click and drag to create"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create 2 circles at different vertical positions (not aligned)
    const circlePositions = [
      { start: { x: 0.2, y: 0.1 }, end: { x: 0.3, y: 0.2 } }, // Circle at y: 0.1-0.2
      { start: { x: 0.2, y: 0.6 }, end: { x: 0.3, y: 0.7 } }, // Circle at y: 0.6-0.7
    ];

    for (const pos of circlePositions) {
      // Ensure we're in shape mode for each circle
      await page.locator('[title="Shape"]').click();
      await page.locator('[title="Circle - Click and drag to create"]').click();

      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.start.x,
        canvasBox.y + canvasBox.height * pos.start.y
      );
      await page.mouse.down();
      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.end.x,
        canvasBox.y + canvasBox.height * pos.end.y,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(100);
    }

    // Switch to select mode
    await page.locator('[title="Select"]').click();
    await page.waitForTimeout(200);

    // Expand arrange panel
    await page.locator('[title="Expand Arrange"]').click();
    await page.waitForTimeout(200);

    // Get initial positions
    const initialPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({
          id: el.id,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height
        }));
      }
      return [];
    });

    // Verify circles were created
    const pathsCount = await canvas.locator('path').count();
    expect(pathsCount).toBe(circlePositions.length);

    // Select all circles using the exposed store
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const elementIds = state.elements.map((el: any) => el.id);
        if (elementIds.length >= 2) {
          // Select all elements
          state.selectElements(elementIds);
        }
      }
    });

    // Wait for selection to be processed
    await page.waitForTimeout(500);

    // Verify selection by checking if align button is enabled
    const alignButton = page.locator('[title="Align Middle"]');
    await expect(alignButton).toBeEnabled();

    // Click align middle button
    await alignButton.click();

    // Wait for alignment to complete
    await page.waitForTimeout(200);

    // Get positions after alignment
    const finalPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => {
          // Calculate bounds for each element
          const pathData = el.data;
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1); // Use zoom 1 for simplicity
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify that elements moved (middle alignment should make all elements have the same center Y)
    expect(finalPositions.length).toBe(2);
    const centerY = finalPositions[0].minY + finalPositions[0].height / 2;
    finalPositions.forEach((pos: any) => {
      const elementCenterY = pos.minY + pos.height / 2;
      expect(elementCenterY).toBeCloseTo(centerY, 1); // Allow small tolerance
    });

    // Verify that positions actually changed (at least one element should move)
    const positionsChanged = initialPositions.some((initial: any, index: number) => 
      initial.minY !== finalPositions[index].minY
    );
    expect(positionsChanged).toBe(true);

    // Verify circles still exist after alignment
    const pathsAfterAlign = await canvas.locator('path').count();
    expect(pathsAfterAlign).toBe(circlePositions.length);
  });

  test('should align elements to the bottom', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Activate shape mode
    await page.locator('[title="Shape"]').click();

    // Select circle shape
    await page.locator('[title="Circle - Click and drag to create"]').click();

    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Create 2 circles at different vertical positions (not aligned)
    const circlePositions = [
      { start: { x: 0.2, y: 0.1 }, end: { x: 0.3, y: 0.2 } }, // Circle at y: 0.1-0.2
      { start: { x: 0.2, y: 0.5 }, end: { x: 0.3, y: 0.6 } }, // Circle at y: 0.5-0.6
    ];

    for (const pos of circlePositions) {
      // Ensure we're in shape mode for each circle
      await page.locator('[title="Shape"]').click();
      await page.locator('[title="Circle - Click and drag to create"]').click();

      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.start.x,
        canvasBox.y + canvasBox.height * pos.start.y
      );
      await page.mouse.down();
      await page.mouse.move(
        canvasBox.x + canvasBox.width * pos.end.x,
        canvasBox.y + canvasBox.height * pos.end.y,
        { steps: 10 }
      );
      await page.mouse.up();
      await page.waitForTimeout(100);
    }

    // Switch to select mode
    await page.locator('[title="Select"]').click();
    await page.waitForTimeout(200);

    // Expand arrange panel
    await page.locator('[title="Expand Arrange"]').click();
    await page.waitForTimeout(200);

    // Get initial positions
    const initialPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => ({
          id: el.id,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height
        }));
      }
      return [];
    });

    // Verify circles were created
    const pathsCount = await canvas.locator('path').count();
    expect(pathsCount).toBe(circlePositions.length);

    // Select all circles using the exposed store
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        const elementIds = state.elements.map((el: any) => el.id);
        if (elementIds.length >= 2) {
          // Select all elements
          state.selectElements(elementIds);
        }
      }
    });

    // Wait for selection to be processed
    await page.waitForTimeout(500);

    // Verify selection by checking if align button is enabled
    const alignButton = page.locator('[title="Align Bottom"]');
    await expect(alignButton).toBeEnabled();

    // Click align bottom button
    await alignButton.click();

    // Wait for alignment to complete
    await page.waitForTimeout(200);

    // Get positions after alignment
    const finalPositions = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      if (store) {
        const state = store.getState();
        return state.elements.map((el: any) => {
          // Calculate bounds for each element
          const pathData = el.data;
          const bounds = (window as any).measurePath(pathData.subPaths, pathData.strokeWidth, 1); // Use zoom 1 for simplicity
          return {
            id: el.id,
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
          };
        });
      }
      return [];
    });

    // Verify that elements moved (bottom alignment should make all elements have the same bottom edge)
    expect(finalPositions.length).toBe(2);
    const bottommostY = Math.max(...finalPositions.map((p: any) => p.maxY));
    finalPositions.forEach((pos: any) => {
      expect(pos.maxY).toBeCloseTo(bottommostY, 1); // Allow small tolerance
    });

    // Verify that positions actually changed (at least one element should move)
    const positionsChanged = initialPositions.some((initial: any, index: number) => 
      initial.minY !== finalPositions[index].minY
    );
    expect(positionsChanged).toBe(true);

    // Verify circles still exist after alignment
    const pathsAfterAlign = await canvas.locator('path').count();
    expect(pathsAfterAlign).toBe(circlePositions.length);
  });
});