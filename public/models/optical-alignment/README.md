# Pre-trained Optical Alignment Model

This directory contains the default pre-trained optical alignment model for TTPE.

## Files

- `default-model.json` - Model architecture and metadata
- `default-model.weights.bin` - Model weights (binary)

## Model Details

- **Training Date**: October 9, 2025
- **Architecture**: CNN with 3 convolutional layers (16→32→64 filters) + 2 dense layers (64→32→2)
- **Input**: 64x64 binary rasterized images of container and content
- **Output**: Normalized intrinsic optical offset (X, Y) in range [-2, 2]
- **Normalization Range**: [-2, 2] for both X and Y axes

## Training Data

The model was trained using geometric optical alignment samples with various shapes and containers.

## Usage

The model is automatically available in the application and can be loaded via the "Load Default Model" button in the Optical Alignment panel.

## API

The model is served from `/models/optical-alignment/default-model.json` and will be loaded using TensorFlow.js `loadLayersModel()`.
