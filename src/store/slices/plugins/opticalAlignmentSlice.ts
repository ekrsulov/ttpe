import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';
import type { AlignmentResult } from '../../../utils/opticalAlignmentUtils';
import { detectContainer, prepareContentInfo, calculateOpticalAlignment } from '../../../utils/opticalAlignmentUtils';
import { translateCommands } from '../../../utils/transformationUtils';
import { measurePath } from '../../../utils/measurementUtils';
import type { PathData, CanvasElement, SubPath } from '../../../types';
import type { TrainingSample } from '../../../utils/mlAlignmentUtils';
import * as tf from '@tensorflow/tfjs';

// Type for alignment offset
interface AlignmentOffset {
  elementId: string;
  deltaX: number;
  deltaY: number;
}

export interface OpticalAlignmentState {
  // Current alignment result
  currentAlignment: AlignmentResult | null;
  
  // Visualization options
  showMathematicalCenter: boolean;
  showOpticalCenter: boolean;
  showMetrics: boolean;
  showDistanceRules: boolean;
  showAllDistanceRules: boolean;
  
  // Distance rules filters
  dxFilter: number;
  dyFilter: number;
  
  // ML Model state
  mlModel: tf.LayersModel | null;
  trainingSamples: TrainingSample[];
  isTraining: boolean;
  trainingProgress: number;
  trainingLoss: number | null;
  useMlPrediction: boolean;
}

export interface OpticalAlignmentActions {
  // Alignment operations
  calculateAlignment: () => void;
  applyAlignment: () => void;
  centerAllPairsMathematically: () => void;
  previewAlignment: () => void;
  resetAlignment: () => void;
  
  // Visualization
  toggleMathematicalCenter: () => void;
  toggleOpticalCenter: () => void;
  toggleMetrics: () => void;
  toggleDistanceRules: () => void;
  toggleAllDistanceRules: () => void;
  setDxFilter: (value: number) => void;
  setDyFilter: (value: number) => void;
  
  // Validation
  canPerformOpticalAlignment: () => boolean;
  getAlignmentValidationMessage: () => string | null;
  
  // ML operations
  addTrainingSample: () => Promise<void>;
  addAllTrainingSamples: () => Promise<void>; // NEW: Add all valid pairs
  applyMLToAllPairs: () => Promise<number>; // NEW: Apply ML alignment to all pairs, returns count
  removeTrainingSample: (id: string) => void;
  clearTrainingSamples: () => void;
  trainMLModel: () => Promise<void>;
  applyMLPrediction: () => Promise<void>;
  saveMLModel: (name?: string) => Promise<void>;
  loadMLModel: (name?: string) => Promise<void>;
  loadPretrainedMLModel: () => Promise<void>; // NEW: Load pre-trained model from server
  downloadMLModel: (name?: string) => Promise<void>;
  uploadMLModel: (jsonFile: File, weightsFile: File) => Promise<void>;
  deleteMLModel: (name?: string) => Promise<void>;
  toggleMLPrediction: () => void;
}

export type OpticalAlignmentSlice = OpticalAlignmentState & OpticalAlignmentActions;

// Helper to validate and get container/content info
interface ValidatedAlignment {
  containerInfo: NonNullable<ReturnType<typeof detectContainer>>;
  contentInfo: NonNullable<ReturnType<typeof prepareContentInfo>>;
}

function getValidatedAlignmentData(state: CanvasStore): ValidatedAlignment | null {
  const containerInfo = detectContainer(state.elements, state.selectedIds);
  if (!containerInfo) return null;

  const contentInfo = prepareContentInfo(state.elements, state.selectedIds, containerInfo);
  if (contentInfo.length === 0) return null;

  return { containerInfo, contentInfo };
}

export const createOpticalAlignmentSlice: StateCreator<
  CanvasStore,
  [],
  [],
  OpticalAlignmentSlice
