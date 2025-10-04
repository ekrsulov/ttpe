import { Page, Locator } from '@playwright/test';

/**
 * Helper functions for finding elements in the action bars
 * Since buttons moved from sidebar to TopActionBar and BottomActionBar
 */

// Tool buttons that are in the TopActionBar
const TOP_ACTIONBAR_TOOLS = [
  'Select',
  'Pencil',
  'Text',
  'Shape',
  'Subpath',
  'Transform',
  'Edit',
];

// Action buttons that are in the BottomActionBar
const BOTTOM_ACTIONBAR_ACTIONS = [
  'Undo',
  'Redo',
  'Zoom In',
  'Zoom Out',
  'Delete',
  'Reset Zoom',
];

/**
 * Get a tool button from the TopActionBar by its title
 */
export function getToolButton(page: Page, title: string): Locator {
  return page.locator(`[title="${title}"]`);
}

/**
 * Get an action button from the BottomActionBar by its aria-label
 */
export function getActionButton(page: Page, ariaLabel: string): Locator {
  return page.locator(`[aria-label="${ariaLabel}"]`);
}

/**
 * Click a tool button (Select, Pencil, Text, Shape, etc.) from the TopActionBar
 */
export async function clickToolButton(page: Page, title: string): Promise<void> {
  await getToolButton(page, title).click();
}

/**
 * Click an action button (Undo, Redo, Delete, etc.) from the BottomActionBar
 */
export async function clickActionButton(page: Page, ariaLabel: string): Promise<void> {
  await getActionButton(page, ariaLabel).click();
}

/**
 * Get the canvas SVG element
 */
export function getCanvas(page: Page): Locator {
  return page.locator('svg[viewBox*="0 0"]').first();
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
 * Check if an action button is enabled
 */
export async function isActionButtonEnabled(page: Page, ariaLabel: string): Promise<boolean> {
  return await getActionButton(page, ariaLabel).isEnabled();
}
