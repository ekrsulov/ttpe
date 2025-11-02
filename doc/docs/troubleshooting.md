---
id: troubleshooting
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting

Common issues and solutions.

## Plugin Not Registering

**Symptom**: Plugin doesn't appear in tools

**Solution**:
1. Check plugin ID is unique
2. Ensure `CORE_PLUGINS` includes your plugin
3. Verify `pluginManager.register()` is called
4. Check console for errors

## State Not Updating

**Symptom**: UI doesn't reflect state changes

**Solution**:
1. Use `set()` from slice factory, not direct mutation
2. Ensure component subscribes to correct state slice
3. Check `useCanvasStore` selector is correct

## Keyboard Shortcuts Not Working

**Symptom**: Shortcuts don't fire

**Solution**:
1. Check plugin is active
2. Verify shortcut not conflicting with browser
3. Check `keyboardShortcuts` defined correctly
4. Ensure canvas has focus

## Handler Not Firing

**Symptom**: Plugin handler doesn't execute on click

**Solution**:
1. Check plugin is active (`activePlugin === 'my-plugin'`)
2. Verify event bus is initialized
3. Check handler is registered in plugin definition
4. Look for errors in handler function

## Performance Issues

**Symptom**: Canvas is laggy with many elements

**Solution**:
1. Use `useMemo` and `useCallback` in renders
2. Debounce expensive operations
3. Check for memory leaks (event listeners not removed)
4. Profile with React DevTools

## TypeScript Errors

**Symptom**: Type errors in plugin code

**Solution**:
1. Run `npm run type-check`
2. Ensure types are imported correctly
3. Check `PluginDefinition<CanvasStore>` is used
4. Verify slice types match store types

## Need More Help?

- Check [FAQ](./faq)
- Search [GitHub Issues](https://github.com/ekrsulov/ttpe/issues)
- Ask in [GitHub Discussions](https://github.com/ekrsulov/ttpe/discussions)