> = (set, get) => ({
  // Initial state
  currentAlignment: null,
  showMathematicalCenter: true,
  showOpticalCenter: true,
  showMetrics: false,
  showDistanceRules: false,
  showAllDistanceRules: false,
  
  // Distance rules filters
  dxFilter: 0,
  dyFilter: 0,
  
  // ML state
  mlModel: null,
  trainingSamples: [],
  isTraining: false,
  trainingProgress: 0,
  trainingLoss: null,
  useMlPrediction: false,

  // Alignment operations
  calculateAlignment: () => {
    const state = get() as CanvasStore;
    
    if (!get().canPerformOpticalAlignment()) {
      set(() => ({ currentAlignment: null }));
      return;
    }

    const validated = getValidatedAlignmentData(state);
    if (!validated) {
      set(() => ({ currentAlignment: null }));
      return;
    }

    // Calculate optimal alignment automatically
    const alignmentResult = calculateOpticalAlignment(
      validated.containerInfo,
      validated.contentInfo
    );

    set(() => ({ currentAlignment: alignmentResult }));
  },

  applyAlignment: () => {
    const currentAlignment = get().currentAlignment;
    if (!currentAlignment) return;

    const state = get() as CanvasStore;

    // Apply offsets to elements (simplified - only full elements, no subpaths)
    currentAlignment.offsets.forEach((offset: AlignmentOffset) => {
      const elementIndex = state.elements.findIndex((el: CanvasElement) => el.id === offset.elementId);
      if (elementIndex !== -1) {
        const element = state.elements[elementIndex];
        if (element.type === 'path') {
          const pathData = element.data as PathData;
          
          const translatedSubPaths = pathData.subPaths.map((subpath: SubPath) =>
            translateCommands(subpath, offset.deltaX, offset.deltaY)
          );
          
          // Check if content will overflow after alignment
          const translatedBounds = measurePath(translatedSubPaths, pathData.strokeWidth, 1);
          const containerBounds = currentAlignment.container.bounds;
          const willOverflow = 
            translatedBounds.minX < containerBounds.minX ||
            translatedBounds.minY < containerBounds.minY ||
            translatedBounds.maxX > containerBounds.maxX ||
            translatedBounds.maxY > containerBounds.maxY;
          
          if (willOverflow) {
            const originalBounds = measurePath(pathData.subPaths, pathData.strokeWidth, 1);
            console.warn('⚠️ OVERFLOW DETECTED AFTER ML ALIGNMENT');
            console.group('Overflow Analysis');
            console.log('Container ID:', currentAlignment.container.elementId);
            console.log('Content ID:', offset.elementId);
            console.log('Container Bounds:', containerBounds);
            console.log('Original Content Bounds:', originalBounds);
            console.log('Translated Content Bounds:', translatedBounds);
            console.log('Container Center:', currentAlignment.container.center);
            console.log('Applied Delta:', { x: offset.deltaX, y: offset.deltaY });
            console.log('Content SubPaths count:', pathData.subPaths.length);
            console.log('Content SubPaths details:', pathData.subPaths.map((sp, i) => ({
              index: i,
              commands: sp.length,
              firstCommand: sp[0],
              lastCommand: sp[sp.length - 1]
            })));
            console.log('Overflow amounts:', {
              left: containerBounds.minX - translatedBounds.minX,
              top: containerBounds.minY - translatedBounds.minY,
              right: translatedBounds.maxX - containerBounds.maxX,
              bottom: translatedBounds.maxY - containerBounds.maxY
            });
            console.groupEnd();
          }
          
          state.updateElement(offset.elementId, {
            data: {
              ...pathData,
              subPaths: translatedSubPaths
            }
          });
        }
      }
    });

    set(() => ({ currentAlignment: null }));
  },

  centerAllPairsMathematically: () => {
    const state = get() as CanvasStore;
    const elements = state.elements;
    
    // Find all valid container-content pairs
    const pairsToCenter: Array<{ containerId: string; contentId: string }> = [];
    
    for (let i = 0; i < elements.length; i++) {
      for (let j = 0; j < elements.length; j++) {
        if (i === j) continue;

        const containerEl = elements[i];
        const contentEl = elements[j];

        if (containerEl.type !== 'path' || contentEl.type !== 'path') continue;

        // Try this pair
        const selectedIds = [containerEl.id, contentEl.id];
        const containerInfo = detectContainer(elements, selectedIds);

        if (containerInfo && containerInfo.elementId === containerEl.id) {
          const contentInfo = prepareContentInfo(elements, selectedIds, containerInfo);

          if (contentInfo.length > 0) {
            // Check if content is contained
            const containerBounds = containerInfo.bounds;
            const contentBounds = contentInfo[0].geometry.bounds;
            const isContained =
              contentBounds.minX >= containerBounds.minX &&
              contentBounds.minY >= containerBounds.minY &&
              contentBounds.maxX <= containerBounds.maxX &&
              contentBounds.maxY <= containerBounds.maxY;

            if (isContained) {
              pairsToCenter.push({
                containerId: containerEl.id,
                contentId: contentEl.id
              });
            }
          }
        }
      }
    }

    // Apply mathematical centering to each pair
    pairsToCenter.forEach(({ containerId, contentId }) => {
      const containerElement = elements.find(el => el.id === containerId);
      const contentElement = elements.find(el => el.id === contentId);
      
      if (!containerElement || !contentElement) return;
      
      // Get container center (mathematical center)
      const selectedIds = [containerId, contentId];
      const containerInfo = detectContainer(elements, selectedIds);
      if (!containerInfo) return;
      
      const containerCenter = containerInfo.center;
      
      // Calculate content mathematical center
      const contentData = contentElement.data as PathData;
      const contentBounds = measurePath(contentData.subPaths, contentData.strokeWidth, 1);
      const contentMathematicalCenter = {
        x: (contentBounds.minX + contentBounds.maxX) / 2,
        y: (contentBounds.minY + contentBounds.maxY) / 2
      };
      
      // Calculate offset to center content mathematically in container
      const offsetX = containerCenter.x - contentMathematicalCenter.x;
      const offsetY = containerCenter.y - contentMathematicalCenter.y;
      
      // Apply the translation
      const translatedSubPaths = contentData.subPaths.map((subpath: SubPath) =>
        translateCommands(subpath, offsetX, offsetY)
      );
      
      // Update the element
      state.updateElement(contentId, {
        data: {
          ...contentData,
          subPaths: translatedSubPaths
        }
      });
    });
  },

  previewAlignment: () => {
    // For preview, we just calculate without applying
    get().calculateAlignment();
  },

  resetAlignment: () => {
    // Only reset if there's an active alignment (avoid unnecessary set() calls)
    const state = get() as CanvasStore;
    if (state.currentAlignment !== null) {
      set(() => ({
        currentAlignment: null
      }));
    }
  },

  // Visualization actions
  toggleMathematicalCenter: () => {
    set((state) => ({
      showMathematicalCenter: !state.showMathematicalCenter
    }));
  },

  toggleOpticalCenter: () => {
    set((state) => ({
      showOpticalCenter: !state.showOpticalCenter
    }));
  },

  toggleMetrics: () => {
    set((state) => ({
      showMetrics: !state.showMetrics
    }));
  },

  toggleDistanceRules: () => {
    set((state) => ({
      showDistanceRules: !state.showDistanceRules
    }));
  },

  toggleAllDistanceRules: () => {
    set((state) => ({
      showAllDistanceRules: !state.showAllDistanceRules
    }));
  },

  setDxFilter: (value: number) => {
    set(() => ({
      dxFilter: value
    }));
  },

  setDyFilter: (value: number) => {
    set(() => ({
      dyFilter: value
    }));
  },

  // Validation
  canPerformOpticalAlignment: () => {
    const state = get() as CanvasStore;
    // Need exactly 2 selected elements (no subpaths)
    return state.selectedIds.length === 2 && state.selectedSubpaths.length === 0 && state.activePlugin === 'select';
  },

  getAlignmentValidationMessage: () => {
    const state = get() as CanvasStore;
    
    if (state.activePlugin !== 'select') {
      return 'Optical alignment is only available in select mode';
    }
    
    if (state.selectedSubpaths.length > 0) {
      return 'Optical alignment does not support subpath selection. Select complete paths only.';
    }
    
    if (state.selectedIds.length !== 2) {
      return 'Select exactly two paths (one container and one content path)';
    }
    
    const validated = getValidatedAlignmentData(state);
    
    if (!validated) {
      return 'Could not determine container. Ensure both paths are valid.';
    }
    
    // Check if the content is actually contained within the container
    const containerBounds = validated.containerInfo.bounds;
    const isContained = validated.contentInfo.every(content => {
      const contentBounds = content.geometry.bounds;
      return contentBounds.minX >= containerBounds.minX &&
             contentBounds.minY >= containerBounds.minY &&
             contentBounds.maxX <= containerBounds.maxX &&
             contentBounds.maxY <= containerBounds.maxY;
    });
    
    if (!isContained) {
      return 'The content path must be completely contained within the container path';
    }
    
    return null; // All validation passed
  },
  
  // ML operations
  addTrainingSample: async () => {
    const state = get() as CanvasStore;
    const currentAlignment = state.currentAlignment;
    
    if (!currentAlignment) {
      console.warn('No alignment available to add as training sample');
      return;
    }
    
    const mlUtils = await import('../../../utils/mlAlignmentUtils');
    
    // Get container and content commands
    const containerElement = state.elements.find(el => el.id === currentAlignment.container.elementId);
    const contentElement = state.elements.find(el => el.id === currentAlignment.content[0].elementId);
    
    if (!containerElement || !contentElement || containerElement.type !== 'path' || contentElement.type !== 'path') {
      console.warn('Invalid elements for training sample');
      return;
    }
    
    const containerData = containerElement.data as PathData;
    const contentData = contentElement.data as PathData;
    
    // Pass subPaths directly (not flattened) to preserve multi-path structure
    const containerSubPaths = containerData.subPaths;
    const contentSubPaths = contentData.subPaths;
    
    // For size calculation, we still need all commands
    const containerCommands = containerData.subPaths.flat();
    
    // Calculate container size for normalization
    const containerSize = mlUtils.getContainerSize(containerCommands);
    
    // Get container center (mathematical center of container)
    const containerCenter = currentAlignment.container.center;
    
    // Get the OPTICAL center of the content (calculated by optical alignment algorithm)
    const contentOpticalCenter = currentAlignment.content[0].opticalCenter;
    
    // CRITICAL: Calculate the MATHEMATICAL center of the content
    // This is the geometric center of the bounding box
    const contentBounds = measurePath(contentSubPaths, 1, 1);
    const contentMathematicalCenterX = (contentBounds.minX + contentBounds.maxX) / 2;
    const contentMathematicalCenterY = (contentBounds.minY + contentBounds.maxY) / 2;
    
    // The TARGET is the INTRINSIC optical adjustment of the figure
    // This is the offset from the mathematical center to the optical center
    // This is what the model should learn to predict for this type of shape
    const targetOffsetX = contentOpticalCenter.x - contentMathematicalCenterX;
    const targetOffsetY = contentOpticalCenter.y - contentMathematicalCenterY;
    
    console.log('Training sample - Container center:', containerCenter);
    console.log('Training sample - Content MATHEMATICAL center:', { x: contentMathematicalCenterX, y: contentMathematicalCenterY });
    console.log('Training sample - Content OPTICAL center:', contentOpticalCenter);
    console.log('Training sample - INTRINSIC optical adjustment (optical - mathematical):', { targetOffsetX, targetOffsetY });
    
    // Normalize target offsets
    const normalizedTargetOffsetX = mlUtils.normalizeAdjustment(targetOffsetX, containerSize.width);
    const normalizedTargetOffsetY = mlUtils.normalizeAdjustment(targetOffsetY, containerSize.height);
    
    console.log('Training sample - Normalized target offset:', { normalizedTargetOffsetX, normalizedTargetOffsetY });
    
    // Info about optical adjustment magnitude
    const offsetMagnitude = Math.sqrt(normalizedTargetOffsetX ** 2 + normalizedTargetOffsetY ** 2);
    console.log(`✓ Optical adjustment magnitude: ${offsetMagnitude.toFixed(4)} (${(offsetMagnitude * 100).toFixed(2)}% of container)`);
    
    // Create training sample
    const sample: TrainingSample = {
      id: `sample-${Date.now()}`,
      containerSubPaths,
      contentSubPaths,
      containerFillColor: containerData.fillColor,
      containerStrokeWidth: containerData.strokeWidth,
      contentFillColor: contentData.fillColor,
      contentStrokeWidth: contentData.strokeWidth,
      targetOffsetX: normalizedTargetOffsetX,
      targetOffsetY: normalizedTargetOffsetY,
      timestamp: Date.now(),
    };
    
    // Log visualization for debugging
    const containerTensor = mlUtils.rasterizePathToTensor(
      containerSubPaths,
      containerData.fillColor,
      containerData.strokeWidth
    );
    const contentTensor = mlUtils.rasterizePathToTensor(
      contentSubPaths,
      contentData.fillColor,
      contentData.strokeWidth
    );
    
    const containerImg = await mlUtils.visualizeTensor(containerTensor);
    const contentImg = await mlUtils.visualizeTensor(contentTensor);
    
    console.log('✅ Training sample added:');
    console.log('  Container image:', containerImg);
    console.log('  Content image:', contentImg);
    console.log('  Target offset (normalized):', { normalizedTargetOffsetX, normalizedTargetOffsetY });
    
    // Clean up tensors
    containerTensor.dispose();
    contentTensor.dispose();
    
    set((state) => ({
      trainingSamples: [...state.trainingSamples, sample]
    }));
  },
  
  addAllTrainingSamples: async () => {
    const state = get() as CanvasStore;
    const mlUtils = await import('../../../utils/mlAlignmentUtils');
    const { detectContainer, prepareContentInfo, calculateOpticalAlignment } = await import('../../../utils/opticalAlignmentUtils');
    
    let addedCount = 0;
    const newSamples: TrainingSample[] = [];
    
    console.log('🔍 Searching for all valid container-content pairs...');
    
    // Try all possible pairs of elements
    for (let i = 0; i < state.elements.length; i++) {
      for (let j = 0; j < state.elements.length; j++) {
        if (i === j) continue;
        
        const containerEl = state.elements[i];
        const contentEl = state.elements[j];
        
        if (containerEl.type !== 'path' || contentEl.type !== 'path') continue;
        
        // Try this pair
        const selectedIds = [containerEl.id, contentEl.id];
        const containerInfo = detectContainer(state.elements, selectedIds);
        
        if (!containerInfo || containerInfo.elementId !== containerEl.id) continue;
        
        const contentInfo = prepareContentInfo(state.elements, selectedIds, containerInfo);
        
        if (contentInfo.length === 0) continue;
        
        // Check if content is contained
        const containerBounds = containerInfo.bounds;
        const contentBounds = contentInfo[0].geometry.bounds;
        const isContained = 
          contentBounds.minX >= containerBounds.minX &&
          contentBounds.minY >= containerBounds.minY &&
          contentBounds.maxX <= containerBounds.maxX &&
          contentBounds.maxY <= containerBounds.maxY;
        
        if (!isContained) continue;
        
        // Calculate alignment
        const alignment = calculateOpticalAlignment(containerInfo, contentInfo);
        
        if (!alignment || alignment.offsets.length === 0) continue;
        
        // Extract data
        const containerData = containerEl.data as PathData;
        const contentData = contentEl.data as PathData;
        
        // Use subPaths directly to preserve structure
        const containerSubPaths = containerData.subPaths;
        const contentSubPaths = contentData.subPaths;
        
        // For size calculation, we need all commands
        const containerCommands = containerData.subPaths.flat();
        
        // Calculate container size for normalization
        const containerSize = mlUtils.getContainerSize(containerCommands);
        
        // Get the OPTICAL center of the content (calculated by optical alignment algorithm)
        const contentOpticalCenter = contentInfo[0].opticalCenter;
        
        // CRITICAL: Calculate the MATHEMATICAL center of the content
        const contentMathBounds = measurePath(contentSubPaths, 1, 1);
        const contentMathematicalCenterX = (contentMathBounds.minX + contentMathBounds.maxX) / 2;
        const contentMathematicalCenterY = (contentMathBounds.minY + contentMathBounds.maxY) / 2;
        
        // The TARGET is the INTRINSIC optical adjustment of the figure
        const targetOffsetX = contentOpticalCenter.x - contentMathematicalCenterX;
        const targetOffsetY = contentOpticalCenter.y - contentMathematicalCenterY;
        
        // Normalize target offsets
        const normalizedTargetOffsetX = mlUtils.normalizeAdjustment(targetOffsetX, containerSize.width);
        const normalizedTargetOffsetY = mlUtils.normalizeAdjustment(targetOffsetY, containerSize.height);
        
        // Log optical adjustment found
        const offsetMagnitude = Math.sqrt(normalizedTargetOffsetX ** 2 + normalizedTargetOffsetY ** 2);
        console.log(`✓ Found intrinsic optical adjustment (Container=${containerEl.id}, Content=${contentEl.id}): magnitude=${offsetMagnitude.toFixed(4)} (${(offsetMagnitude * 100).toFixed(2)}%)`);
        
        // Create training sample
        const sample: TrainingSample = {
          id: `sample-${Date.now()}-${addedCount}`,
          containerSubPaths,
          contentSubPaths,
          containerFillColor: containerData.fillColor,
          containerStrokeWidth: containerData.strokeWidth,
          contentFillColor: contentData.fillColor,
          contentStrokeWidth: contentData.strokeWidth,
          targetOffsetX: normalizedTargetOffsetX,
          targetOffsetY: normalizedTargetOffsetY,
          timestamp: Date.now(),
        };
        
        newSamples.push(sample);
        addedCount++;
        
        // Log visualization for debugging
        const containerTensor = mlUtils.rasterizePathToTensor(
          containerSubPaths,
          containerData.fillColor,
          containerData.strokeWidth
        );
        const contentTensor = mlUtils.rasterizePathToTensor(
          contentSubPaths,
          contentData.fillColor,
          contentData.strokeWidth
        );
        
        const containerImg = await mlUtils.visualizeTensor(containerTensor);
        const contentImg = await mlUtils.visualizeTensor(contentTensor);
        
        console.log(`✅ Sample ${addedCount}: Container=${containerEl.id}, Content=${contentEl.id}`);
        console.log('  Container image:', containerImg);
        console.log('  Content image:', contentImg);
        console.log('  Target offset (normalized):', { normalizedTargetOffsetX, normalizedTargetOffsetY });
        
        // Clean up tensors
        containerTensor.dispose();
        contentTensor.dispose();
      }
    }
    
    if (addedCount > 0) {
      set((state) => ({
        trainingSamples: [...state.trainingSamples, ...newSamples]
      }));
      console.log(`✅ Added ${addedCount} training samples from canvas`);
    } else {
      console.warn('⚠️ No valid container-content pairs found on canvas');
    }
  },
  
  removeTrainingSample: (id: string) => {
    set((state) => ({
      trainingSamples: state.trainingSamples.filter(s => s.id !== id)
    }));
  },
  
  clearTrainingSamples: () => {
    set(() => ({
      trainingSamples: []
    }));
  },
  
  trainMLModel: async () => {
    const state = get() as CanvasStore;
    
    if (state.trainingSamples.length < 5) {
      console.warn('Need at least 5 training samples');
      return;
    }
    
    set(() => ({
      isTraining: true,
      trainingProgress: 0,
      trainingLoss: null
    }));
    
    try {
      const mlUtils = await import('../../../utils/mlAlignmentUtils');
      
      // Create or reuse model
      let model = state.mlModel;
      if (!model) {
        model = mlUtils.createAlignmentModel();
      }
      
      // Train model
      await mlUtils.trainModel(
        model,
        state.trainingSamples,
        (epoch: number, logs: tf.Logs) => {
          const progress = ((epoch + 1) / mlUtils.ML_CONFIG.TRAINING_EPOCHS) * 100;
          set(() => ({
            trainingProgress: progress,
            trainingLoss: logs.loss as number
          }));
        }
      );
      
      set(() => ({
        mlModel: model,
        isTraining: false,
        trainingProgress: 100
      }));
    } catch (error) {
      console.error('Training failed:', error);
      set(() => ({
        isTraining: false,
        trainingProgress: 0
      }));
    }
  },
  
  applyMLPrediction: async () => {
    const state = get() as CanvasStore;
    
    if (!state.mlModel) {
      console.warn('No trained model available');
      return;
    }
    
    if (!get().canPerformOpticalAlignment()) {
      return;
    }
    
    const validated = getValidatedAlignmentData(state);
    if (!validated) {
      return;
    }
    
    try {
      const mlUtils = await import('../../../utils/mlAlignmentUtils');
      
      // Get container and content elements
      const containerElement = state.elements.find(el => el.id === validated.containerInfo.elementId);
      const contentElement = state.elements.find(el => el.id === validated.contentInfo[0].elementId);
      
      if (!containerElement || !contentElement || containerElement.type !== 'path' || contentElement.type !== 'path') {
        return;
      }
      
      const containerData = containerElement.data as PathData;
      const contentData = contentElement.data as PathData;
      
      // Use subPaths to preserve structure
      const containerSubPaths = containerData.subPaths;
      const contentSubPaths = contentData.subPaths;
      
      // For size calculation
      const containerCommands = containerData.subPaths.flat();
      
      // Predict alignment
      const prediction = await mlUtils.predictAlignment(
        state.mlModel,
        containerSubPaths,
        contentSubPaths,
        containerData.fillColor,
        containerData.strokeWidth,
        contentData.fillColor,
        contentData.strokeWidth,
        true // Enable debug mode
      );
      
      console.log('ML Prediction (normalized intrinsic optical adjustment):', prediction);
      
      // Denormalize prediction to get intrinsic optical adjustment in pixels
      const containerSize = mlUtils.getContainerSize(containerCommands);
      const intrinsicOffsetX = mlUtils.denormalizeAdjustment(prediction.adjustmentX, containerSize.width);
      const intrinsicOffsetY = mlUtils.denormalizeAdjustment(prediction.adjustmentY, containerSize.height);
      
      console.log('Container size:', containerSize);
      console.log('ML Prediction (intrinsic optical adjustment in pixels):', { intrinsicOffsetX, intrinsicOffsetY });
      
      // CRITICAL FIX: Use the OPTICAL center of the content (already calculated by the geometric algorithm)
      // This handles complex cases like $ sign with bars, or flags with separated stems
      const currentContentOpticalCenter = validated.contentInfo[0].opticalCenter;
      
      // The target position is: container center + intrinsic optical adjustment
      // The intrinsic adjustment is what the model learned (optical - mathematical offset)
      // But we apply it from the current optical center, not mathematical center
      const containerCenter = validated.containerInfo.center;
      
      // We want: contentOpticalCenter to be at containerCenter
      // But the figure needs intrinsic adjustment, so:
      // First center it: delta1 = containerCenter - currentOpticalCenter
      // Then apply model's intrinsic offset: delta2 = intrinsicOffset
      // But intrinsicOffset is relative to mathematical center...
      
      // Actually, let's think differently:
      // Model learned: "for this shape, optical center is X pixels from mathematical center"
      // We want to position it so: optical center = container center
      // So we need to calculate where mathematical center should be:
      // mathematicalCenter = containerCenter - intrinsicOffset
      
      // Calculate current mathematical center
      const contentBounds = measurePath(contentSubPaths, 1, 1);
      const currentMathematicalCenterX = (contentBounds.minX + contentBounds.maxX) / 2;
      const currentMathematicalCenterY = (contentBounds.minY + contentBounds.maxY) / 2;
      
      // Target mathematical center (so that optical center ends up at container center)
      const targetMathematicalCenterX = containerCenter.x - intrinsicOffsetX;
      const targetMathematicalCenterY = containerCenter.y - intrinsicOffsetY;
      
      // Delta to apply
      const deltaX = targetMathematicalCenterX - currentMathematicalCenterX;
      const deltaY = targetMathematicalCenterY - currentMathematicalCenterY;
      
      console.log('Container center:', containerCenter);
      console.log('Current content optical center (from geometric algorithm):', currentContentOpticalCenter);
      console.log('Current content mathematical center:', { x: currentMathematicalCenterX, y: currentMathematicalCenterY });
      console.log('Target mathematical center (to position optical at container):', { x: targetMathematicalCenterX, y: targetMathematicalCenterY });
      console.log('Delta to apply:', { deltaX, deltaY });
      
      // Create alignment result
      const alignmentResult: AlignmentResult = {
        container: validated.containerInfo,
        content: validated.contentInfo,
        offsets: [{
          elementId: validated.contentInfo[0].elementId,
          deltaX,
          deltaY
        }],
        metrics: {
          mathematicalCenter: containerCenter,
          opticalCenter: containerCenter // After alignment, optical center should be at container center
        }
      };
      
      console.log('ML Alignment result:', alignmentResult);
      
      set(() => ({ currentAlignment: alignmentResult }));
    } catch (error) {
      console.error('ML prediction failed:', error);
    }
  },
  
  saveMLModel: async (name?: string) => {
    const state = get() as CanvasStore;
    
    if (!state.mlModel) {
      console.warn('No model to save');
      return;
    }
    
    try {
      const mlUtils = await import('../../../utils/mlAlignmentUtils');
      await mlUtils.saveModel(state.mlModel, name);
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  },
  
  loadMLModel: async (name?: string) => {
    try {
      const mlUtils = await import('../../../utils/mlAlignmentUtils');
      const model = await mlUtils.loadModel(name);
      
      if (model) {
        set(() => ({ mlModel: model }));
      }
    } catch (error) {
      console.error('Failed to load model:', error);
    }
  },
  
  loadPretrainedMLModel: async () => {
    try {
      const mlUtils = await import('../../../utils/mlAlignmentUtils');
      const model = await mlUtils.loadPretrainedModel();
      
      set(() => ({ mlModel: model }));
      console.log('✅ Pre-trained model loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load pre-trained model:', error);
      throw error;
    }
  },
  
  downloadMLModel: async (name?: string) => {
    const state = get() as CanvasStore;
    
    if (!state.mlModel) {
      console.warn('No model to download');
      return;
    }
    
    try {
      const mlUtils = await import('../../../utils/mlAlignmentUtils');
      await mlUtils.downloadModel(state.mlModel, name);
    } catch (error) {
      console.error('Failed to download model:', error);
    }
  },
  
  uploadMLModel: async (jsonFile: File, weightsFile: File) => {
    try {
      const mlUtils = await import('../../../utils/mlAlignmentUtils');
      const model = await mlUtils.loadModelFromFiles(jsonFile, weightsFile);
      
      set(() => ({ mlModel: model }));
    } catch (error) {
      console.error('Failed to upload model:', error);
    }
  },
  
  deleteMLModel: async (name?: string) => {
    try {
      const mlUtils = await import('../../../utils/mlAlignmentUtils');
      await mlUtils.deleteModel(name);
      
      set(() => ({ mlModel: null }));
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  },
  
  applyMLToAllPairs: async () => {
    const state = get() as CanvasStore;
    
    if (!state.mlModel) {
      console.warn('No ML model available');
      return 0;
    }
    
    let appliedCount = 0;
    const mlUtils = await import('../../../utils/mlAlignmentUtils');
    
    console.log('Applying ML alignment to all valid pairs...');
    
    // Find all path elements
    const pathElements = state.elements.filter(el => el.type === 'path');
    
    // Find all potential containers (closed paths with area)
    const potentialContainers = pathElements.filter(el => {
      const pathData = el.data as PathData;
      // Check if all subpaths are closed
      return pathData.subPaths.every(subPath => 
        subPath.length > 0 && subPath[subPath.length - 1].type === 'Z'
      );
    });
    
    // For each potential container, find content inside it
    for (const containerEl of potentialContainers) {
      const containerData = containerEl.data as PathData;
      const containerCommands = containerData.subPaths.flat();
      const containerBounds = measurePath(containerData.subPaths, containerData.strokeWidth, 1);
      const containerSize = mlUtils.getContainerSize(containerCommands);
      const containerCenterX = (containerBounds.minX + containerBounds.maxX) / 2;
      const containerCenterY = (containerBounds.minY + containerBounds.maxY) / 2;
      
      // Find content elements inside this container
      for (const contentEl of pathElements) {
        if (contentEl.id === containerEl.id) continue; // Skip self
        
        const contentData = contentEl.data as PathData;
        const contentBounds = measurePath(contentData.subPaths, contentData.strokeWidth, 1);
        
        // Check if content is inside container
        const isContained = 
          contentBounds.minX >= containerBounds.minX &&
          contentBounds.minY >= containerBounds.minY &&
          contentBounds.maxX <= containerBounds.maxX &&
          contentBounds.maxY <= containerBounds.maxY;
        
        if (!isContained) continue;
        
        try {
          // Predict alignment
          const prediction = await mlUtils.predictAlignment(
            state.mlModel,
            containerData.subPaths,
            contentData.subPaths,
            containerData.fillColor,
            containerData.strokeWidth,
            contentData.fillColor,
            contentData.strokeWidth,
            false // Disable debug mode for batch
          );
          
          // Calculate adjustment
          const intrinsicOffsetX = mlUtils.denormalizeAdjustment(prediction.adjustmentX, containerSize.width);
          const intrinsicOffsetY = mlUtils.denormalizeAdjustment(prediction.adjustmentY, containerSize.height);
          
          // Calculate current mathematical center of content
          const currentMathematicalCenterX = (contentBounds.minX + contentBounds.maxX) / 2;
          const currentMathematicalCenterY = (contentBounds.minY + contentBounds.maxY) / 2;
          
          // Target mathematical center (so optical center ends up at container center)
          const targetMathematicalCenterX = containerCenterX - intrinsicOffsetX;
          const targetMathematicalCenterY = containerCenterY - intrinsicOffsetY;
          
          // Calculate delta
          const deltaX = targetMathematicalCenterX - currentMathematicalCenterX;
          const deltaY = targetMathematicalCenterY - currentMathematicalCenterY;
          
          // Apply translation
          const translatedSubPaths = contentData.subPaths.map(subPath =>
            translateCommands(subPath, deltaX, deltaY)
          );
          
          // Check if content will overflow after alignment
          const translatedBounds = measurePath(translatedSubPaths, contentData.strokeWidth, 1);
          const willOverflow = 
            translatedBounds.minX < containerBounds.minX ||
            translatedBounds.minY < containerBounds.minY ||
            translatedBounds.maxX > containerBounds.maxX ||
            translatedBounds.maxY > containerBounds.maxY;
          
          if (willOverflow) {
            console.warn('⚠️ OVERFLOW DETECTED IN BATCH ML ALIGNMENT');
            console.group('Overflow Analysis');
            console.log('Container ID:', containerEl.id);
            console.log('Content ID:', contentEl.id);
            console.log('Container Bounds:', containerBounds);
            console.log('Original Content Bounds:', contentBounds);
            console.log('Translated Content Bounds:', translatedBounds);
            console.log('Container Center:', { x: containerCenterX, y: containerCenterY });
            console.log('Original Mathematical Center:', { x: currentMathematicalCenterX, y: currentMathematicalCenterY });
            console.log('Intrinsic Offset (predicted):', { x: intrinsicOffsetX, y: intrinsicOffsetY });
            console.log('Target Mathematical Center:', { x: targetMathematicalCenterX, y: targetMathematicalCenterY });
            console.log('Applied Delta:', { x: deltaX, y: deltaY });
            console.log('Container Size:', containerSize);
            console.log('Content SubPaths count:', contentData.subPaths.length);
            console.log('Content SubPaths details:', contentData.subPaths.map((sp, i) => ({
              index: i,
              commands: sp.length,
              firstCommand: sp[0],
              lastCommand: sp[sp.length - 1]
            })));
            console.log('Container SubPaths count:', containerData.subPaths.length);
            console.log('Container SubPaths details:', containerData.subPaths.map((sp, i) => ({
              index: i,
              commands: sp.length,
              firstCommand: sp[0],
              lastCommand: sp[sp.length - 1]
            })));
            console.log('Overflow amounts:', {
              left: containerBounds.minX - translatedBounds.minX,
              top: containerBounds.minY - translatedBounds.minY,
              right: translatedBounds.maxX - containerBounds.maxX,
              bottom: translatedBounds.maxY - containerBounds.maxY
            });
            console.groupEnd();
          }
          
          // Update element
          set((s) => ({
            elements: s.elements.map(el =>
              el.id === contentEl.id
                ? {
                    ...el,
                    data: {
                      ...contentData,
                      subPaths: translatedSubPaths
                    }
                  }
                : el
            )
          }));
          
          appliedCount++;
          console.log(`✓ Applied ML alignment to pair (Container=${containerEl.id}, Content=${contentEl.id})`);
        } catch (error) {
          console.error(`Failed to apply ML to pair (Container=${containerEl.id}, Content=${contentEl.id}):`, error);
        }
      }
    }
    
    console.log(`Applied ML alignment to ${appliedCount} pairs`);
    return appliedCount;
  },
  
  toggleMLPrediction: () => {
    set((state) => ({
      useMlPrediction: !state.useMlPrediction
    }));
  }
});