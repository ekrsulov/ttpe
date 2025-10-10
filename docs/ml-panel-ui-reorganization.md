# UI Reorganization: Optical Alignment Panel - ML Section

## 🎯 Objetivo

Reorganizar la sección de Machine Learning del panel de Optical Alignment para mejorar la experiencia de usuario, separando las operaciones comunes de las funciones avanzadas.

## 📊 Cambios Implementados

### Nueva Estructura

#### **1. Sección Principal "Machine Learning" (Siempre Visible)**

Operaciones más comunes para uso diario:

- ✅ **Load Default Model** (botón verde)
  - Solo visible cuando no hay modelo cargado
  - Carga el modelo pre-entrenado del servidor
  
- ✅ **Use ML Prediction** (checkbox)
  - Activa/desactiva el uso de ML para predicciones
  - Solo visible cuando hay modelo cargado
  
- ✅ **Apply ML Prediction** (botón morado outline)
  - Aplica predicción ML al par seleccionado
  - Solo visible cuando ML está activado
  - Se deshabilita si no hay par válido seleccionado
  
- ✅ **Apply ML to All Pairs** (botón morado sólido)
  - Aplica predicción ML a todos los pares válidos en el canvas
  - Siempre visible cuando hay modelo cargado

#### **2. Sección "Advanced ML" (Colapsable, Cerrada por Defecto)**

Funciones avanzadas para entrenamiento y gestión:

**Training:**
- Training Samples counter
- Clear All Samples
- Add Current as Sample
- Add All Valid Pairs
- Training Progress bar
- Train Model button

**Model Management:**
- Save/Load (browser storage)
- Download Model Files
- Upload Custom Model (JSON + weights.bin)
- Delete Saved Model

### Comportamiento UI

- **Header clickeable**: Todo el header de "Advanced ML" es clickeable para expandir/colapsar
- **Icono de estado**: Chevron down/up indica el estado (cerrado/abierto)
- **Animación suave**: Usa `Collapse` de Chakra UI con `animateOpacity`
- **Hover effect**: El header tiene un efecto hover sutil
- **Estado inicial**: La sección avanzada inicia cerrada por defecto

## 🔧 Cambios Técnicos

### Imports Agregados

```typescript
import { useState } from 'react';
import { Collapse, IconButton } from '@chakra-ui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
```

### Estado Local

```typescript
const [isAdvancedMLOpen, setIsAdvancedMLOpen] = useState(false);
```

### Componentes UI

- **HStack clickeable** para el header de Advanced ML
- **IconButton** con Chevron para indicador visual
- **Collapse** de Chakra UI para animación suave
- **VStack** con spacing consistente

## 📁 Archivos Modificados

- ✅ `src/components/plugins/OpticalAlignmentPanel.tsx`
  - Reorganizada sección ML
  - Agregado estado para collapse
  - Agregados imports necesarios
  - Mantenida toda la funcionalidad existente

## 🎨 Estructura Visual

```
┌─ Machine Learning ──────────────┐
│ [Model Ready]                    │
│                                  │
│ [Load Default Model]             │ ← Solo si no hay modelo
│                                  │
│ ☑ Use ML Prediction              │ ← Solo si hay modelo
│                                  │
│ [Apply ML Prediction]            │ ← Solo si ML activo
│                                  │
│ [Apply ML to All Pairs]          │ ← Solo si hay modelo
└──────────────────────────────────┘

┌─ Advanced ML ▼ ─────────────────┐ ← Clickeable
│ (Training & Model Management)    │
│                                  │
│ [Collapsed by default]           │
│                                  │
│ When expanded:                   │
│   - Training section             │
│   - Model Management section     │
└──────────────────────────────────┘
```

## ✅ Verificación

- ✅ Lint: Sin errores
- ✅ Build: Exitoso
- ✅ TypeScript: Sin errores de tipos
- ✅ Funcionalidad: Toda la funcionalidad previa mantenida
- ✅ UI: Secciones claramente separadas

## 🎯 Beneficios

1. **Mejor UX**: Operaciones comunes al alcance inmediato
2. **Menos saturación visual**: Funciones avanzadas ocultas hasta necesitarlas
3. **Flujo más claro**: Los usuarios nuevos ven solo lo esencial
4. **Acceso rápido**: Un clic para expandir opciones avanzadas
5. **Mantiene potencia**: Todas las funcionalidades siguen disponibles

## 📝 Notas

- No se perdió ninguna funcionalidad
- El estado del collapse es local (se resetea al cambiar de panel)
- Los tamaños de fuente y botones se mantuvieron consistentes
- Los colores y estilos se respetaron de la versión anterior

Fecha: 9 de octubre de 2025
