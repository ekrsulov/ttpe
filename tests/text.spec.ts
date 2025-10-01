import { test, expect } from '@playwright/test';

test.describe('Text Functionality', () => {
  test('should add text with spaces, change font properties, and position to the left', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to text mode
    await page.locator('[title="Text"]').click();
    await page.waitForTimeout(200); // Slow down

    // Verify text panel is visible
    await expect(page.locator('text=Text')).toBeVisible();

    // Get SVG canvas element
    const canvas = page.locator('svg[viewBox*="0 0"]').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await canvas.locator('path').count();

    // Set font properties before adding text
    const fontSizeInput = page.locator('input[type="number"][min="4"]');
    await fontSizeInput.clear();
    await fontSizeInput.fill('96');
    await expect(fontSizeInput).toHaveValue('96');

    // Make text bold
    const boldButton = page.locator('[title="Bold"]');
    await expect(boldButton).toBeVisible();
    await page.waitForTimeout(150); // Slow down
    await boldButton.click();

    // Make text italic
    const italicButton = page.locator('[title="Italic"]');
    await expect(italicButton).toBeVisible();
    await page.waitForTimeout(150); // Slow down
    await italicButton.click();

    // Test font selector (if available)
    const fontSelector = page.locator('select').first();
    if (await fontSelector.isVisible()) {
      await fontSelector.selectOption('Arial');
    }

    // Enter text with spaces in the input field
    const textInput = page.locator('input[placeholder="Enter text"]');
    await expect(textInput).toBeVisible();
    await page.waitForTimeout(150); // Slow down
    await textInput.fill('Hello World Text');

    // Click on canvas to place text (more to the left)
    await canvas.click({
      position: { x: canvasBox.width * 0.2, y: canvasBox.height * 0.5 }
    });
    await page.waitForTimeout(300); // Slow down after placing text

    // Wait for text creation
    await page.waitForTimeout(300); // Extra wait for text creation

    // Verify text was created (should appear as a path element)
    const pathsAfterText = await canvas.locator('path').count();
    expect(pathsAfterText).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await page.locator('[title="Select"]').click();
    await page.waitForTimeout(200); // Slow down

    // Click on the created text to select it (try multiple coordinates, positioned to the left)
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.2,
      canvasBox.y + canvasBox.height * 0.5
    );
    await page.waitForTimeout(200); // Slow down

    // Wait for selection
    await page.waitForTimeout(300); // Extra wait

    // If still not enabled, try clicking again
    const editButton = page.locator('[title="Edit"]').first();
    
    if (!(await editButton.isEnabled())) {
      // Try clicking at a different position
      await page.mouse.click(
        canvasBox.x + canvasBox.width * 0.22,
        canvasBox.y + canvasBox.height * 0.52
      );
      await page.waitForTimeout(100); // Slow down
    }

    // Verify text input still has the value (if the input field is still visible)
    const textInputAfter = page.locator('input[placeholder="Enter text"]');
    if (await textInputAfter.isVisible()) {
      await expect(textInputAfter).toHaveValue('Hello World Text');
    }
  });
});