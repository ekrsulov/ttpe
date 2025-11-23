# Collaboration WebSocket Server Setup

This directory contains the setup for the y-websocket server required for real-time collaboration.

## Quick Start (Development)

**Recommended**: Start from the project root using the unified command:

```bash
# From project root (ttpe/)
npm run dev:collab
```

This automatically:
- Reads the port from `.env` (`VITE_COLLABORATION_WS_URL`)
- Starts the collaboration server on the configured port
- Starts the Vite dev server

The server will run on the port specified in your `.env` file (default: `ws://localhost:1234`).

## Manual Start

To start the server independently:

```bash
# From collaboration-server/
npm install
PORT=1234 HOST=localhost npm start
```

Or with custom port:

```bash
PORT=3000 HOST=localhost npm start
```

This uses the official `y-websocket` server via `npx y-websocket`.

## Configuration

The server port is automatically extracted from the main app's `.env` file:

```bash
# .env (in project root)
VITE_COLLABORATION_WS_URL=ws://localhost:1235
```

When you run `npm run dev:collab` from the project root, it:
1. Parses `VITE_COLLABORATION_WS_URL` from `.env`
2. Extracts the host and port
3. Starts the y-websocket server with those values
4. Starts the Vite dev server

## How It Works

- The server uses Yjs CRDTs for conflict-free synchronization
- Each session is identified by a unique session ID
- The server persists no data - it only relays changes between clients
- When all clients disconnect, the session data is cleared

## Security

For production deployments, consider:

1. **Authentication**: Add token-based authentication
2. **Rate limiting**: Prevent abuse
3. **CORS**: Configure allowed origins
4. **SSL/TLS**: Always use WSS in production
5. **Persistence**: Optionally add database persistence for session data

## Testing

Test the connection from your browser console:

```javascript
const ws = new WebSocket('ws://localhost:1234');
ws.onopen = () => console.log('Connected');
ws.onerror = (err) => console.error('Error:', err);
```
