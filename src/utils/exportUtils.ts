/**
 * Export Utilities - Centralized SVG/PNG export logic
 * Eliminates duplication between saveAsSvg and saveAsPng
 */

import type { CanvasElement, PathData, PathElement, GroupElement } from '../types';
import { commandsToString } from './path';
import { accumulateBounds } from './measurementUtils';
import { buildElementMap } from './coreHelpers';

export interface ExportOptions {
  selectedOnly: boolean;
  padding?: number;
}

export interface SerializedExport {
  svgContent: string;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

interface ExportNode {
  element: CanvasElement;
  children: ExportNode[];
}

/**
 * Escape XML attribute values
 */
function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a path element SVG string
 */
function serializePathElement(pathElement: PathElement, indent: string): string {
  const pathData = pathElement.data as PathData;
  const pathD = commandsToString(pathData.subPaths.flat());

  const effectiveStrokeColor = pathData.isPencilPath && pathData.strokeColor === 'none'
    ? '#000000'
    : pathData.strokeColor;

  let result = `${indent}<path id="${pathElement.id}" d="${pathD}" stroke="${effectiveStrokeColor}" stroke-width="${pathData.strokeWidth}" fill="${pathData.fillColor}" fill-opacity="${pathData.fillOpacity}" stroke-opacity="${pathData.strokeOpacity}"`;

  if (pathData.strokeLinecap) {
    result += ` stroke-linecap="${pathData.strokeLinecap}"`;
  }
  if (pathData.strokeLinejoin) {
    result += ` stroke-linejoin="${pathData.strokeLinejoin}"`;
  }
  if (pathData.fillRule) {
    result += ` fill-rule="${pathData.fillRule}"`;
  }
  if (pathData.strokeDasharray && pathData.strokeDasharray !== 'none') {
    result += ` stroke-dasharray="${pathData.strokeDasharray}"`;
  }

  result += ' />';

  return result;
}

/**
 * Serialize an export node (group or path) recursively
 */
function serializeNode(node: ExportNode, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);

  if (node.element.type === 'path') {
    return serializePathElement(node.element as PathElement, indent);
  }

  const groupElement = node.element as GroupElement;
  const attributes: string[] = [`id="${groupElement.id}"`];
  if (groupElement.data.name) {
    attributes.push(`data-name="${escapeAttribute(groupElement.data.name)}"`);
  }

  if (node.children.length === 0) {
    return `${indent}<g${attributes.length ? ' ' + attributes.join(' ') : ''} />`;
  }

  const childrenContent = node.children.map(child => serializeNode(child, indentLevel + 1)).join('\n');
  return `${indent}<g${attributes.length ? ' ' + attributes.join(' ') : ''}>\n${childrenContent}\n${indent}</g>`;
}

/**
 * Collect all path elements from export nodes recursively
 */
function collectPathElements(nodes: ExportNode[]): PathElement[] {
  const paths: PathElement[] = [];
  nodes.forEach(node => {
    if (node.element.type === 'path') {
      paths.push(node.element as PathElement);
    } else {
      paths.push(...collectPathElements(node.children));
    }
  });
  return paths;
}

/**
 * Build export tree respecting hierarchy
 */
