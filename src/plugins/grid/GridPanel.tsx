import React from 'react';
import { VStack, Select, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Grid3X3 } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { PanelToggleGroup } from '../../components/ui/PanelToggleGroup';
import { SliderControl } from '../../components/ui/SliderControl';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';
import type { GridType } from './slice';

const GRID_TYPE_OPTIONS: Array<{ value: GridType; label: string }> = [
  { value: 'square', label: 'Square' },
  { value: 'dots', label: 'Dots' },
  { value: 'isometric', label: 'Isometric' },
  { value: 'triangular', label: 'Triangular' },
  { value: 'hexagonal', label: 'Hexagonal' },
  { value: 'polar', label: 'Polar' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'parametric', label: 'Parametric Lattice' },
];

const GridPanelComponent: React.FC = () => {
  // Only subscribe to grid state
  const grid = useCanvasStore(state => state.grid);
  const updateGridState = useCanvasStore(state => state.updateGridState);

  // Use shared hook for toggle handlers
  const { createToggleHandler } = usePanelToggleHandlers(updateGridState ?? (() => {}));
  const handleToggleGrid = createToggleHandler('enabled');
  const handleToggleSnap = createToggleHandler('snapEnabled');
  const handleToggleRulers = createToggleHandler('showRulers');

  const handleSpacingChange = (value: number) => {
    updateGridState?.({ spacing: value });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateGridState?.({ type: e.target.value as GridType });
  };

  const handlePolarDivisionsChange = (value: number) => {
    updateGridState?.({ polarDivisions: value });
  };

  const handleHexOrientationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateGridState?.({ hexOrientation: e.target.value as 'pointy' | 'flat' });
  };

  const handleOpacityChange = (value: number) => {
    updateGridState?.({ opacity: value });
  };

  const handleEmphasizeChange = (value: number) => {
    updateGridState?.({ emphasizeEvery: value });
  };

  // Parametric warp handlers
  const handleWarpKindChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const kind = e.target.value as 'sine2d' | 'perlin2d' | 'radial';
    updateGridState?.({
      parametricWarp: {
        ...(grid?.parametricWarp ?? { ampX: 18, ampY: 18, freqX: 3, freqY: 2, phaseX: 0, phaseY: 1.047, seed: 0 }),
        kind,
      },
    });
  };

  const handleAmpXChange = (value: number) => {
    updateGridState?.({
      parametricWarp: {
        ...(grid?.parametricWarp ?? { kind: 'sine2d', ampY: 18, freqX: 3, freqY: 2, phaseX: 0, phaseY: 1.047, seed: 0 }),
        ampX: value,
      },
    });
  };

  const handleAmpYChange = (value: number) => {
    updateGridState?.({
      parametricWarp: {
        ...(grid?.parametricWarp ?? { kind: 'sine2d', ampX: 18, freqX: 3, freqY: 2, phaseX: 0, phaseY: 1.047, seed: 0 }),
        ampY: value,
      },
    });
  };

  const handleFreqXChange = (value: number) => {
    updateGridState?.({
      parametricWarp: {
        ...(grid?.parametricWarp ?? { kind: 'sine2d', ampX: 18, ampY: 18, freqY: 2, phaseX: 0, phaseY: 1.047, seed: 0 }),
        freqX: value,
      },
    });
  };

  const handleFreqYChange = (value: number) => {
    updateGridState?.({
      parametricWarp: {
        ...(grid?.parametricWarp ?? { kind: 'sine2d', ampX: 18, ampY: 18, freqX: 3, phaseX: 0, phaseY: 1.047, seed: 0 }),
        freqY: value,
      },
    });
  };

  const handleParametricStepYChange = (value: number) => {
    updateGridState?.({ parametricStepY: value });
  };

  const gridType = grid?.type ?? 'square';
  const showPolarSettings = gridType === 'polar';
  const showHexSettings = gridType === 'hexagonal';
  const showEmphasize = gridType === 'square' || gridType === 'isometric' || gridType === 'triangular';
  const showParametricSettings = gridType === 'parametric';

  return (
    <Panel icon={<Grid3X3 size={16} />} title="Grid">
      <VStack spacing={2} align="stretch">
        {/* Grid Type Selector */}
        <VStack spacing={1} align="stretch">
          <Text fontSize="12px" color="gray.600" fontWeight="500">
            Type
          </Text>
          <Select
            value={gridType}
            onChange={handleTypeChange}
            size="sm"
            fontSize="12px"
            isDisabled={!(grid?.enabled ?? false)}
          >
            {GRID_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </VStack>

        {/* Grid toggles */}
        <PanelToggleGroup
          toggles={[
            {
              label: 'Show',
              isChecked: grid?.enabled ?? false,
              onChange: handleToggleGrid,
            },
            {
              label: 'Snap',
              isChecked: grid?.snapEnabled ?? false,
              onChange: handleToggleSnap,
              isDisabled: !(grid?.enabled ?? false),
            },
            {
              label: 'Rulers',
              isChecked: grid?.showRulers ?? false,
              onChange: handleToggleRulers,
              isDisabled: !(grid?.enabled ?? false),
            },
          ]}
        />

        {/* Grid Spacing Slider */}
        <SliderControl
          label="Spacing"
          value={grid?.spacing ?? 20}
          min={5}
          max={100}
          step={5}
          onChange={handleSpacingChange}
          formatter={(value) => `${value}px`}
          title="Grid spacing in pixels"
        />

        {/* Polar-specific settings */}
        {showPolarSettings && (
          <SliderControl
            label="Divisions"
            value={grid?.polarDivisions ?? 12}
            min={4}
            max={36}
            step={1}
            onChange={handlePolarDivisionsChange}
            formatter={(value) => value.toString()}
            title="Number of radial divisions"
          />
        )}

        {/* Hexagonal-specific settings */}
        {showHexSettings && (
          <VStack spacing={1} align="stretch">
            <Text fontSize="12px" color="gray.600" fontWeight="500">
              Orientation
            </Text>
            <Select
              value={grid?.hexOrientation ?? 'pointy'}
              onChange={handleHexOrientationChange}
              size="sm"
              fontSize="12px"
            >
              <option value="pointy">Pointy Top</option>
              <option value="flat">Flat Top</option>
            </Select>
          </VStack>
        )}

        {/* Opacity Slider */}
        <SliderControl
          label="Opacity"
          value={grid?.opacity ?? 0.3}
          min={0.1}
          max={1}
          step={0.1}
          onChange={handleOpacityChange}
          formatter={(value) => `${Math.round(value * 100)}%`}
          title="Grid opacity"
        />

        {/* Emphasize Every N Lines */}
        {showEmphasize && (
          <SliderControl
            label="Emphasize"
            value={grid?.emphasizeEvery ?? 0}
            min={0}
            max={10}
            step={1}
            onChange={handleEmphasizeChange}
            formatter={(value) => value === 0 ? 'Off' : `Every ${value}`}
            title="Emphasize every Nth line (0 = disabled)"
          />
        )}

        {/* Parametric-specific settings */}
        {showParametricSettings && (
          <>
            <VStack spacing={1} align="stretch">
              <Text fontSize="12px" color="gray.600" fontWeight="500">
                Warp Type
              </Text>
              <Select
                value={grid?.parametricWarp?.kind ?? 'sine2d'}
                onChange={handleWarpKindChange}
                size="sm"
                fontSize="12px"
              >
                <option value="sine2d">Sine Wave 2D</option>
                <option value="radial">Radial / Swirl</option>
                <option value="perlin2d">Perlin Noise</option>
              </Select>
            </VStack>

            <SliderControl
              label="Step Y"
              value={grid?.parametricStepY ?? 20}
              min={5}
              max={100}
              step={5}
              onChange={handleParametricStepYChange}
              formatter={(value) => `${value}px`}
              title="Vertical grid spacing"
            />

            <SliderControl
              label="Amplitude X"
              value={grid?.parametricWarp?.ampX ?? 18}
              min={0}
              max={50}
              step={1}
              onChange={handleAmpXChange}
              formatter={(value) => `${value}px`}
              title="Horizontal warp amplitude"
            />

            <SliderControl
              label="Amplitude Y"
              value={grid?.parametricWarp?.ampY ?? 18}
              min={0}
              max={50}
              step={1}
              onChange={handleAmpYChange}
              formatter={(value) => `${value}px`}
              title="Vertical warp amplitude"
            />

            <SliderControl
              label="Frequency X"
              value={grid?.parametricWarp?.freqX ?? 3}
              min={1}
              max={10}
              step={0.5}
              onChange={handleFreqXChange}
              formatter={(value) => value.toString()}
              title="Horizontal warp frequency"
            />

            <SliderControl
              label="Frequency Y"
              value={grid?.parametricWarp?.freqY ?? 2}
              min={1}
              max={10}
              step={0.5}
              onChange={handleFreqYChange}
              formatter={(value) => value.toString()}
              title="Vertical warp frequency"
            />
          </>
        )}
      </VStack>
    </Panel>
  );
};

export default GridPanelComponent;
