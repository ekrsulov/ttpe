import { useEffect, type RefObject } from 'react';

export interface UseCanvasExportParams {
    saveAsPng: (selectedOnly: boolean) => void;
    svgRef: RefObject<SVGSVGElement | null>;
}

export function useCanvasExport({
    saveAsPng,
    svgRef,
}: UseCanvasExportParams): void {
    // Listen for saveAsPng events from FilePanel
    useEffect(() => {
        const handleSaveAsPng = (event: CustomEvent) => {
            const { selectedOnly } = event.detail;
            if (svgRef.current) {
                saveAsPng(selectedOnly);
            }
        };

        window.addEventListener('saveAsPng', handleSaveAsPng as EventListener);

        return () => {
            window.removeEventListener('saveAsPng', handleSaveAsPng as EventListener);
        };
    }, [saveAsPng, svgRef]);
}
