import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { VectorSquare } from 'lucide-react';

export const TransformationPanel: React.FC = () => {
  const { 
    selectedIds, 
    selectedSubpaths, 
    transformation, 
    updateTransformationState,
    isWorkingWithSubpaths
  } = useCanvasStore();
  const { showCoordinates, showRulers, showCenterPoint, showRotateHandlers, showSideHandlers } = transformation;

  const isSubpathMode = isWorkingWithSubpaths();
  const hasSelection = isSubpathMode ? selectedSubpaths.length > 0 : selectedIds.length > 0;
  const selectionText = isSubpathMode ? 'subpath' : 'element';
  const selectionCount = isSubpathMode ? selectedSubpaths.length : selectedIds.length;

  return (
    <div style={{ backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <VectorSquare size={16} style={{ marginRight: '6px', color: '#666' }} />
          <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>Transform</span>
          {isSubpathMode && (
            <span style={{ fontSize: '10px', color: '#8b5cf6', marginLeft: '4px', backgroundColor: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>
              Subpath
            </span>
          )}
        </div>
      </div>

      {!hasSelection ? (
        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
          Select {isSubpathMode ? 'a subpath' : 'an element'} to transform
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Selection info */}
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
            {selectionCount} {selectionText}{selectionCount !== 1 ? 's' : ''} selected
          </div>

          {/* Show Coordinates Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="showCoordinates"
              checked={showCoordinates}
              onChange={(e) => updateTransformationState({ showCoordinates: e.target.checked })}
              style={{ marginRight: '6px' }}
            />
            <label htmlFor="showCoordinates" style={{ fontSize: '11px', color: '#666', cursor: 'pointer' }}>
              Coordinates
            </label>
          </div>

          {/* Show Rulers Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="showRulers"
              checked={showRulers}
              onChange={(e) => updateTransformationState({ showRulers: e.target.checked })}
              style={{ marginRight: '6px' }}
            />
            <label htmlFor="showRulers" style={{ fontSize: '11px', color: '#666', cursor: 'pointer' }}>
              Rulers
            </label>
          </div>

          {/* Center Point Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="showCenterPoint"
              checked={showCenterPoint}
              onChange={(e) => updateTransformationState({ showCenterPoint: e.target.checked })}
              style={{ marginRight: '6px' }}
            />
            <label htmlFor="showCenterPoint" style={{ fontSize: '11px', color: '#666', cursor: 'pointer' }}>
              Center Point
            </label>
          </div>

          {/* Rotate Handlers Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="showRotateHandlers"
              checked={showRotateHandlers}
              onChange={(e) => updateTransformationState({ showRotateHandlers: e.target.checked })}
              style={{ marginRight: '6px' }}
            />
            <label htmlFor="showRotateHandlers" style={{ fontSize: '11px', color: '#666', cursor: 'pointer' }}>
              Rotate Handlers
            </label>
          </div>

          {/* Side Handlers Toggle */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              id="showSideHandlers"
              checked={showSideHandlers}
              onChange={(e) => updateTransformationState({ showSideHandlers: e.target.checked })}
              style={{ marginRight: '6px' }}
            />
            <label htmlFor="showSideHandlers" style={{ fontSize: '11px', color: '#666', cursor: 'pointer' }}>
              Side Handlers
            </label>
          </div>

          {/* Debug Test Button */}
          <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
            <button
              onClick={() => {
                const { addElement } = useCanvasStore.getState();
                addElement({
                  type: 'path',
                  data: {
                    d: 'M 58 165 C 58 165, 58 194, 58 228 L 58 290 L 70 290 L 82 290 L 82 250 L 82 210 L 87 218 C 90 223, 101 241, 112 258 L 132 290 L 145 290 L 158 290 L 158 227 L 157 165 L 145 165 L 134 165 L 133 206 L 133 246 L 125 233 C 120 225, 109 207, 100 192 C 91 178, 83 166, 83 165 C 81 164, 59 164, 59 165 Z M 206 199 C 192 203, 183 213, 178 228 C 176 236, 176 255, 179 263 C 181 270, 186 279, 191 283 C 204 293, 226 295, 242 287 C 249 283, 253 279, 257 271 C 259 267, 260 265, 259 265 C 257 264, 236 261, 236 261 C 236 261, 235 263, 233 265 C 231 270, 228 273, 223 273 C 212 275, 202 266, 202 255 L 202 251 L 232 251 L 261 251 L 261 245 C 261 226, 253 210, 241 203 C 232 198, 216 196, 206 199 Z M 228 218 C 231 221, 235 225, 236 230 C 238 237, 238 237, 219 237 L 202 237 L 202 234 C 202 227, 208 218, 214 217 C 216 217, 218 216, 218 216 C 220 216, 225 217, 228 218 Z M 269 200 C 269 201, 273 214, 293 276 L 297 290 L 309 290 C 316 290, 321 290, 321 290 C 321 289, 325 274, 330 254 C 332 249, 333 243, 334 241 C 334 238, 335 236, 336 235 C 336 235, 336 235, 336 235 C 336 236, 338 241, 339 246 C 341 252, 344 262, 345 268 C 347 275, 349 282, 350 285 L 351 290 L 363 290 C 374 290, 374 290, 375 288 C 376 285, 386 254, 398 219 C 401 209, 403 200, 403 200 C 403 200, 398 199, 391 199 L 379 199 L 371 227 C 367 242, 363 255, 363 256 C 362 256, 359 243, 355 228 L 348 199 L 336 199 L 324 199 L 322 206 C 321 210, 318 223, 315 235 C 312 247, 309 256, 309 256 C 308 256, 305 243, 300 228 L 292 200 L 281 199 C 274 199, 269 200, 269 200 Z',
                    strokeWidth: 2,
                    strokeColor: '#000000',
                    strokeOpacity: 1,
                    fillColor: 'none',
                    fillOpacity: 1,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                  }
                });
              }}
              style={{
                fontSize: '10px',
                padding: '4px 8px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Add Test Path (4 subpaths)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};