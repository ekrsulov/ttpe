import { Page, Locator } from '@playwright/test';

/**
 * Helper functions for finding elements in the action bars
 * Since buttons moved from sidebar to TopActionBar and BottomActionBar
 */

/**
 * Get a tool button from the TopActionBar by its title
 */
export function getToolButton(page: Page, title: string): Locator {
  return page.locator(`[title="${title}"]`);
}

/**
 * Unused helper - removed to clean up public API
 * Not referenced by any test files
 */
/*
export function getActionButton(page: Page, ariaLabel: string): Locator {
  return page.locator(`[aria-label="${ariaLabel}"]`);
}
*/

/**
 * Click a tool button (Select, Pencil, Text, Shape, etc.) from the TopActionBar
 */
export async function clickToolButton(page: Page, title: string): Promise<void> {
  await getToolButton(page, title).click();
}

/**
 * Unused helper - removed to clean up public API
 * Not referenced by any test files
 */
/*
export async function clickActionButton(page: Page, ariaLabel: string): Promise<void> {
  await getActionButton(page, ariaLabel).click();
}
*/

/**
 * Get the canvas SVG element
 */
export function getCanvas(page: Page): Locator {
  return page.locator('svg[data-canvas="true"]');
}

/**
 * Get canvas paths (excluding minimap and other overlay paths)
 * This returns only the main canvas elements, not the minimap preview
 */
export function getCanvasPaths(page: Page): Locator {
  // Get paths that have data-element-id attribute, which are the actual canvas elements
  // This excludes paths in the minimap and other overlays
  return page.locator('path[data-element-id]');
}

/**
 * Wait for network to be idle
 */
export async function waitForLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Get a button from the sidebar panel (like Duplicate, Add Subpath, etc.)
 */
export function getSidebarButton(page: Page, title: string): Locator {
  return page.locator(`[title="${title}"]`);
}

/**
 * Check if a tool button is enabled
 */
export async function isToolButtonEnabled(page: Page, title: string): Promise<boolean> {
  return await getToolButton(page, title).isEnabled();
}

/**
 * Unused helper - removed to clean up public API
 * Not referenced by any test files
 */
/*
export async function isActionButtonEnabled(page: Page, ariaLabel: string): Promise<boolean> {
  return await getActionButton(page, ariaLabel).isEnabled();
}
*/
