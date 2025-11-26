import type { Command, Point } from '../../../types';
import type { PenPath, PenAnchorPoint } from '../types';

/**
 * Convert a PenPath to an array of PathData Commands
 */
export function penPathToCommands(path: PenPath): Command[] {
    if (!path.anchors.length) {
        return [];
    }

    const commands: Command[] = [];
    const anchors = path.anchors;

    // Start with MoveTo command at first anchor
    commands.push({
        type: 'M',
        position: { x: anchors[0].position.x, y: anchors[0].position.y },
    });

    // Process each subsequent anchor
    for (let i = 1; i < anchors.length; i++) {
        const prevAnchor = anchors[i - 1];
        const currAnchor = anchors[i];

        const segmentCommands = segmentToCommands(prevAnchor, currAnchor);
        commands.push(...segmentCommands);
    }

    // If path is closed, add closing segment and Z command
    if (path.closed && anchors.length > 2) {
        const lastAnchor = anchors[anchors.length - 1];
        const firstAnchor = anchors[0];

        const closingSegmentCommands = segmentToCommands(lastAnchor, firstAnchor);
        commands.push(...closingSegmentCommands);

        commands.push({ type: 'Z' });
    }

    return commands;
}

/**
 * Convert PathData commands back to a PenPath for editing
 */
export function pathDataToPenPath(commands: Command[], pathId: string): PenPath {
    const anchors: PenAnchorPoint[] = [];
    let isClosed = false;

    if (!commands || commands.length === 0) {
        return {
            anchors: [],
            closed: false,
            tempId: pathId,
        };
    }

    // Process commands
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];

        if (cmd.type === 'M') {
            // Start of path
            anchors.push({
                id: `${pathId}-anchor-${anchors.length}`,
                position: { ...cmd.position },
                type: 'corner', // Default, updated based on handles
            });
        } else if (cmd.type === 'L') {
            // Line to - adds a corner anchor
            anchors.push({
                id: `${pathId}-anchor-${anchors.length}`,
                position: { ...cmd.position },
                type: 'corner',
            });
        } else if (cmd.type === 'C') {
            // Curve to - adds an anchor with incoming handle
            // The previous anchor gets an outgoing handle
            const prevAnchor = anchors[anchors.length - 1];
            const currentAnchorPos = cmd.position;

            // Update previous anchor's outHandle
            // cp1 is relative to previous anchor in PenPath, but absolute in Command
            if (cmd.controlPoint1) {
                prevAnchor.outHandle = {
                    x: cmd.controlPoint1.x - prevAnchor.position.x,
                    y: cmd.controlPoint1.y - prevAnchor.position.y,
                };
                // If previous anchor has outHandle, it might be smooth or cusp
                // We'll determine type later or assume cusp/smooth based on collinearity
            }

            // Create current anchor with inHandle
            // cp2 is relative to current anchor in PenPath, but absolute in Command
            const newAnchor: PenAnchorPoint = {
                id: `${pathId}-anchor-${anchors.length}`,
                position: { ...currentAnchorPos },
                type: 'corner', // Will update
            };

            if (cmd.controlPoint2) {
                newAnchor.inHandle = {
                    x: cmd.controlPoint2.x - currentAnchorPos.x,
                    y: cmd.controlPoint2.y - currentAnchorPos.y,
                };
            }

            anchors.push(newAnchor);
        } else if (cmd.type === 'Z') {
            isClosed = true;
            // If closed, the last segment connects back to the first anchor
            // We might need to update the first anchor's inHandle and last anchor's outHandle
            // if the closing segment was a curve.
            // However, Z usually just closes with a straight line unless preceded by a C?
            // In SVG, Z is straight line. To close with curve, you use C to start point.
            // But if the last command was C to start point, then Z is redundant or just closes.
            // Let's assume Z implies straight line closure for now, unless we handle C-to-start logic.
        }
    }

    // Post-process anchors to determine types (smooth vs corner vs cusp)
    for (const anchor of anchors) {
        if (anchor.inHandle && anchor.outHandle) {
            // Check collinearity
            if (areHandlesCollinear(anchor.inHandle, anchor.outHandle)) {
                anchor.type = 'smooth';
            } else {
                anchor.type = 'cusp';
            }
        } else if (anchor.inHandle || anchor.outHandle) {
            // One handle usually means smooth transition to straight, or cusp
            // For simplicity, let's call it smooth if it has handles, or corner if not?
            // Actually, mixed straight/curve usually implies corner or cusp behavior at the join
            // unless the handle is collinear with the straight segment (unlikely/rare).
            anchor.type = 'corner'; // Or 'cusp' to allow independent editing
        } else {
            anchor.type = 'corner';
        }
    }

    return {
        anchors,
        closed: isClosed,
        tempId: pathId,
    };
}

