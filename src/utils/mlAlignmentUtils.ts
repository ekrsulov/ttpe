import * as tf from '@tensorflow/tfjs';
import type { Command } from '../types';
import { measurePath } from './measurementUtils';
import { translateCommands } from './transformationUtils';

/**
 * Configuration for ML-based optical alignment
 */
export const ML_CONFIG = {
  IMAGE_SIZE: 64,
  MODEL_NAME: 'optical-alignment-model',
  TRAINING_EPOCHS: 200, // More epochs but slower learning
  BATCH_SIZE: 8,        // Back to original
  LEARNING_RATE: 0.0001, // Much lower learning rate
  VALIDATION_SPLIT: 0.2,
} as const;

/**
 * Training sample for the ML model
 */
export interface TrainingSample {
  id: string;
  containerSubPaths: Command[][]; // Store subPaths to preserve structure
  contentSubPaths: Command[][];   // Store subPaths to preserve structure
  containerFillColor: string;
  containerStrokeWidth: number;
  contentFillColor: string;
  contentStrokeWidth: number;
  // Target position: offset from container center to optimal content center
  // This is ABSOLUTE position, not relative to current position
  targetOffsetX: number; // Normalized offset from container center (-1 to 1)
  targetOffsetY: number; // Normalized offset from container center (-1 to 1)
  timestamp: number;
}

/**
 * Rasterizes path commands to a binary image tensor
 * Supports multiple subpaths correctly
 * 
 * NEW: Can accept bounds parameter to preserve relative positioning
 * When rendering container+content together, pass combined bounds
 * to both calls so they share the same coordinate system
 */
export function rasterizePathToTensor(
  subPaths: Command[][] | Command[], // Accept both formats
  fillColor: string = 'black',
  strokeWidth: number = 1,
  size: number = ML_CONFIG.IMAGE_SIZE,
  sharedBounds?: { minX: number; minY: number; maxX: number; maxY: number } // Optional: use same bounds for both container and content
): tf.Tensor2D {
  // Normalize input: if it's a flat array, wrap it
  const subPathsArray = Array.isArray(subPaths[0]) ? subPaths as Command[][] : [subPaths as Command[]];
  
  // Get bounds: either use shared bounds (to preserve relative position) or calculate own bounds
  const bounds = sharedBounds || measurePath(subPathsArray, 1, 1);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  
  // Prevent division by zero
  if (width === 0 || height === 0) {
    console.warn('Path has zero width or height, returning empty tensor');
    return tf.zeros([size, size]);
  }
  
  // Calculate scaling factor to fit in the target size with padding
  const padding = size * 0.15; // 15% padding for better centering
  const targetSize = size - 2 * padding;
  const scale = Math.min(targetSize / width, targetSize / height);
  
  // Create canvas for rasterization
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Clear canvas
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);
  
  // Calculate centered position based on bounds
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const offsetX = (size - scaledWidth) / 2 - bounds.minX * scale;
  const offsetY = (size - scaledHeight) / 2 - bounds.minY * scale;
  
  // Transform to center the path (or the shared bounds)
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  
  // Setup drawing styles
  const hasFill = fillColor !== 'none' && fillColor !== 'transparent';
  const hasStroke = strokeWidth > 0;
  
  if (hasFill) {
    ctx.fillStyle = 'black';
  }
  if (hasStroke) {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = strokeWidth / scale; // Respect actual stroke width
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }
  
  // Draw each subpath separately to preserve multi-path structure
  subPathsArray.forEach(commands => {
    ctx.beginPath();
    
    commands.forEach(cmd => {
      switch (cmd.type) {
        case 'M':
          ctx.moveTo(cmd.position.x, cmd.position.y);
          break;
        case 'L':
          ctx.lineTo(cmd.position.x, cmd.position.y);
          break;
        case 'C':
          ctx.bezierCurveTo(
            cmd.controlPoint1.x,
            cmd.controlPoint1.y,
            cmd.controlPoint2.x,
            cmd.controlPoint2.y,
            cmd.position.x,
            cmd.position.y
          );
          break;
        case 'Z':
          ctx.closePath();
          break;
      }
    });
    
    // Apply fill and stroke for this subpath
    if (hasFill) {
      ctx.fill();
    }
    if (hasStroke) {
      ctx.stroke();
    }
  });
  
  // Get image data
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
  const imageData = ctx.getImageData(0, 0, size, size);
  
  // Convert to grayscale tensor (0-1 range, inverted so shapes are 1 and background is 0)
  const data = new Float32Array(size * size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const grayscale = imageData.data[i] / 255; // R channel (grayscale)
    data[i / 4] = 1 - grayscale; // Invert: black becomes 1, white becomes 0
  }
  
  return tf.tensor2d(data, [size, size]);
}

