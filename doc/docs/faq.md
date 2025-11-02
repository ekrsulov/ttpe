---
id: faq
title: Frequently Asked Questions
sidebar_label: FAQ
---

# Frequently Asked Questions

## General

### What is TTPE?

TTPE (The TypeScript Path Editor) is a web-based vector graphics editor built with React, TypeScript, and a plugin architecture.

### Is it production-ready?

TTPE is under active development (v0.0.0). APIs may change before 1.0.

### Can I use it offline?

Yes, once loaded. State is persisted to localStorage.

## Plugin Development

### How do I create a plugin?

See [Plugin System Overview](./plugins/overview) for a complete guide.

### Can plugins access other plugins' APIs?

Yes, via `pluginManager.getPluginApi()`. See [createApi Pattern](./api/create-api).

### Do plugins have access to the full store?

Yes, via `context.store.getState()`. Use responsibly.

## Architecture

### Why Zustand instead of Redux?

Simpler API, less boilerplate, better TypeScript support.

### Can I add a backend?

TTPE is client-only, but you can add API calls in plugin handlers.

### How do I extend the canvas?

Use `canvasLayers` in plugin definition. See [Plugin Overview](./plugins/overview).

## Troubleshooting

See [Troubleshooting](./troubleshooting) page for common issues.
