export interface TapState {
    time: number;
    x: number;
    y: number;
}

export interface DoubleTapConfig {
    timeThreshold?: number;
    distanceThreshold?: number;
}

export const DEFAULT_DOUBLE_TAP_CONFIG: Required<DoubleTapConfig> = {
    timeThreshold: 300,
    distanceThreshold: 30,
};

/**
 * Checks if a tap constitutes a double tap based on the previous tap state.
 */
export const isDoubleTap = (
    currentTap: TapState,
    lastTap: TapState | null,
    config: DoubleTapConfig = {}
): boolean => {
    if (!lastTap) return false;

    const { timeThreshold, distanceThreshold } = {
        ...DEFAULT_DOUBLE_TAP_CONFIG,
        ...config,
    };

    const timeDiff = currentTap.time - lastTap.time;
    const distX = Math.abs(currentTap.x - lastTap.x);
    const distY = Math.abs(currentTap.y - lastTap.y);

    return (
        timeDiff < timeThreshold &&
        distX < distanceThreshold &&
        distY < distanceThreshold
    );
};
