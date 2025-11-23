#!/usr/bin/env node

/**
 * Script to start the collaboration WebSocket server
 * Reads VITE_COLLABORATION_WS_URL from .env and extracts the port
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Function to parse .env file
function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }
  
  const content = readFileSync(filePath, 'utf-8');
  const env = {};
  
  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) {
      return;
    }
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });
  
  return env;
}

// Read .env file
const envPath = join(rootDir, '.env');
const env = parseEnvFile(envPath);

// Extract port from VITE_COLLABORATION_WS_URL
let port = 1234; // default
let host = 'localhost'; // default

if (env.VITE_COLLABORATION_WS_URL) {
  const url = env.VITE_COLLABORATION_WS_URL;
  console.log(`[Collab Server] Reading config from .env: ${url}`);
  
  // Parse URL to extract host and port
  const match = url.match(/^wss?:\/\/([^:]+)(?::(\d+))?/);
  if (match) {
    host = match[1];
    port = match[2] ? parseInt(match[2], 10) : (url.startsWith('wss') ? 443 : 80);
  }
} else {
  console.log('[Collab Server] VITE_COLLABORATION_WS_URL not found in .env, using defaults');
}

console.log(`[Collab Server] Starting on ${host}:${port}`);

// Change to collaboration-server directory and run npm install + start
const serverDir = join(rootDir, 'collaboration-server');

// First run npm install
const install = spawn('npm', ['install'], {
  cwd: serverDir,
  stdio: 'inherit',
  shell: true,
});

install.on('close', (code) => {
  if (code !== 0) {
    console.error(`[Collab Server] npm install failed with code ${code}`);
    process.exit(code);
  }
  
  // Then start the server with the extracted port
  const start = spawn('npm', ['start'], {
    cwd: serverDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      HOST: host,
      PORT: port.toString(),
    },
  });
  
  start.on('close', (code) => {
    process.exit(code);
  });
});