function buildExportTree(
  elements: CanvasElement[],
  selectedIds: string[],
  selectedOnly: boolean
): ExportNode[] {
  const elementMap = buildElementMap(elements);

  const selectedSet = new Set(selectedIds);

  const hasSelectedAncestor = (element: CanvasElement): boolean => {
    if (!element.parentId) return false;
    let currentParentId: string | null | undefined = element.parentId;
    while (currentParentId) {
      if (selectedSet.has(currentParentId)) {
        return true;
      }
      const parent = elementMap.get(currentParentId);
      currentParentId = parent?.parentId;
    }
    return false;
  };

  const buildNode = (element: CanvasElement): ExportNode | null => {
    if (element.type === 'path') {
      return { element, children: [] };
    }

    if (element.type === 'group') {
      const childNodes = element.data.childIds
        .map(childId => elementMap.get(childId))
        .filter((child): child is CanvasElement => Boolean(child))
        .map(child => buildNode(child))
        .filter((node): node is ExportNode => Boolean(node));

      if (childNodes.length === 0 && selectedOnly) {
        return null;
      }

      return { element, children: childNodes };
    }

    return null;
  };

  let rootElements: CanvasElement[];
  if (selectedOnly) {
    rootElements = selectedIds
      .map(id => elementMap.get(id))
      .filter((element): element is CanvasElement => Boolean(element))
      .filter(element => !hasSelectedAncestor(element))
      .sort((a, b) => a.zIndex - b.zIndex);
  } else {
    rootElements = elements
      .filter(element => !element.parentId)
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  return rootElements
    .map(element => buildNode(element))
    .filter((node): node is ExportNode => Boolean(node));
}

/**
 * Centralized function to serialize paths for export
 * Used by both saveAsSvg and saveAsPng to ensure consistency
 * 
 * @param elements - All canvas elements
 * @param selectedIds - Currently selected element IDs
 * @param options - Export options (selectedOnly, padding)
 * @returns Serialized SVG content and bounds
 */
export function serializePathsForExport(
  elements: CanvasElement[],
  selectedIds: string[],
  options: ExportOptions
): SerializedExport | null {
  const { selectedOnly, padding = 0 } = options;

  // Build export tree respecting hierarchy
  const exportNodes = buildExportTree(elements, selectedIds, selectedOnly);
  const pathElements = collectPathElements(exportNodes);

  if (pathElements.length === 0) {
    console.warn('No elements to export');
    return null;
  }

  // Calculate combined bounds using centralized logic
  // Extract all command sets for accumulation
  const commandsList = pathElements.map(pathElement => {
    const pathData = pathElement.data as PathData;
    return pathData.subPaths.flat();
  });

  // Use the first path's stroke width as reference (they should be consistent for export)
  const referenceStrokeWidth = pathElements.length > 0 
    ? ((pathElements[0].data as PathData).strokeWidth || 0) 
    : 0;

  const bounds = accumulateBounds(commandsList, referenceStrokeWidth, 1);

  if (!bounds) {
    console.warn('Could not calculate bounds for export');
    return null;
  }

  let { minX, minY, maxX, maxY } = bounds;

  // Apply padding
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;

  // Serialize all nodes to SVG markup
  const serializedElements = exportNodes.map(node => serializeNode(node, 1)).join('\n');

  // Build complete SVG document
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svgContent += `<svg width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  if (serializedElements) {
    svgContent += `\n${serializedElements}\n`;
  }

  svgContent += `</svg>`;

  return {
    svgContent,
    bounds: { minX, minY, maxX, maxY, width, height }
  };
}

/**
 * Helper to download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert SVG content to PNG and download
 */
function convertSvgToPngAndDownload(
  svgContent: string,
  bounds: SerializedExport['bounds'],
  filename: string
): void {
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get canvas context');
    return;
  }

  canvas.width = bounds.width;
  canvas.height = bounds.height;

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Could not create PNG blob');
        return;
      }
      downloadBlob(blob, filename);
    }, 'image/png');
  };
  img.onerror = () => {
    console.error('Failed to load SVG image');
  };
  img.src = svgDataUrl;
}

/**
 * Unified export function for both SVG and PNG formats
 * Eliminates duplication between saveAsSvg and saveAsPng
 */
export function exportSelection(
  format: 'svg' | 'png',
  elements: CanvasElement[],
  selectedIds: string[],
  documentName: string,
  selectedOnly: boolean = false
): void {
  // Validation
  if (elements.length === 0) {
    console.warn('No elements to export');
    return;
  }

  // Serialize paths
  const result = serializePathsForExport(
    elements,
    selectedIds,
    { selectedOnly, padding: selectedOnly ? 0 : 20 }
  );

  if (!result) {
    return;
  }

  const { svgContent, bounds } = result;
  const sanitizedName = documentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  // Export based on format
  if (format === 'svg') {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    downloadBlob(blob, `${sanitizedName}.svg`);
  } else if (format === 'png') {
    convertSvgToPngAndDownload(svgContent, bounds, `${sanitizedName}.png`);
  }
}
