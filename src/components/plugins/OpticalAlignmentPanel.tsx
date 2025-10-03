import React from 'react';
import {
  VStack,
  HStack,
  Button,
  IconButton as ChakraIconButton,
  Text,
  Box,
  Grid,
  GridItem,
  Tooltip
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../ui/Panel';
import {
  Target,
  RotateCcw,
  Crosshair,
  BarChart3,
  Ruler
} from 'lucide-react';

export const OpticalAlignmentPanel: React.FC = () => {
  const {
    // Optical alignment state
    currentAlignment,
    showMathematicalCenter,
    showOpticalCenter,
    showMetrics,
    showDistanceRules,
    // Optical alignment actions
    applyAlignment,
    previewAlignment,
    resetAlignment,
    toggleMathematicalCenter,
    toggleOpticalCenter,
    toggleMetrics,
    toggleDistanceRules,
    canPerformOpticalAlignment,
    getAlignmentValidationMessage
  } = useCanvasStore();

  // Use store state
  const hasAlignment = currentAlignment !== null;

  // Apply alignment
  const handleApplyAlignment = () => {
    if (!hasAlignment) return;
    applyAlignment();
    // After applying, show preview again to maintain visual feedback
    previewAlignment();
  };

  // Reset alignment
  const handleResetAlignment = () => {
    resetAlignment();
  };

  // Preview alignment
  const handlePreviewAlignment = () => {
    if (!canPerformOpticalAlignment()) return;
    previewAlignment();
  };

  if (getAlignmentValidationMessage() !== null) return null;

  return (
    <Panel 
      icon={<Target size={16} />} 
      title="Optical Alignment"
      headerActions={
        <Button
          onClick={handleApplyAlignment}
          isDisabled={!hasAlignment}
          size="xs"
          variant="outline"
          fontSize="12px"
          py={0}
        >
          Apply
        </Button>
      }
    >
      {/* Controls */}
      {canPerformOpticalAlignment() && (
        <VStack spacing={2} align="stretch">
          {/* Visualization Controls */}
          <HStack spacing={2}>
            <Tooltip label="Mathematical Center" fontSize="xs">
              <ChakraIconButton
                aria-label="Mathematical Center"
                icon={<Crosshair size={16} />}
                size="sm"
                onClick={toggleMathematicalCenter}
                colorScheme={showMathematicalCenter ? 'brand' : 'gray'}
                variant={showMathematicalCenter ? 'solid' : 'ghost'}
                bg={showMathematicalCenter ? undefined : 'transparent'}
              />
            </Tooltip>

            <Tooltip label="Optical Center" fontSize="xs">
              <ChakraIconButton
                aria-label="Optical Center"
                icon={<Target size={16} />}
                size="sm"
                onClick={toggleOpticalCenter}
                colorScheme={showOpticalCenter ? 'brand' : 'gray'}
                variant={showOpticalCenter ? 'solid' : 'ghost'}
                bg={showOpticalCenter ? undefined : 'transparent'}
              />
            </Tooltip>

            <Tooltip label="Show Metrics" fontSize="xs">
              <ChakraIconButton
                aria-label="Show Metrics"
                icon={<BarChart3 size={16} />}
                size="sm"
                onClick={toggleMetrics}
                colorScheme={showMetrics ? 'brand' : 'gray'}
                variant={showMetrics ? 'solid' : 'ghost'}
                bg={showMetrics ? undefined : 'transparent'}
              />
            </Tooltip>

            <Tooltip label="Show Distance Rules" fontSize="xs">
              <ChakraIconButton
                aria-label="Show Distance Rules"
                icon={<Ruler size={16} />}
                size="sm"
                onClick={toggleDistanceRules}
                colorScheme={showDistanceRules ? 'brand' : 'gray'}
                variant={showDistanceRules ? 'solid' : 'ghost'}
                bg={showDistanceRules ? undefined : 'transparent'}
              />
            </Tooltip>

            <Button
              onClick={handlePreviewAlignment}
              isDisabled={!canPerformOpticalAlignment()}
              colorScheme="brand"
              size="sm"
              variant="ghost"
              bg="transparent"
              border="1px solid"
              borderColor="gray.300"
            >
              Preview
            </Button>

            <Tooltip label="Reset" fontSize="xs">
              <ChakraIconButton
                aria-label="Reset"
                icon={<RotateCcw size={16} />}
                size="sm"
                onClick={handleResetAlignment}
                isDisabled={!hasAlignment}
                variant="ghost"
                bg="transparent"
              />
            </Tooltip>
          </HStack>

          {/* Metrics Display */}
          {showMetrics && currentAlignment && (
            <Box fontSize="xs">
              <Grid templateColumns="1fr 1fr" gap={1} mb={1}>
                <GridItem>
                  <Text color="gray.600" fontSize="xs">Math Center:</Text>
                  <Text fontFamily="mono" fontSize="2xs">
                    ({currentAlignment.metrics.mathematicalCenter.x.toFixed(1)}, {currentAlignment.metrics.mathematicalCenter.y.toFixed(1)})
                  </Text>
                </GridItem>
                <GridItem>
                  <Text color="gray.600" fontSize="xs">Optical Center:</Text>
                  <Text fontFamily="mono" fontSize="2xs">
                    ({currentAlignment.metrics.opticalCenter.x.toFixed(1)}, {currentAlignment.metrics.opticalCenter.y.toFixed(1)})
                  </Text>
                </GridItem>
              </Grid>

              {currentAlignment.content.length > 0 && (
                <Box mt={1} pt={1} borderTop="1px solid" borderColor="gray.200">
                  {/* Container Information */}
                  <Box mb={2}>
                    <Text color="gray.600" mb={1} fontWeight="bold" fontSize="xs">
                      Container - {currentAlignment.container.geometry.shapeClassification}:
                    </Text>
                    
                    {/* Basic Geometry */}
                    <Box fontSize="2xs" mb={1}>
                      <Text fontFamily="mono">
                        Area: {currentAlignment.container.geometry.area.toFixed(1)}px², 
                        Perimeter: {currentAlignment.container.geometry.perimeter.toFixed(1)}px
                      </Text>
                      <Text fontFamily="mono">
                        Bounds: [{currentAlignment.container.geometry.bounds.minX.toFixed(1)}, {currentAlignment.container.geometry.bounds.minY.toFixed(1)}] → [{currentAlignment.container.geometry.bounds.maxX.toFixed(1)}, {currentAlignment.container.geometry.bounds.maxY.toFixed(1)}]
                      </Text>
                      <Text fontFamily="mono">
                        Centroid: ({currentAlignment.container.geometry.centroid.x.toFixed(1)}, {currentAlignment.container.geometry.centroid.y.toFixed(1)})
                      </Text>
                    </Box>

                    {/* Advanced Geometry */}
                    <Box fontSize="2xs" mb={1}>
                      <Text fontFamily="mono">
                        Compactness: {currentAlignment.container.geometry.compactness.toFixed(3)}, 
                        Vertices: {currentAlignment.container.geometry.vertexCount}
                      </Text>
                      <Text fontFamily="mono">
                        Quadrant Weights: TL:{currentAlignment.container.geometry.quadrantWeights.topLeft.toFixed(2)} TR:{currentAlignment.container.geometry.quadrantWeights.topRight.toFixed(2)} BL:{currentAlignment.container.geometry.quadrantWeights.bottomLeft.toFixed(2)} BR:{currentAlignment.container.geometry.quadrantWeights.bottomRight.toFixed(2)}
                      </Text>
                      <Text fontFamily="mono">
                        Directional Bias: H:{currentAlignment.container.geometry.directionalBias.horizontal.toFixed(2)} V:{currentAlignment.container.geometry.directionalBias.vertical.toFixed(2)}
                      </Text>
                    </Box>

                    {/* Visual Properties */}
                    <Box fontSize="2xs">
                      <Text fontFamily="mono">
                        Stroke: {currentAlignment.container.geometry.visualProperties.strokeWidth}px {currentAlignment.container.geometry.visualProperties.strokeColor} ({(currentAlignment.container.geometry.visualProperties.strokeOpacity * 100).toFixed(0)}%)
                      </Text>
                      <Text fontFamily="mono">
                        Fill: {currentAlignment.container.geometry.visualProperties.fillColor} ({(currentAlignment.container.geometry.visualProperties.fillOpacity * 100).toFixed(0)}%)
                      </Text>
                      <Text fontFamily="mono">
                        Visual: Intensity {currentAlignment.container.geometry.visualProperties.visualIntensity.toFixed(2)}, Contrast {currentAlignment.container.geometry.visualProperties.contrastWeight.toFixed(2)}
                      </Text>
                    </Box>
                  </Box>

                  {/* Content Information */}
                  <Box mt={2} pt={2} borderTop="1px solid" borderColor="gray.200">
                    <Text color="gray.600" mb={1} fontWeight="bold" fontSize="xs">
                      Content Item - {currentAlignment.content[0].geometry.shapeClassification}:
                    </Text>
                    
                    {(() => {
                      const item = currentAlignment.content[0];
                      return (
                        <Box>
                          {/* Basic Geometry */}
                          <Box fontSize="2xs" mb={1}>
                            <Text fontFamily="mono">
                              Area: {item.geometry.area.toFixed(1)}px², 
                              Perimeter: {item.geometry.perimeter.toFixed(1)}px
                            </Text>
                            <Text fontFamily="mono">
                              Bounds: [{item.geometry.bounds.minX.toFixed(1)}, {item.geometry.bounds.minY.toFixed(1)}] → [{item.geometry.bounds.maxX.toFixed(1)}, {item.geometry.bounds.maxY.toFixed(1)}]
                            </Text>
                            <Text fontFamily="mono">
                              Centroid: ({item.geometry.centroid.x.toFixed(1)}, {item.geometry.centroid.y.toFixed(1)})
                            </Text>
                            <Text fontFamily="mono">
                              Optical Center: ({item.opticalCenter.x.toFixed(1)}, {item.opticalCenter.y.toFixed(1)})
                            </Text>
                          </Box>

                          {/* Advanced Geometry */}
                          <Box fontSize="2xs" mb={1}>
                            <Text fontFamily="mono">
                              Compactness: {item.geometry.compactness.toFixed(3)}, 
                              Vertices: {item.geometry.vertexCount}
                            </Text>
                            <Text fontFamily="mono">
                              Quadrant Weights: TL:{item.geometry.quadrantWeights.topLeft.toFixed(2)} TR:{item.geometry.quadrantWeights.topRight.toFixed(2)} BL:{item.geometry.quadrantWeights.bottomLeft.toFixed(2)} BR:{item.geometry.quadrantWeights.bottomRight.toFixed(2)}
                            </Text>
                            <Text fontFamily="mono">
                              Directional Bias: H:{item.geometry.directionalBias.horizontal.toFixed(2)} V:{item.geometry.directionalBias.vertical.toFixed(2)}
                            </Text>
                          </Box>

                          {/* Visual Properties */}
                          <Box fontSize="2xs" mb={1}>
                            <Text fontFamily="mono">
                              Stroke: {item.geometry.visualProperties.strokeWidth}px {item.geometry.visualProperties.strokeColor} ({(item.geometry.visualProperties.strokeOpacity * 100).toFixed(0)}%)
                            </Text>
                            <Text fontFamily="mono">
                              Fill: {item.geometry.visualProperties.fillColor} ({(item.geometry.visualProperties.fillOpacity * 100).toFixed(0)}%)
                            </Text>
                            <Text fontFamily="mono">
                              Visual: Intensity {item.geometry.visualProperties.visualIntensity.toFixed(2)}, Contrast {item.geometry.visualProperties.contrastWeight.toFixed(2)}
                            </Text>
                          </Box>

                          {/* Weight Information */}
                          <Box fontSize="2xs">
                            <Text fontFamily="mono">
                              Visual Weight: {item.visualWeight.toFixed(2)}
                            </Text>
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </VStack>
      )}
    </Panel>
  );
};