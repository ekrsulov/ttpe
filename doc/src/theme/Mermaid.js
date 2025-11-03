import React, { useEffect } from 'react';
import Mermaid from '@theme-original/Mermaid';

export default function MermaidWrapper(props) {
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Dynamically import svg-pan-zoom only on client-side
    import('svg-pan-zoom').then(({ default: svgPanZoom }) => {
      // Wait for mermaid to render
      const timer = setTimeout(() => {
        // Find all mermaid SVG elements
        const mermaidSvgs = document.querySelectorAll('.docusaurus-mermaid-container svg');
        
        mermaidSvgs.forEach((svg) => {
          // Skip if already initialized
          if (svg.hasAttribute('data-svg-pan-zoom-initialized')) {
            return;
          }
          
          // Mark as initialized
          svg.setAttribute('data-svg-pan-zoom-initialized', 'true');
          
          try {
            // Get the actual dimensions of the SVG content
            const bbox = svg.getBBox();
            const viewBox = svg.getAttribute('viewBox');
            
            // Calculate actual dimensions
            let width = bbox.width;
            let height = bbox.height;
            
            if (viewBox) {
              const parts = viewBox.split(/\s+|,/);
              width = parseFloat(parts[2]) || width;
              height = parseFloat(parts[3]) || height;
            }
            
            // Validate dimensions - skip if invalid
            if (!width || !height || width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
              console.warn('Invalid SVG dimensions, skipping pan-zoom initialization', { width, height });
              return;
            }
            
            // Set the container height based on SVG aspect ratio
            const container = svg.closest('.docusaurus-mermaid-container');
            if (container) {
              const containerWidth = container.clientWidth - 32; // Account for padding
              
              // Validate container width
              if (containerWidth <= 0) {
                console.warn('Invalid container width, skipping pan-zoom initialization');
                return;
            }
            
            const aspectRatio = height / width;
            const calculatedHeight = containerWidth * aspectRatio;
            
            container.style.height = `${Math.max(calculatedHeight, 200)}px`;
          }
          
          // Ensure proper viewBox
          if (!viewBox) {
            svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${width} ${height}`);
          }
          
          // Remove dimension attributes to make it responsive
          svg.removeAttribute('width');
          svg.removeAttribute('height');
          
          // Set proper SVG attributes
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svg.style.width = '100%';
          svg.style.height = '100%';
          
          // Initialize pan-zoom
          const panZoomInstance = svgPanZoom(svg, {
            zoomEnabled: true,
            controlIconsEnabled: true,
            fit: false, // Don't fit immediately
            center: false, // Don't center immediately
            minZoom: 0.5,
            maxZoom: 10,
            zoomScaleSensitivity: 0.3,
            dblClickZoomEnabled: true,
            mouseWheelZoomEnabled: true,
            preventMouseEventsDefault: true,
          });
          
          // Ensure proper initial fit with delay and error handling
          setTimeout(() => {
            try {
              panZoomInstance.resize();
              panZoomInstance.fit();
              panZoomInstance.center();
            } catch (fitError) {
              console.warn('Failed to fit/center SVG:', fitError);
              // Try to at least reset the zoom
              try {
                panZoomInstance.resetZoom();
              } catch (resetError) {
                console.warn('Failed to reset zoom:', resetError);
              }
            }
          }, 100);
        } catch (error) {
          console.warn('Failed to initialize svg-pan-zoom:', error);
          // Remove the initialization marker so it can be retried if needed
          svg.removeAttribute('data-svg-pan-zoom-initialized');
        }
      });
    }, 500);
    }).catch(error => {
      console.warn('Failed to load svg-pan-zoom:', error);
    });
  }, [props.value]);

  return <Mermaid {...props} />;
}
