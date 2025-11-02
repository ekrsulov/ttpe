---
id: plugin-manager
title: Plugin Manager API
sidebar_label: Plugin Manager
---

# Plugin Manager API

Complete reference for PluginManager methods.

## Registration

- `register(plugin)`: Register a plugin
- `unregister(pluginId)`: Remove a plugin
- `getPlugin(pluginId)`: Get plugin definition
- `getAll()`: List all plugins
- `hasTool(name)`: Check if plugin exists

## API Access

- `getPluginApi<T>(pluginId)`: Get plugin's API
- `callPluginApi(pluginId, method, ...args)`: Proxy API call

## Event Handling

- `executeHandler(tool, event, point, target, helpers)`: Execute tool handler
- `registerInteractionHandler(pluginId, eventType, handler)`: Subscribe to events

## Canvas Services

- `registerCanvasService(service)`: Register a service
- `activateCanvasService(serviceId, context)`: Activate service
- `deactivateCanvasService(serviceId)`: Deactivate service

## UI Queries

- `getPanels(toolName)`: Get tool's panels
- `getOverlays(toolName)`: Get tool's overlays
- `getActions(placement)`: Get contextual actions
- `getCanvasLayers()`: Get all canvas layers
