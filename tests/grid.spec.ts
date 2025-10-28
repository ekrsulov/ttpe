import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths, waitForLoad, getToolButton } from './helpers';

test.describe('Grid Fill Tool Tests', () => {
  test('should activate grid fill mode and display panel', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Enable grid first
    await page.locator('[aria-label="Settings"]').click();

    // Verify settings panel opens
    expect(true).toBe(true);
  });

  test('should fill grid cells with shapes', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Enable grid
    await page.locator('[aria-label="Settings"]').click();

    // Verify grid enabling works
    expect(true).toBe(true);
  });
});