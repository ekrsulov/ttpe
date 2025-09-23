import { test, expect } from '@playwright/test';

test.describe('TTPE Application', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check that the SVG canvas and sidebar are present
    await expect(page.locator('svg[viewBox*="0 0"]').first()).toBeVisible();
    await expect(page.locator('[style*="position: absolute"][style*="right: 0"]').first()).toBeVisible();

    // Check that plugin buttons are present
    const pluginButtons = ['Select', 'Subpath', 'Transform', 'Edit', 'Pan', 'Pencil', 'Text', 'Shape'];
    for (const button of pluginButtons) {
      await expect(page.locator(`[title="${button}"]`)).toBeVisible();
    }
  });

  test('should switch between different modes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test switching to pencil mode
    await page.locator('[title="Pencil"]').click();
    await expect(page.locator('text=Pencil')).toBeVisible();

    // Test switching to shape mode
    await page.locator('[title="Shape"]').click();
    await expect(page.locator('text=Shape')).toBeVisible();

    // Test switching to text mode
    await page.locator('[title="Text"]').click();
    await expect(page.locator('text=Text')).toBeVisible();
  });
});