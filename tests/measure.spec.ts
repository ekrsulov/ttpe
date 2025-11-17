import { test, expect } from '@playwright/test';
import { getCanvas, waitForLoad, getToolButton } from './helpers';

test.describe('Measure Plugin - Basic Interaction', () => {
  test('click-to-start, move-to-update, click-to-freeze flow', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Activate Measure tool
    await getToolButton(page, 'Measure').click();

    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Coordinates for the first measurement
    const start = {
      clientX: canvasBox.x + canvasBox.width * 0.25,
      clientY: canvasBox.y + canvasBox.height * 0.25,
    };

    const middle = {
      clientX: canvasBox.x + canvasBox.width * 0.60,
      clientY: canvasBox.y + canvasBox.height * 0.60,
    };

    const secondStart = {
      clientX: canvasBox.x + canvasBox.width * 0.3,
      clientY: canvasBox.y + canvasBox.height * 0.35,
    };

    // Click to start measurement (first click should start)
    await page.mouse.click(start.clientX, start.clientY);
    await page.waitForTimeout(50);

    const stateAfterStart = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      const s = store.getState();
      return s.measure.measurement;
    });

    expect(stateAfterStart.isActive).toBe(true);
    expect(stateAfterStart.startPoint).toBeTruthy();

    // Move to update measurement
    await page.mouse.move(middle.clientX, middle.clientY, { steps: 10 });
    await page.waitForTimeout(50);

    const stateDuringMove = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      const s = store.getState();
      return s.measure.measurement;
    });

    expect(stateDuringMove.endPoint).toBeTruthy();
    expect(stateDuringMove.distance).toBeGreaterThan(0);

    // Click to finalize (freeze) measurement
    await page.mouse.click(middle.clientX, middle.clientY);
    await page.waitForTimeout(50);

    const stateAfterFinalize = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      const s = store.getState();
      return s.measure.measurement;
    });

    expect(stateAfterFinalize.isActive).toBe(false);
    expect(stateAfterFinalize.startPoint).toBeTruthy();
    expect(stateAfterFinalize.endPoint).toBeTruthy();

    // Click again to start a new measurement (should reset and start again)
    await page.mouse.click(secondStart.clientX, secondStart.clientY);
    await page.waitForTimeout(50);

    const stateAfterSecondStart = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      const s = store.getState();
      return s.measure.measurement;
    });

    expect(stateAfterSecondStart.isActive).toBe(true);
    expect(stateAfterSecondStart.startPoint).toBeTruthy();

    // Clear measurement using Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);

    const stateAfterClear = await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      const s = store.getState();
      return s.measure.measurement;
    });

    expect(stateAfterClear.startPoint).toBe(null);
    expect(stateAfterClear.endPoint).toBe(null);
    expect(stateAfterClear.isActive).toBe(false);
  });
});