/**
 * Convert a segment between two anchors to Command(s)
 */
function segmentToCommands(from: PenAnchorPoint, to: PenAnchorPoint): Command[] {
    // Determine if segment is curved based on handle presence
    const hasCurve = from.outHandle || to.inHandle;

    if (!hasCurve) {
        // Straight segment - use LineTo
        return [{
            type: 'L',
            position: { x: to.position.x, y: to.position.y },
        }];
    }

    // Curved segment - use CurveTo with cubic Bézier
    // Calculate absolute positions of control points
    const cp1 = from.outHandle
        ? {
            x: from.position.x + from.outHandle.x,
            y: from.position.y + from.outHandle.y,
        }
        : { x: from.position.x, y: from.position.y }; // Fallback to anchor position

    const cp2 = to.inHandle
        ? {
            x: to.position.x + to.inHandle.x,
            y: to.position.y + to.inHandle.y,
        }
        : { x: to.position.x, y: to.position.y }; // Fallback to anchor position

    return [{
        type: 'C',
        controlPoint1: {
            ...cp1,
            commandIndex: -1, // These will be assigned when adding to element
            pointIndex: 0,
            anchor: from.position,
            isControl: true,
        },
        controlPoint2: {
            ...cp2,
            commandIndex: -1,
            pointIndex: 1,
            anchor: to.position,
            isControl: true,
        },
        position: { x: to.position.x, y: to.position.y },
    }];
}

/**
 * Calculate symmetric handle for smooth anchor points
 * Given an anchor position and one handle, calculate the opposite handle
 */
export function calculateSymmetricHandle(_anchorPos: Point, existingHandle: Point): Point {
    return {
        x: -existingHandle.x,
        y: -existingHandle.y,
    };
}

/**
 * Check if two handles are collinear (for smooth anchor determination)
 */
export function areHandlesCollinear(handle1: Point, handle2: Point, tolerance = 0.01): boolean {
    // Handles should be opposite directions with same magnitude for perfect smooth
    // But we'll allow some tolerance for near-collinear
    const mag1 = Math.sqrt(handle1.x ** 2 + handle1.y ** 2);
    const mag2 = Math.sqrt(handle2.x ** 2 + handle2.y ** 2);

    if (mag1 === 0 || mag2 === 0) return true; // Zero-length handles are considered collinear

    // Normalize vectors
    const norm1 = { x: handle1.x / mag1, y: handle1.y / mag1 };
    const norm2 = { x: handle2.x / mag2, y: handle2.y / mag2 };

    // Check if they point in opposite directions (dot product should be close to -1)
    const dotProduct = norm1.x * norm2.x + norm1.y * norm2.y;

    return Math.abs(dotProduct + 1) < tolerance;
}

/**
 * Constrain angle to 45-degree increments for Shift key constraint
 */
export function constrainAngleTo45Degrees(from: Point, to: Point): Point {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return to;

    // Calculate angle in radians
    let angle = Math.atan2(dy, dx);

    // Round to nearest 45 degrees (π/4 radians)
    const increment = Math.PI / 4;
    angle = Math.round(angle / increment) * increment;

    // Calculate new position
    return {
        x: from.x + distance * Math.cos(angle),
        y: from.y + distance * Math.sin(angle),
    };
}
