import { test, expect } from '@playwright/test';
import { getCanvas, waitForLoad, getToolButton } from './helpers';

test.describe('Measure Plugin - Snap Type Toggle Persistence', () => {
  test('toggles are preserved and adjustable after starting measurement', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Activate Measure tool
    await getToolButton(page, 'Measure').click();

    // Ensure initial measure settings: disable Mid and Edge
    await page.evaluate(() => {
      const store = (window as any).useCanvasStore;
      store.getState().updateMeasureState?.({ snapToMidpoints: false, snapToEdges: false, snapToAnchors: true, showSnapPoints: true });
    });

    // Wait for UI to update
    await page.waitForTimeout(50);

    // Click to start measurement
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');
    const start = { clientX: canvasBox.x + 200, clientY: canvasBox.y + 200 };
    await page.mouse.click(start.clientX, start.clientY);
    await page.waitForTimeout(50);

    // Verify toggles still reflect the state (midpoints and edges should be unchecked)
    const midCheckbox = page.getByRole('checkbox', { name: 'Mid' });
    const edgeCheckbox = page.getByRole('checkbox', { name: 'Edge' });
    const anchorCheckbox = page.getByRole('checkbox', { name: 'Anchor' });

    expect(await midCheckbox.isChecked()).toBe(false);
    expect(await edgeCheckbox.isChecked()).toBe(false);
    expect(await anchorCheckbox.isChecked()).toBe(true);

    // Toggle Mid on via UI and ensure it changes
    const midControl = page.locator('label', { hasText: 'Mid' }).locator('.chakra-checkbox__control');
    await midControl.click();
    await page.waitForTimeout(30);
    expect(await midCheckbox.isChecked()).toBe(true);

  });
});
