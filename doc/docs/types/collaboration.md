# Collaboration

This document describes the types related to multiplayer collaboration features in the TTPE application.

## CollaborationUser

Represents a user in a collaboration session.

```typescript
interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: string[];
  lastSeen: number;
}
```

## CollaborationSession

Represents a collaboration session with multiple users.

```typescript
interface CollaborationSession {
  id: string;
  name: string;
  users: Record<string, CollaborationUser>;
  createdAt: number;
  updatedAt: number;
}
```

## CollaborationState

The current state of collaboration in the application.

```typescript
interface CollaborationState {
  isEnabled: boolean;
  isConnected: boolean;
  sessionId: string | null;
  currentUserId: string | null;
  currentUser: CollaborationUser | null;
  users: Record<string, CollaborationUser>;
  error: string | null;
}
```

## Usage Examples

### Creating a Collaboration User

```typescript
const user: CollaborationUser = {
  id: 'user-123',
  name: 'Alice',
  color: '#FF6B6B',
  cursor: { x: 150, y: 200 },
  selection: ['element-1', 'element-2'],
  lastSeen: Date.now()
};
```

### Managing Collaboration State

```typescript
const collaborationState: CollaborationState = {
  isEnabled: true,
  isConnected: true,
  sessionId: 'session-456',
  currentUserId: 'user-123',
  currentUser: user,
  users: {
    'user-123': user,
    'user-789': otherUser
  },
  error: null
};
```