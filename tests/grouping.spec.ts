import { test, expect } from '@playwright/test';
import { waitForLoad } from './helpers';

type SerializableParentInfo = { id: string; parentId: string | null | undefined };

async function bootstrap(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await waitForLoad(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage?.clear();
  });
  await page.reload();
  await waitForLoad(page);
}

test.describe('Canvas element grouping', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrap(page);
  });

  test('creates a group from multiple selected paths', async ({ page }) => {
    const result = await page.evaluate(() => {
      const storeApi = window.useCanvasStore;
      if (!storeApi) {
        throw new Error('Canvas store is not available');
      }

      const createRectangle = (x: number, y: number) => {
        const { addElement } = storeApi.getState();
        return addElement({
          type: 'path',
          data: {
            subPaths: [[
              { type: 'M', position: { x, y } },
              { type: 'L', position: { x: x + 24, y } },
              { type: 'L', position: { x: x + 24, y: y + 24 } },
              { type: 'L', position: { x, y: y + 24 } },
              { type: 'Z' },
            ]],
            strokeWidth: 1,
            strokeColor: '#000000',
            strokeOpacity: 1,
            fillColor: '#ffffff',
            fillOpacity: 1,
          },
        });
      };

      const firstId = createRectangle(12, 14);
      const secondId = createRectangle(80, 20);

      storeApi.getState().selectElements([firstId, secondId]);
      const groupId = storeApi.getState().createGroupFromSelection('Test Group');

      const latestState = storeApi.getState();
      const group = groupId ? latestState.getGroupById(groupId) : null;

      return {
        groupId,
        selectedIds: [...latestState.selectedIds],
        groupChildIds: group?.data.childIds ?? [],
        descendantIds: groupId ? latestState.getGroupDescendants(groupId) : [],
        childParents: latestState.elements
          .filter((element) => element.id === firstId || element.id === secondId)
          .map((element) => ({ id: element.id, parentId: element.parentId })) as SerializableParentInfo[],
      };
    });

    expect(result.groupId).toBeTruthy();
    expect(result.selectedIds).toEqual([result.groupId]);
    expect(result.groupChildIds).toEqual(result.descendantIds);
    expect(result.groupChildIds).toHaveLength(2);
    expect(new Set(result.groupChildIds).size).toBe(2);
    result.childParents.forEach(({ parentId }) => {
      expect(parentId).toBe(result.groupId);
    });
  });

  test('propagates visibility and lock state from group to descendants', async ({ page }) => {
    const result = await page.evaluate(() => {
      const storeApi = window.useCanvasStore;
      if (!storeApi) {
        throw new Error('Canvas store is not available');
      }

      const { addElement, selectElements, createGroupFromSelection, toggleGroupVisibility, toggleGroupLock, getGroupDescendants, isElementHidden, isElementLocked } = storeApi.getState();

      const createRectangle = (x: number, y: number) => addElement({
        type: 'path',
        data: {
          subPaths: [[
            { type: 'M', position: { x, y } },
            { type: 'L', position: { x: x + 24, y } },
            { type: 'L', position: { x: x + 24, y: y + 24 } },
            { type: 'L', position: { x, y: y + 24 } },
            { type: 'Z' },
          ]],
          strokeWidth: 1,
          strokeColor: '#000000',
          strokeOpacity: 1,
          fillColor: '#ffffff',
          fillOpacity: 1,
        },
      });

      const parentRect = createRectangle(16, 18);
      const childRect = createRectangle(120, 40);

      selectElements([parentRect, childRect]);
      const groupId = createGroupFromSelection('Visibility Group');
      if (!groupId) {
        throw new Error('Failed to create group');
      }

      const [descendantId] = getGroupDescendants(groupId);

      toggleGroupVisibility(groupId);
      const hiddenAfterToggle = isElementHidden(descendantId);
      toggleGroupLock(groupId);
      const lockedAfterToggle = isElementLocked(descendantId);

      toggleGroupVisibility(groupId);
      toggleGroupLock(groupId);

      const hiddenAfterReset = isElementHidden(descendantId);
      const lockedAfterReset = isElementLocked(descendantId);

      return {
        hiddenAfterToggle,
        lockedAfterToggle,
        hiddenAfterReset,
        lockedAfterReset,
      };
    });

    expect(result.hiddenAfterToggle).toBe(true);
    expect(result.lockedAfterToggle).toBe(true);
    expect(result.hiddenAfterReset).toBe(false);
    expect(result.lockedAfterReset).toBe(false);
  });

  test('ungroups selected group and restores child parent references', async ({ page }) => {
    const result = await page.evaluate(() => {
      const storeApi = window.useCanvasStore;
      if (!storeApi) {
        throw new Error('Canvas store is not available');
      }

      const { addElement, selectElements, createGroupFromSelection, ungroupSelectedGroups } = storeApi.getState();

      const createRectangle = (x: number, y: number) => addElement({
        type: 'path',
        data: {
          subPaths: [[
            { type: 'M', position: { x, y } },
            { type: 'L', position: { x: x + 24, y } },
            { type: 'L', position: { x: x + 24, y: y + 24 } },
            { type: 'L', position: { x, y: y + 24 } },
            { type: 'Z' },
          ]],
          strokeWidth: 1,
          strokeColor: '#000000',
          strokeOpacity: 1,
          fillColor: '#ffffff',
          fillOpacity: 1,
        },
      });

      const firstId = createRectangle(8, 12);
      const secondId = createRectangle(150, 30);

      selectElements([firstId, secondId]);
      const groupId = createGroupFromSelection('Ungroup Group');
      if (!groupId) {
        throw new Error('Failed to create group before ungrouping');
      }

      selectElements([groupId]);
      ungroupSelectedGroups();

      const latest = storeApi.getState();

      return {
        hasGroup: latest.elements.some((element) => element.id === groupId),
        childParents: latest.elements
          .filter((element) => element.id === firstId || element.id === secondId)
          .map((element) => ({ id: element.id, parentId: element.parentId })) as SerializableParentInfo[],
        selection: [...latest.selectedIds],
      };
    });

    expect(result.hasGroup).toBe(false);
    result.childParents.forEach(({ parentId }) => {
      expect(parentId === null || parentId === undefined).toBe(true);
    });
    expect(new Set(result.selection)).toEqual(new Set(result.childParents.map((info) => info.id)));
  });
});
