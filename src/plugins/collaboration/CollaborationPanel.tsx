import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Input,
  VStack,
  HStack,
  Text,
  useToast,
  IconButton,
  Badge,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { Users, X } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { getCollaborationManager } from './collaborationManagerInstance';
import { CollaborationManager } from './CollaborationManager';
import type { CollaborationUser } from '../../types/collaboration';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';

const USER_NAME_STORAGE_KEY = 'collaboration-user-name';

export const CollaborationPanel: React.FC = () => {
  const toast = useToast();
  const [userName, setUserName] = useState('');
  const [sessionIdInput, setSessionIdInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const collaboration = useCanvasStore((state) => state.collaboration);
  const isEnabled = collaboration?.isEnabled || false;
  const isConnected = collaboration?.isConnected || false;
  const sessionId = collaboration?.sessionId || null;
  const users = collaboration?.users || {};
  const error = collaboration?.error;

  // Ref to prevent duplicate toasts
  const joinToastShown = useRef(false);

  // Load saved username from localStorage on mount
  useEffect(() => {
    const savedUserName = localStorage.getItem(USER_NAME_STORAGE_KEY);
    if (savedUserName) {
      setUserName(savedUserName);
    }
  }, []);

  // Check for session in URL and auto-join if username is saved
  useEffect(() => {
    const urlSessionId = CollaborationManager.getSessionFromUrl();
    if (urlSessionId && !isEnabled && !isConnecting) {
      setSessionIdInput(urlSessionId);
      
      const savedUserName = localStorage.getItem(USER_NAME_STORAGE_KEY);
      if (savedUserName) {
        // Auto-join with saved username
        setUserName(savedUserName);
        setIsConnecting(true);
        
        const collaborationManager = getCollaborationManager();
        collaborationManager.connect(urlSessionId, savedUserName)
          .then(() => {
            if (!joinToastShown.current) {
              toast({
                title: 'Joined session',
                description: 'You are now collaborating',
                status: 'success',
                duration: 4000,
              });
              joinToastShown.current = true;
            }
          })
          .catch((err) => {
            console.error('Failed to auto-join session:', err);
            toast({
              title: 'Connection failed',
              description: err instanceof Error ? err.message : 'Could not join session',
              status: 'error',
              duration: 5000,
            });
          })
          .finally(() => {
            setIsConnecting(false);
          });
      } else {
        // No saved username, show prompt
        toast({
          title: 'Session link detected',
          description: 'Enter your name and click Join to collaborate',
          status: 'info',
          duration: 5000,
        });
      }
    }
  }, [toast, isEnabled, isConnecting]);

  const handleStartSession = async () => {
    if (!userName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your name',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Save username to localStorage
      localStorage.setItem(USER_NAME_STORAGE_KEY, userName.trim());

      // Get global collaboration manager
      const collaborationManager = getCollaborationManager();

      // Generate new session ID
      const newSessionId = CollaborationManager.generateSessionId();
      await collaborationManager.connect(newSessionId, userName);

      // Update URL
      const sessionUrl = CollaborationManager.createSessionUrl(newSessionId);
      window.history.pushState({}, '', sessionUrl);

      if (!joinToastShown.current) {
        toast({
          title: 'Session started',
          description: 'Share the URL to invite collaborators',
          status: 'success',
          duration: 4000,
        });
        joinToastShown.current = true;
      }
    } catch (err) {
      console.error('Failed to start session:', err);
      toast({
        title: 'Connection failed',
        description: err instanceof Error ? err.message : 'Could not start session',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinSession = async () => {
    if (!userName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your name',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!sessionIdInput.trim()) {
      toast({
        title: 'Session ID required',
        description: 'Please enter a session ID',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Save username to localStorage
      localStorage.setItem(USER_NAME_STORAGE_KEY, userName.trim());

      // Get global collaboration manager
      const collaborationManager = getCollaborationManager();

      await collaborationManager.connect(sessionIdInput, userName);

      // Update URL
      const sessionUrl = CollaborationManager.createSessionUrl(sessionIdInput);
      window.history.pushState({}, '', sessionUrl);

      if (!joinToastShown.current) {
        toast({
          title: 'Joined session',
          description: 'You are now collaborating',
          status: 'success',
          duration: 4000,
        });
        joinToastShown.current = true;
      }
      joinToastShown.current = true;
    } catch (err) {
      console.error('Failed to join session:', err);
      toast({
        title: 'Connection failed',
        description: err instanceof Error ? err.message : 'Could not join session',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLeaveSession = () => {
    const collaborationManager = getCollaborationManager();
    collaborationManager.disconnect();

    // Clear URL parameter
    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    window.history.pushState({}, '', url.toString());

    toast({
      title: 'Left session',
      description: 'You are no longer collaborating',
      status: 'info',
      duration: 3000,
    });

    // Reset toast flag
    joinToastShown.current = false;
  };

  const handleCopyLink = () => {
    if (!sessionId) return;

    const sessionUrl = CollaborationManager.createSessionUrl(sessionId);
    navigator.clipboard.writeText(sessionUrl);

    toast({
      title: 'Link copied',
      description: 'Share this link with collaborators',
      status: 'success',
      duration: 3000,
    });
  };

  if (isEnabled && isConnected) {
    // Active session view
    const userCount = Object.keys(users).length;

    return (
      <Panel title="Collaboration">
        <VStack spacing={2} align="stretch">
          {/* Connection status */}
          <HStack justify="space-between">
            <HStack>
              <Badge colorScheme="green">Connected</Badge>
              <HStack spacing={1}>
                <Users size={16} />
                <Text fontSize="sm">{userCount + 1} online</Text>
              </HStack>
            </HStack>
            <IconButton
              aria-label="Leave session"
              icon={<X size={16} />}
              size="sm"
              colorScheme="red"
              variant="ghost"
              onClick={handleLeaveSession}
            />
          </HStack>

          {/* Session info */}
          <FormControl>
            <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
              Session ID
            </FormLabel>
            <HStack>
              <Input
                value={sessionId || ''}
                isReadOnly
                size="sm"
                fontSize="xs"
                fontFamily="mono"
                h="20px"
                borderRadius="0"
                _focus={{
                  borderColor: 'gray.600',
                  boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
                }}
              />
              <PanelStyledButton
                onClick={handleCopyLink}
              >
                Copy
              </PanelStyledButton>
            </HStack>
          </FormControl>

          {/* Active users */}
          {userCount > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1}>
                Active Users
              </Text>
              <VStack spacing={2} align="stretch">
                {(Object.values(users) as CollaborationUser[]).map((user) => (
                  <HStack key={user.id} spacing={2}>
                    <Box
                      w={3}
                      h={3}
                      borderRadius="full"
                      bg={user.color}
                    />
                    <Text fontSize="sm">{user.name}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}

          {/* Error message */}
          {error && (
            <Text fontSize="sm" color="red.500">
              {error}
            </Text>
          )}
        </VStack>
      </Panel>
    );
  }

  // Setup view
  return (
    <Panel title="Collaboration">
      <VStack spacing={2} align="stretch">
        {/* User name input */}
        <FormControl>
          <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
            Your Name
          </FormLabel>
          <Input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            size="sm"
            h="20px"
            borderRadius="0"
            _focus={{
              borderColor: 'gray.600',
              boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
            }}
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
            Session ID
          </FormLabel>
          <Input
            placeholder="Enter session ID or paste link"
            value={sessionIdInput}
            onChange={(e) => setSessionIdInput(e.target.value)}
            size="sm"
            h="20px"
            borderRadius="0"
            _focus={{
              borderColor: 'gray.600',
              boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
            }}
          />
        </FormControl>
        <PanelStyledButton
          w="full"
          onClick={handleJoinSession}
          isLoading={isConnecting}
        >
          Join Session
        </PanelStyledButton>

        <PanelStyledButton
          w="full"
          onClick={handleStartSession}
          isLoading={isConnecting}
        >
          Start & Invite Others
        </PanelStyledButton>
      </VStack>
    </Panel>
  );
};
