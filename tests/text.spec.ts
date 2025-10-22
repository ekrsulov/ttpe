import { test, expect } from '@playwright/test';
import { getCanvas, getCanvasPaths, waitForLoad, getToolButton } from './helpers';

test.describe('Text Functionality', () => {
  test('should add text with spaces, change font properties, and position to the left', async ({ page }) => {
    await page.goto('/');
    await waitForLoad(page);

    // Switch to text mode
    await getToolButton(page, 'Text').click();
    await page.waitForTimeout(200); // Slow down

    // Verify text panel is visible
    await expect(page.getByRole('heading', { name: 'Text' })).toBeVisible();

    // Get SVG canvas element
    const canvas = getCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('SVG canvas not found');

    // Count initial elements
    const initialPaths = await getCanvasPaths(page).count();

    // Enter text first, then modify font properties
    const initialTextInput = page.locator('input[placeholder="Enter text"]');
    await expect(initialTextInput).toBeVisible();
    await page.waitForTimeout(150); // Slow down
    await initialTextInput.fill('Hello World Text');

    // Now set font properties after entering text
    // Wait a bit for the panel to fully load
    await page.waitForTimeout(500);
    
    // Try to find the font size input - it might be within a NumberInput component
    const fontSizeInput = page.locator('[role="spinbutton"]').first();
    await fontSizeInput.clear();
    await fontSizeInput.fill('96');
    await expect(fontSizeInput).toHaveValue('96');

    // Make text bold
    const boldButton = page.locator('[aria-label="Bold"]');
    await expect(boldButton).toBeVisible();
    await page.waitForTimeout(150); // Slow down
    await boldButton.click();

    // Make text italic
    const italicButton = page.locator('[aria-label="Italic"]');
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
    const pathsAfterText = await getCanvasPaths(page).count();
    expect(pathsAfterText).toBeGreaterThan(initialPaths);

    // Switch to select mode explicitly
    await getToolButton(page, 'Select').click();
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
    const editButton = getToolButton(page, 'Edit').first();
    
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