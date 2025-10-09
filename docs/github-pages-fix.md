# Fix: GitHub Pages Deployment - 404 Errors

## 🐛 Problema

Al desplegar a GitHub Pages, la aplicación muestra errores 404:

```
Failed to load resource: https://ekrsulov.github.io/vite.svg (404)
Failed to load resource: https://ekrsulov.github.io/models/optical-alignment/default-model.json (404)
```

## 🔍 Causa Raíz

GitHub Pages sirve el repositorio en una sub-ruta (ej: `/ttpe/`), no en la raíz del dominio. Las rutas absolutas que comienzan con `/` apuntan a la raíz del dominio, ignorando el base path del repositorio.

### URLs incorrectas:
- ❌ `https://ekrsulov.github.io/vite.svg` 
- ❌ `https://ekrsulov.github.io/models/optical-alignment/default-model.json`

### URLs correctas:
- ✅ `https://ekrsulov.github.io/ttpe/vite.svg`
- ✅ `https://ekrsulov.github.io/ttpe/models/optical-alignment/default-model.json`

## ✅ Soluciones Implementadas

### 1. Actualizar carga del modelo ML (`mlAlignmentUtils.ts`)

**Antes:**
```typescript
export async function loadPretrainedModel(): Promise<tf.LayersModel> {
  const model = await tf.loadLayersModel('/models/optical-alignment/default-model.json');
  return model;
}
```

**Después:**
```typescript
export async function loadPretrainedModel(): Promise<tf.LayersModel> {
  // Use import.meta.env.BASE_URL to handle GitHub Pages deployment
  const baseUrl = import.meta.env.BASE_URL || '/';
  const modelUrl = `${baseUrl}models/optical-alignment/default-model.json`;
  
  console.log(`Loading pre-trained model from: ${modelUrl}`);
  const model = await tf.loadLayersModel(modelUrl);
  return model;
}
```

`import.meta.env.BASE_URL` es inyectado por Vite en tiempo de build y contiene el valor de `base` de la configuración.

### 2. Actualizar rutas en `index.html`

**Antes:**
```html
<link rel="icon" type="image/svg+xml" href="/vite.svg" />
<link rel="manifest" href="/manifest.json" />
```

**Después:**
```html
<link rel="icon" type="image/svg+xml" href="./vite.svg" />
<link rel="manifest" href="./manifest.json" />
```

Las rutas relativas (`./`) son procesadas por Vite y se convierten en rutas correctas con el base path.

### 3. Plugin para actualizar `manifest.json`

Creado un plugin de Vite que actualiza dinámicamente el `manifest.json` después del build para incluir el base path:

```typescript
function manifestPlugin(): Plugin {
  let base = '/'
  
  return {
    name: 'manifest-plugin',
    configResolved(config) {
      base = config.base
    },
    closeBundle() {
      // Update manifest.json after build
      const manifestPath = resolve(__dirname, 'dist/manifest.json')
      const manifestContent = readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(manifestContent)
      
      // Update URLs to include base path
      manifest.start_url = base
      manifest.icons = manifest.icons.map((icon) => ({
        ...icon,
        src: icon.src.startsWith('/') ? `${base}${icon.src.slice(1)}` : icon.src
      }))
      
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    }
  }
}
```

Este plugin se ejecuta después del build y actualiza:
- `start_url`: De `/` a `/ttpe/`
- `icons[].src`: De `/vite.svg` a `/ttpe/vite.svg`

## 📦 Archivos Modificados

1. ✅ `src/utils/mlAlignmentUtils.ts` - Usa `import.meta.env.BASE_URL`
2. ✅ `index.html` - Rutas relativas en lugar de absolutas
3. ✅ `vite.config.ts` - Plugin para actualizar manifest.json

## 🧪 Verificación

### Build local (sin BASE_PATH):
```bash
npm run build
cat dist/manifest.json
# start_url: "/"
# icons[0].src: "/vite.svg"
```

### Build para GitHub Pages (con BASE_PATH):
```bash
BASE_PATH=ttpe npm run build
cat dist/manifest.json
# start_url: "/ttpe/"
# icons[0].src: "/ttpe/vite.svg"
```

### Verificar modelo:
```javascript
// En producción, el modelo se cargará desde:
// https://ekrsulov.github.io/ttpe/models/optical-alignment/default-model.json
```

## 🎯 Resultado

Ahora la aplicación funciona correctamente tanto en:
- ✅ **Desarrollo local**: `http://localhost:5173/`
- ✅ **GitHub Pages**: `https://ekrsulov.github.io/ttpe/`

Todas las rutas se resuelven correctamente usando el base path configurado.

## 📝 Notas Técnicas

### `import.meta.env.BASE_URL`

Vite inyecta esta variable en tiempo de build con el valor de `config.base`:
- En desarrollo: `/`
- En producción con `BASE_PATH=ttpe`: `/ttpe/`

### Rutas relativas vs absolutas

| Tipo | Sintaxis | Resuelve a | Uso |
|------|----------|------------|-----|
| Absoluta | `/path` | Raíz del dominio | ❌ No funciona en sub-rutas |
| Relativa | `./path` | Relativo al HTML | ✅ Procesado por Vite |
| Base URL | `${BASE_URL}path` | Incluye base path | ✅ Funciona en código |

### GitHub Actions

El workflow de GitHub Actions debe configurar `BASE_PATH`:

```yaml
- name: Build
  run: npm run build
  env:
    BASE_PATH: ttpe
```

## 🚀 Para el futuro

Si cambias el nombre del repositorio, actualiza también:
1. El workflow de GitHub Actions (`.github/workflows/deploy.yml`)
2. La variable `BASE_PATH` en el workflow

No necesitas cambiar código porque todo usa `import.meta.env.BASE_URL` dinámicamente.

Fecha: 9 de octubre de 2025
