import React, { useRef, useState } from 'react';
import {
  VStack,
  Button,
  Text,
  Box,
  Grid,
  GridItem,
  Checkbox,
  Divider,
  HStack,
  Progress,
  Badge,
  useToast,
  Input,
  Collapse,
  IconButton
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../ui/Panel';
import {
  Target,
  Brain,
  Plus,
  Trash2,
  Play,
  Download,
  Upload,
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const OpticalAlignmentPanelComponent: React.FC = () => {
  // Subscribe only to specific primitives and minimal state to prevent re-renders
  const showMathematicalCenter = useCanvasStore(state => state.showMathematicalCenter);
  const showOpticalCenter = useCanvasStore(state => state.showOpticalCenter);
  const showMetrics = useCanvasStore(state => state.showMetrics);
  const showDistanceRules = useCanvasStore(state => state.showDistanceRules);
  const hasAlignment = useCanvasStore(state => state.currentAlignment !== null);
  const validationMessage = useCanvasStore(state => state.getAlignmentValidationMessage());
  
  // ML state
  const mlModel = useCanvasStore(state => state.mlModel);
  const trainingSamples = useCanvasStore(state => state.trainingSamples);
  const isTraining = useCanvasStore(state => state.isTraining);
  const trainingProgress = useCanvasStore(state => state.trainingProgress);
  const trainingLoss = useCanvasStore(state => state.trainingLoss);
  const useMlPrediction = useCanvasStore(state => state.useMlPrediction);
  
  // Local state for Advanced ML collapse
  const [isAdvancedMLOpen, setIsAdvancedMLOpen] = useState(false);
  
  const toast = useToast();
  const modelJsonInputRef = useRef<HTMLInputElement>(null);
  const modelWeightsInputRef = useRef<HTMLInputElement>(null);
  
  // Get current alignment only when needed for display (doesn't cause re-renders on movement)
  const currentAlignment = hasAlignment ? useCanvasStore.getState().currentAlignment : null;
  
  // Get actions from getState (doesn't cause re-renders)
  const {
    applyAlignment,
    previewAlignment,
    resetAlignment,
    toggleMathematicalCenter,
    toggleOpticalCenter,
    toggleMetrics,
    toggleDistanceRules,
    canPerformOpticalAlignment,
    // ML actions
    addTrainingSample,
    addAllTrainingSamples,
    applyMLToAllPairs,
    clearTrainingSamples,
    trainMLModel,
    applyMLPrediction,
    saveMLModel,
    loadMLModel,
    loadPretrainedMLModel,
    downloadMLModel,
    uploadMLModel,
    deleteMLModel,
    toggleMLPrediction,
  } = useCanvasStore.getState();

  // Handle unified Preview/Apply button
  const handlePreviewOrApply = () => {
    if (hasAlignment) {
      // If already previewing, apply the alignment
      applyAlignment();
      // After applying, show preview again to maintain visual feedback
      previewAlignment();
    } else {
      // If not previewing yet, show preview
      if (!canPerformOpticalAlignment()) return;
      previewAlignment();
    }
  };

  // Reset alignment
  const handleResetAlignment = () => {
    resetAlignment();
  };
  
  // ML Handlers
  const handleAddTrainingSample = async () => {
    try {
      await addTrainingSample();
      toast({
        title: 'Training sample added',
        description: `Total samples: ${trainingSamples.length + 1}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to add training sample',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleAddAllTrainingSamples = async () => {
    try {
      const beforeCount = trainingSamples.length;
      await addAllTrainingSamples();
      const afterCount = useCanvasStore.getState().trainingSamples.length;
      const added = afterCount - beforeCount;
      
      if (added > 0) {
        toast({
          title: 'Training samples added',
          description: `Added ${added} samples. Total: ${afterCount}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'No samples found',
          description: 'No valid container-content pairs found on canvas',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to add training samples',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleTrainModel = async () => {
    if (trainingSamples.length < 5) {
      toast({
        title: 'Insufficient samples',
        description: 'Need at least 5 training samples',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      await trainMLModel();
      toast({
        title: 'Training complete',
        description: 'Model trained successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Training failed',
        description: 'Failed to train model',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleApplyMLPrediction = async () => {
    try {
      await applyMLPrediction();
    } catch (_error) {
      toast({
        title: 'Prediction failed',
        description: 'Failed to apply ML prediction',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleSaveModel = async () => {
    try {
      await saveMLModel();
      toast({
        title: 'Model saved',
        description: 'Model saved to browser storage',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Save failed',
        description: 'Failed to save model',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleLoadModel = async () => {
    try {
      await loadMLModel();
      toast({
        title: 'Model loaded',
        description: 'Model loaded from browser storage',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Load failed',
        description: 'No saved model found',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleDownloadModel = async () => {
    try {
      await downloadMLModel();
      toast({
        title: 'Model downloaded',
        description: 'Model files downloaded',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Download failed',
        description: 'Failed to download model',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleLoadPretrainedModel = async () => {
    try {
      await loadPretrainedMLModel();
      toast({
        title: 'Pre-trained model loaded',
        description: 'Default optical alignment model loaded successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Load failed',
        description: 'Failed to load pre-trained model from server',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleUploadModel = async () => {
    const jsonFile = modelJsonInputRef.current?.files?.[0];
    const weightsFile = modelWeightsInputRef.current?.files?.[0];
    
    if (!jsonFile || !weightsFile) {
      toast({
        title: 'Missing files',
        description: 'Please select both model.json and weights.bin files',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      await uploadMLModel(jsonFile, weightsFile);
      toast({
        title: 'Model uploaded',
        description: 'Model loaded successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload model',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleApplyMLToAll = async () => {
    if (!mlModel) {
      toast({
        title: 'No model',
        description: 'Please train or load a model first',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      const count = await applyMLToAllPairs();
      toast({
        title: 'ML alignment applied',
        description: `Applied ML alignment to ${count} container-content pairs`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (_error) {
      toast({
        title: 'Apply failed',
        description: 'Failed to apply ML alignment to all pairs',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleResetMLSystem = () => {
    // Reset ML model and prediction mode
    useCanvasStore.setState({ mlModel: null, useMlPrediction: false });
    
    toast({
      title: 'ML System Reset',
      description: 'Model cleared. System ready for new training or loading.',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  if (validationMessage !== null) return null;

  return (
    <Panel 
      icon={<Target size={16} />} 
      title="Optical Alignment"
      headerActions={
        <Button
          onClick={handlePreviewOrApply}
          isDisabled={!canPerformOpticalAlignment() && !hasAlignment}
          size="xs"
          variant="outline"
          fontSize="12px"
          py={0}
          colorScheme="gray"
        >
          {hasAlignment ? 'Apply' : 'Preview'}
        </Button>
      }
    >
      {/* Controls */}
      {canPerformOpticalAlignment() && (
        <VStack spacing={3} align="stretch">
          {/* Visualization Controls */}
          <VStack spacing={2} align="stretch">
            <Checkbox
              size="sm"
              isChecked={showMathematicalCenter}
              onChange={toggleMathematicalCenter}
              sx={{
                '& .chakra-checkbox__control': {
                  bg: showMathematicalCenter ? 'blue.500' : 'transparent',
                  borderColor: showMathematicalCenter ? 'blue.500' : 'gray.400',
                  _checked: {
                    bg: 'blue.500',
                    borderColor: 'blue.500',
                    color: 'white',
                    _hover: {
                      bg: 'blue.600',
                      borderColor: 'blue.600',
                    }
                  },
                  _hover: {
                    bg: showMathematicalCenter ? 'blue.600' : 'gray.50',
                    borderColor: showMathematicalCenter ? 'blue.600' : 'gray.400',
                  }
                }
              }}
            >
              <Text fontSize="xs">Show Mathematical Center</Text>
            </Checkbox>

            <Checkbox
              size="sm"
              isChecked={showOpticalCenter}
              onChange={toggleOpticalCenter}
              sx={{
                '& .chakra-checkbox__control': {
                  bg: showOpticalCenter ? 'blue.500' : 'transparent',
                  borderColor: showOpticalCenter ? 'blue.500' : 'gray.400',
                  _checked: {
                    bg: 'blue.500',
                    borderColor: 'blue.500',
                    color: 'white',
                    _hover: {
                      bg: 'blue.600',
                      borderColor: 'blue.600',
                    }
                  },
                  _hover: {
                    bg: showOpticalCenter ? 'blue.600' : 'gray.50',
                    borderColor: showOpticalCenter ? 'blue.600' : 'gray.400',
                  }
                }
              }}
            >
              <Text fontSize="xs">Show Optical Center</Text>
            </Checkbox>

            <Checkbox
              size="sm"
              isChecked={showMetrics}
              onChange={toggleMetrics}
              sx={{
                '& .chakra-checkbox__control': {
                  bg: showMetrics ? 'blue.500' : 'transparent',
                  borderColor: showMetrics ? 'blue.500' : 'gray.400',
                  _checked: {
                    bg: 'blue.500',
                    borderColor: 'blue.500',
                    color: 'white',
                    _hover: {
                      bg: 'blue.600',
                      borderColor: 'blue.600',
                    }
                  },
                  _hover: {
                    bg: showMetrics ? 'blue.600' : 'gray.50',
                    borderColor: showMetrics ? 'blue.600' : 'gray.400',
                  }
                }
              }}
            >
              <Text fontSize="xs">Show Metric</Text>
            </Checkbox>

            <Checkbox
              size="sm"
              isChecked={showDistanceRules}
              onChange={toggleDistanceRules}
              sx={{
                '& .chakra-checkbox__control': {
                  bg: showDistanceRules ? 'blue.500' : 'transparent',
                  borderColor: showDistanceRules ? 'blue.500' : 'gray.400',
                  _checked: {
                    bg: 'blue.500',
                    borderColor: 'blue.500',
                    color: 'white',
                    _hover: {
                      bg: 'blue.600',
                      borderColor: 'blue.600',
                    }
                  },
                  _hover: {
                    bg: showDistanceRules ? 'blue.600' : 'gray.50',
                    borderColor: showDistanceRules ? 'blue.600' : 'gray.400',
                  }
                }
              }}
            >
              <Text fontSize="xs">Show Distance Rules</Text>
            </Checkbox>
          </VStack>

          {/* Reset Button */}
          <Button
            onClick={handleResetAlignment}
            isDisabled={!hasAlignment}
            size="sm"
            variant="outline"
            colorScheme="gray"
            fontSize="xs"
            w="full"
          >
            Reset
          </Button>

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
          
          {/* ML Section - Simplified Operations */}
          <Divider />
          
          <Box>
            <HStack justify="space-between" mb={2}>
              <HStack>
                <Brain size={14} />
                <Text fontSize="xs" fontWeight="bold">Machine Learning</Text>
              </HStack>
              {mlModel && (
                <Badge colorScheme="green" fontSize="2xs">Model Ready</Badge>
              )}
            </HStack>
            
            <VStack spacing={2} align="stretch">
              {/* Load Default Model */}
              {!mlModel && (
                <Button
                  size="sm"
                  variant="solid"
                  colorScheme="green"
                  leftIcon={<Brain size={14} />}
                  onClick={handleLoadPretrainedModel}
                  fontSize="xs"
                >
                  Load Default Model
                </Button>
              )}
              
              {/* ML Prediction Toggle */}
              {mlModel && (
                <Checkbox
                  size="sm"
                  isChecked={useMlPrediction}
                  onChange={toggleMLPrediction}
                  fontSize="xs"
                >
                  Use ML Prediction
                </Checkbox>
              )}
              
              {/* Apply ML Prediction */}
              {mlModel && useMlPrediction && (
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="purple"
                  leftIcon={<Brain size={14} />}
                  onClick={handleApplyMLPrediction}
                  isDisabled={!canPerformOpticalAlignment()}
                  fontSize="xs"
                >
                  Apply ML Prediction
                </Button>
              )}
              
              {/* Apply ML to All Pairs */}
              {mlModel && (
                <Button
                  size="sm"
                  variant="solid"
                  colorScheme="purple"
                  leftIcon={<Brain size={14} />}
                  onClick={handleApplyMLToAll}
                  fontSize="xs"
                >
                  Apply ML to All Pairs
                </Button>
              )}
            </VStack>
          </Box>
          
          {/* Advanced ML Section - Collapsible */}
          <Divider />
          
          <Box>
            <HStack
              justify="space-between"
              cursor="pointer"
              onClick={() => setIsAdvancedMLOpen(!isAdvancedMLOpen)}
              _hover={{ bg: 'gray.50' }}
              p={1}
              borderRadius="md"
              mb={2}
            >
              <HStack>
                <Text fontSize="xs" fontWeight="bold">Advanced ML</Text>
                <Text fontSize="2xs" color="gray.500">
                  (Training & Model Management)
                </Text>
              </HStack>
              <IconButton
                aria-label="Toggle Advanced ML"
                icon={isAdvancedMLOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                size="xs"
                variant="ghost"
              />
            </HStack>
            
            <Collapse in={isAdvancedMLOpen} animateOpacity>
              <VStack spacing={3} align="stretch" pt={2}>
                {/* Training Section */}
                <Box>
                  <Text fontSize="2xs" fontWeight="bold" color="gray.600" mb={2}>
                    Training Samples: {trainingSamples.length}
                  </Text>
                  
                  <VStack spacing={2} align="stretch">
                    {trainingSamples.length > 0 && (
                      <Button
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        leftIcon={<Trash2 size={12} />}
                        onClick={() => clearTrainingSamples()}
                        fontSize="2xs"
                      >
                        Clear All Samples
                      </Button>
                    )}
                    
                    <Button
                      size="xs"
                      variant="outline"
                      leftIcon={<Plus size={12} />}
                      onClick={handleAddTrainingSample}
                      isDisabled={!hasAlignment}
                      fontSize="2xs"
                    >
                      Add Current as Sample
                    </Button>
                    
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="green"
                      leftIcon={<Target size={12} />}
                      onClick={handleAddAllTrainingSamples}
                      fontSize="2xs"
                    >
                      Add All Valid Pairs
                    </Button>
                    
                    {isTraining && (
                      <Box>
                        <Progress value={trainingProgress} size="sm" colorScheme="blue" />
                        <Text fontSize="2xs" color="gray.600" mt={1}>
                          Training: {trainingProgress.toFixed(0)}%
                          {trainingLoss !== null && ` (Loss: ${trainingLoss.toFixed(4)})`}
                        </Text>
                      </Box>
                    )}
                    
                    <Button
                      size="xs"
                      variant="solid"
                      colorScheme="blue"
                      leftIcon={<Play size={12} />}
                      onClick={handleTrainModel}
                      isDisabled={trainingSamples.length < 5 || isTraining}
                      fontSize="2xs"
                    >
                      Train Model ({trainingSamples.length}/5 min)
                    </Button>
                  </VStack>
                </Box>
                
                <Divider />
                
                {/* Model Management */}
                <Box>
                  <Text fontSize="2xs" fontWeight="bold" color="gray.600" mb={2}>
                    Model Management
                  </Text>
                  
                  <VStack spacing={2} align="stretch">
                    {/* Save/Load to Browser Storage */}
                    <HStack spacing={2}>
                      <Button
                        size="xs"
                        variant="outline"
                        leftIcon={<Save size={12} />}
                        onClick={handleSaveModel}
                        isDisabled={!mlModel}
                        flex={1}
                        fontSize="2xs"
                      >
                        Save
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        leftIcon={<Upload size={12} />}
                        onClick={handleLoadModel}
                        flex={1}
                        fontSize="2xs"
                      >
                        Load
                      </Button>
                    </HStack>
                    
                    {/* Download Model */}
                    <Button
                      size="xs"
                      variant="outline"
                      leftIcon={<Download size={12} />}
                      onClick={handleDownloadModel}
                      isDisabled={!mlModel}
                      fontSize="2xs"
                    >
                      Download Model Files
                    </Button>
                    
                    {/* Upload Model */}
                    <Box>
                      <Text fontSize="2xs" color="gray.600" mb={1}>Upload Custom Model:</Text>
                      <VStack spacing={1} align="stretch">
                        <Input
                          ref={modelJsonInputRef}
                          type="file"
                          accept=".json"
                          size="xs"
                          fontSize="2xs"
                          placeholder="model.json"
                        />
                        <Input
                          ref={modelWeightsInputRef}
                          type="file"
                          accept=".bin"
                          size="xs"
                          fontSize="2xs"
                          placeholder="weights.bin"
                        />
                        <Button
                          size="xs"
                          variant="solid"
                          colorScheme="blue"
                          onClick={handleUploadModel}
                          fontSize="2xs"
                        >
                          Upload Model
                        </Button>
                      </VStack>
                    </Box>
                    
                    {/* Delete Model */}
                    {mlModel && (
                      <Button
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        leftIcon={<Trash2 size={12} />}
                        onClick={() => deleteMLModel()}
                        fontSize="2xs"
                      >
                        Delete Saved Model
                      </Button>
                    )}
                    
                    {/* Reset ML System */}
                    {mlModel && (
                      <Button
                        size="xs"
                        variant="outline"
                        colorScheme="orange"
                        leftIcon={<Trash2 size={12} />}
                        onClick={handleResetMLSystem}
                        fontSize="2xs"
                      >
                        Reset ML System
                      </Button>
                    )}
                  </VStack>
                </Box>
              </VStack>
            </Collapse>
          </Box>
        </VStack>
      )}
    </Panel>
  );
};
// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when alignment state or visualization toggles change
export const OpticalAlignmentPanel = React.memo(OpticalAlignmentPanelComponent);
