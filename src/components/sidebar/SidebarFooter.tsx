import React from 'react';
import { ArrangePanel } from '../plugins/ArrangePanel';
import { SelectPanel } from '../plugins/SelectPanel';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SidebarFooterProps {
  isArrangeExpanded: boolean;
  setIsArrangeExpanded: (expanded: boolean) => void;
}

/**
 * Fixed footer section of the sidebar containing ArrangePanel and SelectPanel
 */
export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  isArrangeExpanded,
  setIsArrangeExpanded,
}) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      zIndex: 1001,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {isArrangeExpanded && <ArrangePanel />}

      {/* Expand/Collapse Chevron for Arrange */}
      <div style={{ position: 'relative', margin: '4px 0' }}>
        {/* Horizontal line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          backgroundColor: '#dee2e6',
          zIndex: 1
        }} />

        {/* Circular button in the center */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2
        }}>
          <div
            onClick={() => setIsArrangeExpanded(!isArrangeExpanded)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              border: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title={isArrangeExpanded ? "Collapse Arrange" : "Expand Arrange"}
          >
            {isArrangeExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </div>
        </div>
      </div>

      <SelectPanel />
    </div>
  );
};