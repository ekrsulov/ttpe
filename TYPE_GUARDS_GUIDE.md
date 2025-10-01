# Guía de Type Guards - TTPE

## 📚 Introducción

Los type guards son funciones que ayudan a TypeScript a entender mejor los tipos en tiempo de compilación, proporcionando seguridad de tipos y mejor autocompletado.

---

## 🎯 Type Guards Disponibles

### `isPathElement(element: CanvasElement)`

Verifica si un elemento es de tipo path.

```typescript
import { isPathElement } from '../utils';

if (isPathElement(element)) {
  // TypeScript sabe que element.type === 'path'
  // y que element.data existe
  const pathData = element.data; // type-safe
}
```

---

### `isPathData(data: unknown)`

Verifica si un objeto es PathData válido.

```typescript
import { isPathData } from '../utils';

if (isPathData(element.data)) {
  // Acceso seguro a propiedades de PathData
  const strokeWidth = element.data.strokeWidth;
  const subPaths = element.data.subPaths;
}
```

---

### `isValidPathElement(element: CanvasElement)`

Verificación combinada: es path element Y tiene PathData válido.

```typescript
import { isValidPathElement } from '../utils';

if (isValidPathElement(element)) {
  // Máxima seguridad de tipos
  // element.data es definitivamente PathData
  element.data.subPaths.forEach(subPath => {
    // ... trabajar con subpaths
  });
}
```

---

### `hasStrokeColor(data: unknown)`

Verifica si un objeto tiene propiedad `strokeColor`.

```typescript
import { hasStrokeColor } from '../utils';

if (hasStrokeColor(element.data)) {
  const color = element.data.strokeColor; // string
}
```

---

### `hasFillColor(data: unknown)`

Verifica si un objeto tiene propiedad `fillColor`.

```typescript
import { hasFillColor } from '../utils';

if (hasFillColor(element.data)) {
  const color = element.data.fillColor; // string
}
```

---

### `hasStrokeWidth(data: unknown)`

Verifica si un objeto tiene propiedad `strokeWidth`.

```typescript
import { hasStrokeWidth } from '../utils';

if (hasStrokeWidth(element.data)) {
  const width = element.data.strokeWidth; // number
}
```

---

### `hasStrokeOpacity(data: unknown)`

Verifica si un objeto tiene propiedad `strokeOpacity`.

```typescript
import { hasStrokeOpacity } from '../utils';

if (hasStrokeOpacity(element.data)) {
  const opacity = element.data.strokeOpacity; // number
}
```

---

## 💡 Ejemplos de Uso Práctico

### Ejemplo 1: Procesar Solo Elementos Path

```typescript
import { isValidPathElement } from '../utils';

function processElements(elements: CanvasElement[]) {
  elements.forEach(element => {
    if (isValidPathElement(element)) {
      // TypeScript sabe que element.data es PathData
      console.log(`Path has ${element.data.subPaths.length} subpaths`);
      console.log(`Stroke width: ${element.data.strokeWidth}`);
    }
  });
}
```

### Ejemplo 2: Verificación Defensiva con Type Guards

```typescript
import { isPathElement, hasStrokeColor } from '../utils';

function getElementColor(element: CanvasElement): string {
  if (!isPathElement(element)) {
    return '#000000'; // default
  }

  if (hasStrokeColor(element.data)) {
    return element.data.strokeColor;
  }

  return '#000000';
}
```

### Ejemplo 3: Filtrar y Transformar con Type Safety

```typescript
import { isValidPathElement } from '../utils';

function getStrokeWidths(elements: CanvasElement[]): number[] {
  return elements
    .filter(isValidPathElement)  // Solo paths válidos
    .map(element => element.data.strokeWidth);  // Type-safe
}
```

### Ejemplo 4: Guard Composition

```typescript
import { isPathElement, hasStrokeColor, hasStrokeWidth } from '../utils';

function hasVisibleStroke(element: CanvasElement): boolean {
  return isPathElement(element) &&
         hasStrokeWidth(element.data) &&
         element.data.strokeWidth > 0 &&
         hasStrokeColor(element.data) &&
         element.data.strokeColor !== 'none';
}
```

---

## 🚀 Beneficios

### ✅ Seguridad de Tipos
- TypeScript entiende los tipos después del guard
- Menos casting manual necesario
- Errores capturados en tiempo de compilación

### ✅ Mejor Autocompletado
- IntelliSense funciona correctamente
- Menos errores de typos
- Desarrollo más rápido

### ✅ Código Más Legible
```typescript
// ❌ Antes (sin type guard)
if (element.type === 'path' && 
    element.data && 
    typeof element.data === 'object' && 
    'strokeWidth' in element.data) {
  const width = (element.data as any).strokeWidth;
}

// ✅ Después (con type guard)
if (isPathElement(element) && hasStrokeWidth(element.data)) {
  const width = element.data.strokeWidth;
}
```

### ✅ Reutilización
- Una sola definición en `typeGuards.ts`
- Usado en múltiples lugares
- Fácil de mantener

---

## 📝 Mejores Prácticas

1. **Usar guards específicos cuando sea posible**
   ```typescript
   // ✅ Bueno - específico
   if (hasStrokeWidth(data)) { ... }
   
   // ⚠️ Menos ideal - muy amplio
   if (isPathData(data)) { ... }
   ```

2. **Combinar guards para verificaciones complejas**
   ```typescript
   if (isPathElement(element) && hasStrokeColor(element.data)) {
     // Verificación específica y segura
   }
   ```

3. **Evitar casting después de usar guards**
   ```typescript
   // ❌ No necesario
   if (isPathElement(element)) {
     const data = element.data as PathData;
   }
   
   // ✅ TypeScript ya lo sabe
   if (isPathElement(element)) {
     const data = element.data; // ya es PathData
   }
   ```

---

## 🔧 Extender Type Guards

Si necesitas crear nuevos type guards:

```typescript
// En typeGuards.ts
export function hasCustomProperty(data: unknown): data is { customProp: string } {
  return typeof data === 'object' && 
         data !== null && 
         'customProp' in data;
}
```

---

## 📚 Referencias

- Archivo fuente: `/src/utils/typeGuards.ts`
- Documentación TypeScript: [Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- Exportado desde: `/src/utils/index.ts`
