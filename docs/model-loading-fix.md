# Fix: Error al cargar modelo pre-entrenado desde servidor

## 🐛 Problema

Al hacer clic en "Load Default Model", se producía el siguiente error:

```
❌ Failed to load pre-trained model: Error: Based on the provided shape, [3,3,16,32], 
the tensor should have 4608 values but has 452
```

Sin embargo, al subir los mismos archivos manualmente con "Upload Model" funcionaba correctamente.

## 🔍 Diagnóstico

El problema tenía **dos causas**:

### 1. Referencia incorrecta en el JSON
El archivo `default-model.json` hacía referencia a:
```json
"paths": ["./optical-alignment-model.weights.bin"]
```

Pero el archivo de pesos se llamaba:
```
default-model.weights.bin
```

### 2. Configuración de Vite para archivos binarios
Vite necesitaba configuración especial para servir archivos `.bin` correctamente como activos estáticos.

## ✅ Solución

### 1. Actualizar referencia en JSON

Se actualizó el archivo `public/models/optical-alignment/default-model.json` para que apunte al nombre correcto:

```bash
sed -i '' 's/optical-alignment-model.weights.bin/default-model.weights.bin/g' \
  public/models/optical-alignment/default-model.json
```

Ahora el JSON contiene:
```json
"paths": ["./default-model.weights.bin"]
```

### 2. Configurar Vite para archivos .bin

Se actualizó `vite.config.ts`:

```typescript
export default defineConfig(() => {
  return {
    // Include .bin files as static assets
    assetsInclude: ['**/*.bin'],
    
    server: {
      host: '0.0.0.0',
      // Configure headers for TensorFlow.js model files
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    },
    
    build: {
      rollupOptions: {
        output: {
          // Ensure .bin files are copied as-is
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.bin')) {
              return 'models/optical-alignment/[name][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          }
        }
      },
      // Copy public directory assets
      copyPublicDir: true
    }
  }
});
```

## 📊 Cambios de archivos

### Archivos modificados:
- `public/models/optical-alignment/default-model.json` - Referencia corregida
- `vite.config.ts` - Configuración para archivos .bin

### Scripts creados:
- `scripts/validate-model.sh` - Script de validación automática

## 🧪 Validación

Se creó un script de validación que verifica:

```bash
./scripts/validate-model.sh
```

El script valida:
1. ✅ Existencia de archivos en `public/`
2. ✅ Referencia correcta en JSON
3. ✅ Archivos copiados correctamente a `dist/`
4. ✅ Tamaños de archivos

## 🎯 Resultado

Ahora el botón "Load Default Model" funciona correctamente:

1. Usuario hace clic en "Load Default Model"
2. TensorFlow.js carga `/models/optical-alignment/default-model.json`
3. El JSON apunta correctamente a `./default-model.weights.bin`
4. TensorFlow.js carga los pesos binarios
5. ✅ Modelo cargado exitosamente

## 📝 Lecciones aprendidas

1. **Nombres de archivos**: Al renombrar archivos de modelos TensorFlow.js, **siempre** actualizar las referencias en el JSON.

2. **Archivos binarios en Vite**: Los archivos `.bin` necesitan configuración especial en `assetsInclude` y `assetFileNames`.

3. **Upload vs HTTP**: El upload manual funciona porque usa `tf.io.browserFiles()` que lee directamente del sistema de archivos. La carga HTTP requiere que los archivos estén correctamente servidos.

4. **Validación**: Crear scripts de validación ayuda a detectar problemas antes de deploy.

## 🚀 Para el futuro

Si actualizas el modelo en el futuro:

1. Entrena y descarga el modelo
2. Ejecuta este comando para actualizar:
   ```bash
   # Copiar archivos
   cp ~/Downloads/optical-alignment-model.json public/models/optical-alignment/default-model.json
   cp ~/Downloads/optical-alignment-model.weights.bin public/models/optical-alignment/default-model.weights.bin
   
   # Actualizar referencia en JSON
   sed -i '' 's/optical-alignment-model.weights.bin/default-model.weights.bin/g' \
     public/models/optical-alignment/default-model.json
   
   # Validar
   ./scripts/validate-model.sh
   
   # Build
   npm run build
   ```

Fecha: 9 de octubre de 2025
