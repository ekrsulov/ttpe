import React, { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { extractEditablePoints, getControlPointAlignmentInfo } from '../../utils/path';
import type { Command, Point, ControlPoint } from '../../types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  VStack,
  HStack,
  Box,
  Text,
  IconButton as ChakraIconButton,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Collapse,
  useDisclosure,
  Divider
} from '@chakra-ui/react';
import ConditionalTooltip from '../../components/ui/ConditionalTooltip';
import { Panel } from '../../components/ui/Panel';

export const ControlPointAlignmentPanel: React.FC = () => {
  // ALL HOOKS FIRST - must be called unconditionally
  const { isOpen: showDetails, onToggle: toggleDetails } = useDisclosure({ defaultIsOpen: false });
  
  // Use individual selectors to prevent unnecessary re-renders
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const allElements = useCanvasStore(state => state.elements);
  
  // Filter elements in useMemo to avoid recalculation and infinite loops
  const elements = useMemo(() => {
    if ((selectedCommands?.length ?? 0) === 0) return allElements;
    if (!selectedCommands) return allElements;
    const selectedElementIds = [...new Set(selectedCommands.map(cmd => cmd.elementId))];
    return allElements.filter(el => selectedElementIds.includes(el.id));
  }, [allElements, selectedCommands]);
  
  const deleteZCommandForMPoint = useCanvasStore(state => state.deleteZCommandForMPoint);
  const convertZToLineForMPoint = useCanvasStore(state => state.convertZToLineForMPoint);
  const moveToM = useCanvasStore(state => state.moveToM);
  const convertCommandType = useCanvasStore(state => state.convertCommandType);
  const cutSubpathAtPoint = useCanvasStore(state => state.cutSubpathAtPoint);
  const setControlPointAlignmentType = useCanvasStore(state => state.setControlPointAlignmentType);

  /**
   * Helper function to retrieve path commands with validation
   * Centralizes the shared retrieval/validation logic used by multiple callbacks
   */
  const withPathCommands = useCallback(<T,>(
    elementId: string,
    commandIndex: number,
    callback: (commands: Command[], command: Command) => T,
    fallbackValue: T
  ): T => {
    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return fallbackValue;

    const pathData = element.data as import('../../types').PathData;
    const commands = pathData.subPaths.flat();

    const command = commands[commandIndex];
    if (!command) return fallbackValue;

    return callback(commands, command);
  }, [elements]);

  // Check if selected M point has a closing Z command
  const hasClosingZCommand = useCallback((elementId: string, commandIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      // Check if the command at commandIndex is an M command
      if (command.type !== 'M') return false;

      // Look for Z commands after this M command
      for (let i = commandIndex + 1; i < commands.length; i++) {
        if (commands[i].type === 'Z') {
          // Check if this Z closes to our M point
          // A Z closes to the last M before it
          let lastMIndex = -1;
          for (let j = i - 1; j >= 0; j--) {
            if (commands[j].type === 'M') {
              lastMIndex = j;
              break;
            }
          }

          if (lastMIndex === commandIndex) {
            return true;
          }
        } else if (commands[i].type === 'M') {
          // If we hit another M, stop looking
          break;
        }
      }

      return false;
    }, false);
  }, [withPathCommands]);

  // Check if selected point is the last point of its subpath
  const isLastPointOfSubpath = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      // Check if this is the last point of the command
      const pointsLength = command.type === 'M' || command.type === 'L' ? 1 : command.type === 'C' ? 3 : 0;
      const isLastPoint = pointIndex === pointsLength - 1;
      if (!isLastPoint) return false;

      // Check if this is the last command in the path or before a Z/M
      const isLastCommandInSubpath = commandIndex === commands.length - 1 ||
        commands[commandIndex + 1].type === 'M' ||
        commands[commandIndex + 1].type === 'Z';

      return isLastCommandInSubpath;
    }, false);
  }, [withPathCommands]);

  // Check if selected point is already at the same position as the M of its subpath
  const isAtMPosition = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      // Find the M command for this subpath (the last M before this command)
      let subpathMIndex = -1;
      for (let i = commandIndex - 1; i >= 0; i--) {
        if (commands[i].type === 'M') {
          subpathMIndex = i;
          break;
        }
      }

      if (subpathMIndex === -1) return false;

      // Get the point to check
      let pointToCheck: Point | null = null;
      if (command.type === 'M' || command.type === 'L') {
        if (pointIndex === 0) pointToCheck = command.position;
      } else if (command.type === 'C') {
        if (pointIndex === 0) pointToCheck = command.controlPoint1;
        else if (pointIndex === 1) pointToCheck = command.controlPoint2;
        else if (pointIndex === 2) pointToCheck = command.position;
      }
      const mPosition = (commands[subpathMIndex] as Command & { type: 'M' }).position;

      if (!pointToCheck || !mPosition) return false;

      // Check if they are at the same position (with small tolerance for floating point)
      const tolerance = 0.1;
      return Math.abs(pointToCheck.x - mPosition.x) < tolerance &&
        Math.abs(pointToCheck.y - mPosition.y) < tolerance;
    }, false);
  }, [withPathCommands]);

  // Check if cutting subpath at this point is allowed
  const canCutSubpathAtPoint = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      if (command.type !== 'L' && command.type !== 'C') return false;

      // Check if this is the anchor point (last point of the command)
      const pointsLength = command.type === 'L' ? 1 : command.type === 'C' ? 3 : 0;
      const isAnchorPoint = pointIndex === pointsLength - 1;
      if (!isAnchorPoint) return false;

      // Find the end of the current subpath
      let subpathEndIndex = commandIndex;
      for (let i = commandIndex + 1; i < commands.length; i++) {
        if (commands[i].type === 'M') {
          break;
        }
        subpathEndIndex = i;
      }

      // Don't allow cutting at the last command of the subpath
      if (commandIndex === subpathEndIndex) return false;

      // Check if there's a Z in this subpath
      let hasZInSubpath = false;
      for (let i = commandIndex; i <= subpathEndIndex; i++) {
        if (commands[i].type === 'Z') {
          hasZInSubpath = true;
          break;
        }
      }

      // If there's a Z, don't allow cutting at the second-to-last command
      if (hasZInSubpath && commandIndex === subpathEndIndex - 1) return false;

      return true;
    }, false);
  }, [withPathCommands]);

  // Get info for a single selected control point
  const getSinglePointInfo = useCallback(() => {
    if (activePlugin !== 'edit' || !selectedCommands || selectedCommands.length !== 1) {
      return null;
    }

    const cmd = selectedCommands[0];
    const element = elements.find(el => el.id === cmd.elementId);
    if (!element || element.type !== 'path') {
      return null;
    }

    const pathData = element.data as import('../../types').PathData;
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);
    const point = points.find((p: ControlPoint) => p.commandIndex === cmd.commandIndex && p.pointIndex === cmd.pointIndex);

    if (!point) {
      return null;
    }

    if (!point.isControl) {
      // It's an anchor point - show only basic information
      const command = commands[cmd.commandIndex];

      return {
        point,
        command,
        isAnchor: true,
        anchorType: 'basic',
        location: `${command.type} Command ${cmd.commandIndex}, Point ${cmd.pointIndex}`
      };
    } else {
      // Control point - calculate alignment info on-demand
      const alignmentInfo = getControlPointAlignmentInfo(commands, points, cmd.commandIndex, cmd.pointIndex);
      
      // Find paired control point if alignment info indicates it exists
      let pairedPoint: ControlPoint | null = null;
      if (alignmentInfo && alignmentInfo.pairedCommandIndex !== undefined && alignmentInfo.pairedPointIndex !== undefined) {
        pairedPoint = points.find((p: ControlPoint) =>
          p.commandIndex === alignmentInfo.pairedCommandIndex && p.pointIndex === alignmentInfo.pairedPointIndex
        ) || null;
      }

      // Calculate magnitudes and angles for display
      let mag1 = 0;
      let angle1 = 0;
      let mag2: number | undefined;
      let angle2: number | undefined;
      let anchor2: { x: number, y: number } | undefined;

      const anchor1 = point.anchor;
      const vector1 = { x: point.x - anchor1.x, y: point.y - anchor1.y };
      mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
      angle1 = Math.atan2(vector1.y, vector1.x) * 180 / Math.PI;

      if (pairedPoint) {
        anchor2 = pairedPoint.anchor;
        const vector2 = { x: pairedPoint.x - anchor2!.x, y: pairedPoint.y - anchor2!.y };
        mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        angle2 = Math.atan2(vector2.y, vector2.x) * 180 / Math.PI;
      }

      return {
        point,
        command: commands[cmd.commandIndex],
        info: alignmentInfo ? {
          commandIndex: point.commandIndex,
          pointIndex: point.pointIndex,
          type: alignmentInfo.type,
          pairedCommandIndex: alignmentInfo.pairedCommandIndex,
          pairedPointIndex: alignmentInfo.pairedPointIndex,
          anchor: alignmentInfo.anchor
        } : {
          commandIndex: point.commandIndex,
          pointIndex: point.pointIndex,
          type: 'independent' as const,
          anchor: point.anchor
        },
        pairedPoint,
        pairedInfo: pairedPoint && alignmentInfo ? {
          commandIndex: pairedPoint.commandIndex,
          pointIndex: pairedPoint.pointIndex,
          type: alignmentInfo.type,
          pairedCommandIndex: alignmentInfo.pairedCommandIndex,
          pairedPointIndex: alignmentInfo.pairedPointIndex,
          anchor: alignmentInfo.anchor
        } : null,
        calculatedType: alignmentInfo?.type || 'independent',
        mag1,
        angle1,
        mag2,
        angle2,
        anchor1,
        anchor2,
        isAnchor: false
      };
    }
  }, [activePlugin, selectedCommands, elements]);

  const singlePointInfo = useMemo(() => getSinglePointInfo(), [getSinglePointInfo]);

  // Early return AFTER all hooks: Only render when in edit mode and exactly one point is selected
  if (activePlugin !== 'edit' || !selectedCommands || selectedCommands.length !== 1) {
    return null;
  }

  // At this point, TypeScript knows selectedCommands is defined and has exactly one element
  const selectedCmd = selectedCommands[0];

  // Always show the panel, even when no control point is selected
  // if (!singlePointInfo) {
  //   return null;
  // }

  const handleAlignmentChange = (type: 'independent' | 'aligned' | 'mirrored') => {
    if (singlePointInfo && singlePointInfo.pairedPoint && setControlPointAlignmentType) {
      setControlPointAlignmentType(
        selectedCmd.elementId,
        selectedCmd.commandIndex,
        selectedCmd.pointIndex,
        singlePointInfo.pairedPoint.commandIndex,
        singlePointInfo.pairedPoint.pointIndex,
        type
      );
    }
  };

  const renderAlignmentButtons = () => {
    if (!singlePointInfo || singlePointInfo.isAnchor || !singlePointInfo.pairedPoint) {
      return null;
    }

    return (
      <VStack spacing={2} align="stretch" mb={2}>
        <HStack spacing={1}>
          <Button
            aria-label="Independent - Control points move freely"
            onClick={() => handleAlignmentChange('independent')}
            variant="unstyled"
            size="xs"
            bg={(singlePointInfo.info?.type || 'independent') === 'independent' ? 'blue.500' : 'transparent'}
            color={(singlePointInfo.info?.type || 'independent') === 'independent' ? 'white' : 'gray.700'}
            border="1px solid"
            borderColor={(singlePointInfo.info?.type || 'independent') === 'independent' ? 'blue.500' : 'gray.400'}
            borderRadius="md"
            fontWeight="medium"
            fontSize="10px"
            transition="all 0.2s"
            _hover={{
              bg: (singlePointInfo.info?.type || 'independent') === 'independent' ? 'blue.600' : 'gray.50'
            }}
            sx={{
              minH: '20px',
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Independent
          </Button>

          <Button
            aria-label="Aligned - Control points maintain opposite directions"
            onClick={() => handleAlignmentChange('aligned')}
            variant="unstyled"
            size="xs"
            bg={(singlePointInfo.info?.type || 'independent') === 'aligned' ? 'blue.500' : 'transparent'}
            color={(singlePointInfo.info?.type || 'independent') === 'aligned' ? 'white' : 'gray.700'}
            border="1px solid"
            borderColor={(singlePointInfo.info?.type || 'independent') === 'aligned' ? 'blue.500' : 'gray.400'}
            borderRadius="md"
            fontWeight="medium"
            fontSize="10px"
            transition="all 0.2s"
            _hover={{
              bg: (singlePointInfo.info?.type || 'independent') === 'aligned' ? 'blue.600' : 'gray.50'
            }}
            sx={{
              minH: '20px',
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Aligned
          </Button>

          <Button
            aria-label="Mirrored - Control points are perfectly mirrored"
            onClick={() => handleAlignmentChange('mirrored')}
            variant="unstyled"
            size="xs"
            bg={(singlePointInfo.info?.type || 'independent') === 'mirrored' ? 'blue.500' : 'transparent'}
            color={(singlePointInfo.info?.type || 'independent') === 'mirrored' ? 'white' : 'gray.700'}
            border="1px solid"
            borderColor={(singlePointInfo.info?.type || 'independent') === 'mirrored' ? 'blue.500' : 'gray.400'}
            borderRadius="md"
            fontWeight="medium"
            fontSize="10px"
            transition="all 0.2s"
            _hover={{
              bg: (singlePointInfo.info?.type || 'independent') === 'mirrored' ? 'blue.600' : 'gray.50'
            }}
            sx={{
              minH: '20px',
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Mirrored
          </Button>

          <Box ml="auto">
            <ConditionalTooltip label={showDetails ? "Hide Details" : "Show Details"}>
              <ChakraIconButton
                aria-label={showDetails ? "Hide Details" : "Show Details"}
                icon={showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                onClick={toggleDetails}
                variant="ghost"
                size="xs"
                bg="transparent"
              />
            </ConditionalTooltip>
          </Box>
        </HStack>

        {/* Etiqueta descriptiva siempre visible */}
        <Text fontSize="12px" color="gray.600">
          {(singlePointInfo.info?.type || 'independent') === 'independent' && 'Points move independently'}
          {(singlePointInfo.info?.type || 'independent') === 'aligned' && 'Points maintain opposite directions'}
          {(singlePointInfo.info?.type || 'independent') === 'mirrored' && 'Points are mirrored across anchor'}
        </Text>
      </VStack>
    );
  };

  const renderDetailContent = () => {
    if (!singlePointInfo || !showDetails) return null;

    if (singlePointInfo.pairedPoint) {
      return (
        <Collapse in={showDetails} animateOpacity>
          <VStack spacing={2} align="stretch" fontSize="12px" color="gray.600" lineHeight="1.4">
            <Text><Text as="strong" color="gray.700">Point Index:</Text> {singlePointInfo.point.pointIndex}</Text>
            <Text><Text as="strong" color="gray.700">Anchor:</Text> ({singlePointInfo.anchor1?.x.toFixed(2) || '0'}, {singlePointInfo.anchor1?.y.toFixed(2) || '0'})</Text>
            <Text><Text as="strong" color="gray.700">Direction:</Text> {singlePointInfo.angle1?.toFixed(1) || '0'}°</Text>
            <Text><Text as="strong" color="gray.700">Size:</Text> {singlePointInfo.mag1?.toFixed(2) || '0'}</Text>
            <Text><Text as="strong" color="gray.700">Alignment:</Text> {singlePointInfo.info?.type || 'independent'}</Text>
            {singlePointInfo.pairedPoint && (
              <>
                <Text><Text as="strong" color="gray.700">Paired Point:</Text> ({singlePointInfo.pairedPoint.x.toFixed(2)}, {singlePointInfo.pairedPoint.y.toFixed(2)}) at command {singlePointInfo.pairedInfo?.commandIndex}, point {singlePointInfo.pairedInfo?.pointIndex}</Text>
                <Text><Text as="strong" color="gray.700">Paired Anchor:</Text> ({singlePointInfo.anchor2?.x.toFixed(2)}, {singlePointInfo.anchor2?.y.toFixed(2)})</Text>
                <TableContainer>
                  <Table size="sm" fontSize="12px" mt={2}>
                    <Thead>
                      <Tr>
                        <Th fontSize="12px" p={1} bg="gray.100" borderColor="gray.300" textTransform="none">Property</Th>
                        <Th fontSize="12px" p={1} bg="gray.100" borderColor="gray.300" textTransform="none">Current</Th>
                        <Th fontSize="12px" p={1} bg="gray.100" borderColor="gray.300" textTransform="none">Paired</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td fontSize="12px" p={1} borderColor="gray.300">Direction</Td>
                        <Td fontSize="12px" p={1} borderColor="gray.300">{singlePointInfo.angle1?.toFixed(1) || '0'}°</Td>
                        <Td fontSize="12px" p={1} borderColor="gray.300">{singlePointInfo.angle2?.toFixed(1) || '0'}°</Td>
                      </Tr>
                      <Tr>
                        <Td fontSize="12px" p={1} borderColor="gray.300">Size</Td>
                        <Td fontSize="12px" p={1} borderColor="gray.300">{singlePointInfo.mag1?.toFixed(2) || '0'}</Td>
                        <Td fontSize="12px" p={1} borderColor="gray.300">{singlePointInfo.mag2?.toFixed(2)}</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
              </>
            )}
          </VStack>
        </Collapse>
      );
    }

    return (
      <Collapse in={showDetails} animateOpacity>
        <VStack spacing={1} align="stretch" fontSize="12px" color="gray.600" lineHeight="1.4">
          <Text><Text as="strong" color="gray.700">Point Index:</Text> {singlePointInfo.point.pointIndex}</Text>
          <Text><Text as="strong" color="gray.700">Alignment:</Text> {singlePointInfo.info?.type || 'independent'}</Text>
        </VStack>
      </Collapse>
    );
  };

  return (
    <Box pb={0}>
        <Divider my={2} />
      <Panel title="Control Point Alignment" showRenderCount={true}>
        {renderAlignmentButtons()}
      
      {/* Always visible Position and Command info */}
      {singlePointInfo && (
        <VStack spacing={1} align="stretch" fontSize="12px" color="gray.600" lineHeight="1.4" mb={2}>
          <Text><Text as="strong" color="gray.700">Position:</Text> ({singlePointInfo.point.x.toFixed(2)}, {singlePointInfo.point.y.toFixed(2)})</Text>
          <Text><Text as="strong" color="gray.700">Command:</Text> {singlePointInfo.command.type} at index {singlePointInfo.point.commandIndex}</Text>
        </VStack>
      )}
      
      {renderDetailContent()}

      {/* Always visible anchor-specific actions */}
      {singlePointInfo && singlePointInfo.isAnchor && (
        <VStack spacing={2} align="stretch" fontSize="11px" color="gray.600" lineHeight="1.4">
          <Text><Text as="strong" color="gray.700">Location:</Text> {singlePointInfo.location}</Text>
          {hasClosingZCommand(selectedCmd.elementId, selectedCmd.commandIndex) && (
            <>
              <Button
                onClick={() => deleteZCommandForMPoint?.(selectedCmd.elementId, selectedCmd.commandIndex)}
                colorScheme="gray"
                size="xs"
                fontSize="12px"
                w="full"
                variant="outline"
                title="Delete the Z command that closes this path"
              >
                Delete Z Command
              </Button>
              <Button
                onClick={() => convertZToLineForMPoint?.(selectedCmd.elementId, selectedCmd.commandIndex)}
                colorScheme="gray"
                size="xs"
                fontSize="12px"
                w="full"
                variant="outline"
                title="Convert the Z command to a line command"
              >
                Convert Z to Line
              </Button>
            </>
          )}
          {(singlePointInfo.command.type === 'L' || singlePointInfo.command.type === 'C') &&
            isLastPointOfSubpath(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex) &&
            !isAtMPosition(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex) && (
              <Button
                onClick={() => moveToM?.(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex)}
                colorScheme="gray"
                size="xs"
                fontSize="12px"
                w="full"
                variant="outline"
                title="Move this point to start a new subpath"
              >
                Move to M
              </Button>
            )}
          {(singlePointInfo.command.type === 'L' || singlePointInfo.command.type === 'C') && (
            <Button
              onClick={() => convertCommandType?.(selectedCmd.elementId, selectedCmd.commandIndex)}
              colorScheme="gray"
              size="xs"
              fontSize="12px"
              w="full"
              variant="outline"
              title={`Change to ${singlePointInfo.command.type === 'L' ? 'Curve' : 'Line'}`}
            >
              Change to {singlePointInfo.command.type === 'L' ? 'Curve' : 'Line'}
            </Button>
          )}
          {(singlePointInfo.command.type === 'L' || singlePointInfo.command.type === 'C') &&
            canCutSubpathAtPoint(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex) && (
              <Button
                onClick={() => cutSubpathAtPoint?.(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex)}
                colorScheme="gray"
                size="xs"
                fontSize="12px"
                w="full"
                variant="outline"
                title="Cut the subpath at this point, creating two separate subpaths"
              >
                Cut Subpath
              </Button>
            )}
        </VStack>
      )}
    </Panel>
    </Box>
  );
};