/**
 * Visualizes a rasterized tensor as a data URL for debugging
 */
export async function visualizeTensor(tensor: tf.Tensor2D): Promise<string> {
  const [height, width] = tensor.shape;
  const data = await tensor.data();
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  const imageData = ctx.createImageData(width, height);
  
  for (let i = 0; i < data.length; i++) {
    const value = data[i] * 255; // Convert from [0,1] to [0,255]
    const idx = i * 4;
    imageData.data[idx] = value;     // R
    imageData.data[idx + 1] = value; // G
    imageData.data[idx + 2] = value; // B
    imageData.data[idx + 3] = 255;   // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

/**
 * Rasterizes container and content with content CENTERED MATHEMATICALLY in the container
 * This creates the "ideal" input where we want to predict the optical adjustment
 */
export function rasterizeCenteredPair(
  containerSubPaths: Command[][],
  contentSubPaths: Command[][],
  containerFillColor: string,
  containerStrokeWidth: number,
  contentFillColor: string,
  contentStrokeWidth: number,
  size: number = ML_CONFIG.IMAGE_SIZE
): { containerTensor: tf.Tensor2D; contentTensor: tf.Tensor2D } {
  // Get bounds for both
  const containerBounds = measurePath(containerSubPaths, 1, 1);
  const contentBounds = measurePath(contentSubPaths, 1, 1);
  
  // Calculate mathematical centers
  const containerCenterX = (containerBounds.minX + containerBounds.maxX) / 2;
  const containerCenterY = (containerBounds.minY + containerBounds.maxY) / 2;
  const contentCenterX = (contentBounds.minX + contentBounds.maxX) / 2;
  const contentCenterY = (contentBounds.minY + contentBounds.maxY) / 2;
  
  // Calculate offset to center content mathematically in container
  const offsetX = containerCenterX - contentCenterX;
  const offsetY = containerCenterY - contentCenterY;
  
  // Translate content commands to be centered
  const centeredContentSubPaths = contentSubPaths.map(subPath =>
    translateCommands(subPath, offsetX, offsetY)
  );
  
  // Calculate combined bounds with centered content
  const centeredContentBounds = measurePath(centeredContentSubPaths, 1, 1);
  const combinedBounds = {
    minX: Math.min(containerBounds.minX, centeredContentBounds.minX),
    minY: Math.min(containerBounds.minY, centeredContentBounds.minY),
    maxX: Math.max(containerBounds.maxX, centeredContentBounds.maxX),
    maxY: Math.max(containerBounds.maxY, centeredContentBounds.maxY),
  };
  
  // Rasterize both using combined bounds
  const containerTensor = rasterizePathToTensor(
    containerSubPaths,
    containerFillColor,
    containerStrokeWidth,
    size,
    combinedBounds
  );
  
  const contentTensor = rasterizePathToTensor(
    centeredContentSubPaths,
    contentFillColor,
    contentStrokeWidth,
    size,
    combinedBounds
  );
  
  return { containerTensor, contentTensor };
}

/**
 * Combines container and content tensors into a single input tensor
 */
export function combineTensors(
  containerTensor: tf.Tensor2D,
  contentTensor: tf.Tensor2D
): tf.Tensor4D {
  // Stack as channels: [batch, height, width, channels]
  // Channel 0: container, Channel 1: content
  return tf.stack([containerTensor, contentTensor], 2).expandDims(0) as tf.Tensor4D;
}

/**
 * Normalizes adjustment values to -2 to 2 range based on container size
 * Using wider range to handle paths with large optical deviations
 */
export function normalizeAdjustment(
  adjustmentPixels: number,
  containerSize: number
): number {
  // Normalize to [-2, 2] range (allowing full container width/height of adjustment)
  // Most adjustments should be << 1, but complex paths might need larger values
  return Math.max(-2, Math.min(2, adjustmentPixels / (containerSize / 2)));
}

/**
 * Denormalizes adjustment from -2 to 2 range back to pixels
 */
export function denormalizeAdjustment(
  normalizedAdjustment: number,
  containerSize: number
): number {
  return normalizedAdjustment * (containerSize / 2);
}

/**
 * Creates the CNN model for optical alignment prediction
 */
export function createAlignmentModel(): tf.LayersModel {
  const model = tf.sequential();
  
  // Input: 64x64x2 (container + content as channels)
  // Simpler model without batch normalization
  model.add(tf.layers.conv2d({
    inputShape: [ML_CONFIG.IMAGE_SIZE, ML_CONFIG.IMAGE_SIZE, 2],
    filters: 16, // Reduced filters
    kernelSize: 3,
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal', // Better initialization
  }));
  
  model.add(tf.layers.maxPooling2d({
    poolSize: 2,
    strides: 2,
  }));
  
  model.add(tf.layers.conv2d({
    filters: 32,
    kernelSize: 3,
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal',
  }));
  
  model.add(tf.layers.maxPooling2d({
    poolSize: 2,
    strides: 2,
  }));
  
  model.add(tf.layers.conv2d({
    filters: 64,
    kernelSize: 3,
    activation: 'relu',
    padding: 'same',
    kernelInitializer: 'heNormal',
  }));
  
  model.add(tf.layers.maxPooling2d({
    poolSize: 2,
    strides: 2,
  }));
  
  model.add(tf.layers.flatten());
  
  model.add(tf.layers.dense({
    units: 64, // Reduced from 128
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  
  model.add(tf.layers.dropout({
    rate: 0.3,
  }));
  
  model.add(tf.layers.dense({
    units: 32, // Reduced from 64
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  
  // Output: 2 values (adjustmentX, adjustmentY) in range [-2, 2]
  // Using linear activation to allow full range
  model.add(tf.layers.dense({
    units: 2,
    activation: 'linear', // Changed from tanh to allow wider range
    kernelInitializer: 'glorotNormal',
  }));
  
  // Compile model with lower learning rate
  model.compile({
    optimizer: tf.train.adam(ML_CONFIG.LEARNING_RATE),
    loss: 'meanSquaredError',
    metrics: ['mae'],
  });
  
  return model;
}

/**
 * Trains the model with the provided samples
 */
export async function trainModel(
  model: tf.LayersModel,
  samples: TrainingSample[],
  onEpochEnd?: (epoch: number, logs: tf.Logs) => void
): Promise<tf.History> {
  if (samples.length === 0) {
    throw new Error('No training samples provided');
  }
  
  console.log(`Training with ${samples.length} samples`);
  
  // Prepare training data WITHOUT augmentation
  const inputs: tf.Tensor4D[] = [];
  const outputs: number[][] = [];
  
  samples.forEach((sample, idx) => {
    // CRITICAL FIX: Rasterize with content CENTERED MATHEMATICALLY in container
    // This way the model learns the optical adjustment from the mathematically centered position
    const { containerTensor, contentTensor } = rasterizeCenteredPair(
      sample.containerSubPaths,
      sample.contentSubPaths,
      sample.containerFillColor,
      sample.containerStrokeWidth,
      sample.contentFillColor,
      sample.contentStrokeWidth
    );
    
    const combinedTensor = combineTensors(containerTensor, contentTensor);
    
    inputs.push(combinedTensor);
    outputs.push([sample.targetOffsetX, sample.targetOffsetY]);
    
    // Clean up intermediate tensors
    containerTensor.dispose();
    contentTensor.dispose();
    
    if (idx % 10 === 0 || idx === samples.length - 1) {
      console.log(`Prepared ${idx + 1}/${samples.length} samples`);
    }
  });
  
  console.log(`Total training samples: ${inputs.length}`);
  
  // Concatenate all inputs
  const xs = tf.concat(inputs);
  const ys = tf.tensor2d(outputs);
  
  // Clean up individual tensors
  inputs.forEach(t => t.dispose());
  
  // Log training data statistics
  const yStats = await ys.data();
  const yArray = Array.from(yStats);
  console.log('Training data stats:');
  console.log('  Sample outputs:', yArray.slice(0, 10));
  console.log('  Min:', Math.min(...yArray));
  console.log('  Max:', Math.max(...yArray));
  console.log('  Mean:', yArray.reduce((a: number, b: number) => a + b, 0) / yArray.length);
  
  console.log('Starting training...');
  
  // Train the model
  const history = await model.fit(xs, ys, {
    epochs: ML_CONFIG.TRAINING_EPOCHS,
    batchSize: ML_CONFIG.BATCH_SIZE,
    validationSplit: ML_CONFIG.VALIDATION_SPLIT,
    shuffle: true,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (onEpochEnd && logs) {
          onEpochEnd(epoch, logs);
        }
        // Log every 20 epochs
        if (epoch % 20 === 0 && logs) {
          console.log(`Epoch ${epoch + 1}: loss=${logs.loss?.toFixed(4)}, val_loss=${logs.val_loss?.toFixed(4)}, mae=${logs.mae?.toFixed(4)}`);
        }
      },
    },
  });
  
  const finalLoss = Number(history.history.loss[history.history.loss.length - 1]);
  const finalValLoss = history.history.val_loss ? Number(history.history.val_loss[history.history.val_loss.length - 1]) : 0;
  console.log(`Training complete! Final loss=${finalLoss.toFixed(4)}, val_loss=${finalValLoss.toFixed(4)}`);
  
  // Clean up
  xs.dispose();
  ys.dispose();
  
  return history;
}

/**
 * Predicts optical alignment adjustment for a given container and content
 */
export async function predictAlignment(
  model: tf.LayersModel,
  containerSubPaths: Command[][],
  contentSubPaths: Command[][],
  containerFillColor: string,
  containerStrokeWidth: number,
  contentFillColor: string,
  contentStrokeWidth: number,
  debug: boolean = false
): Promise<{ adjustmentX: number; adjustmentY: number }> {
  // CRITICAL FIX: Rasterize with content CENTERED MATHEMATICALLY in container
  // Same as training: model predicts optical adjustment from mathematically centered position
  const { containerTensor, contentTensor } = rasterizeCenteredPair(
    containerSubPaths,
    contentSubPaths,
    containerFillColor,
    containerStrokeWidth,
    contentFillColor,
    contentStrokeWidth
  );
  
  const inputTensor = combineTensors(containerTensor, contentTensor);
  
  // Debug visualization
  if (debug) {
    const containerImg = await visualizeTensor(containerTensor);
    const contentImg = await visualizeTensor(contentTensor);
    console.log('Container rasterized:', containerImg);
    console.log('Content rasterized:', contentImg);
    console.log('You can paste these data URLs in browser address bar to see the images');
  }
  
  // Predict
  const prediction = model.predict(inputTensor) as tf.Tensor;
  const values = await prediction.data();
  
  // Clean up
  containerTensor.dispose();
  contentTensor.dispose();
  inputTensor.dispose();
  prediction.dispose();
  
  return {
    adjustmentX: values[0],
    adjustmentY: values[1],
  };
}

/**
 * Saves the model to browser's IndexedDB
 */
export async function saveModel(
  model: tf.LayersModel,
  name: string = ML_CONFIG.MODEL_NAME
): Promise<void> {
  await model.save(`indexeddb://${name}`);
}

/**
 * Loads a model from browser's IndexedDB
 */
export async function loadModel(
  name: string = ML_CONFIG.MODEL_NAME
): Promise<tf.LayersModel | null> {
  try {
    const model = await tf.loadLayersModel(`indexeddb://${name}`);
    return model;
  } catch (error) {
    console.warn('Failed to load model:', error);
    return null;
  }
}

/**
 * Downloads the model as files
 */
export async function downloadModel(
  model: tf.LayersModel,
  name: string = ML_CONFIG.MODEL_NAME
): Promise<void> {
  await model.save(`downloads://${name}`);
}

/**
 * Loads a model from uploaded files
 */
export async function loadModelFromFiles(
  jsonFile: File,
  weightsFile: File
): Promise<tf.LayersModel> {
  const model = await tf.loadLayersModel(
    tf.io.browserFiles([jsonFile, weightsFile])
  );
  return model;
}

/**
 * Loads the pre-trained model from the server
 */
export async function loadPretrainedModel(): Promise<tf.LayersModel> {
  // Use import.meta.env.BASE_URL to handle GitHub Pages deployment
  const baseUrl = import.meta.env.BASE_URL || '/';
  const modelUrl = `${baseUrl}models/optical-alignment/default-model.json`;
  
  console.log(`Loading pre-trained model from: ${modelUrl}`);
  const model = await tf.loadLayersModel(modelUrl);
  console.log('✅ Loaded pre-trained optical alignment model from server');
  return model;
}

/**
 * Lists available models in IndexedDB
 */
export async function listSavedModels(): Promise<string[]> {
  const models = await tf.io.listModels();
  return Object.keys(models)
    .filter(key => key.startsWith('indexeddb://'))
    .map(key => key.replace('indexeddb://', ''));
}

/**
 * Deletes a model from IndexedDB
 */
export async function deleteModel(
  name: string = ML_CONFIG.MODEL_NAME
): Promise<void> {
  await tf.io.removeModel(`indexeddb://${name}`);
}

/**
 * Gets the container size from commands for denormalization
 */
export function getContainerSize(commands: Command[]): { width: number; height: number } {
  const bounds = measurePath([commands], 1, 1);
  return {
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}
