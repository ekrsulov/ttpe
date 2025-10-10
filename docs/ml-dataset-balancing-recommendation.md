# Recomendaciones: Balanceo de Dataset para ML Optical Alignment

## 🎯 Problema Identificado

El modelo actual fue entrenado **solo con pares que requieren ajuste óptico**, lo que causa que prediga ajustes incluso para pares ya balanceados (ej: cuadrado dentro de cuadrado).

## 📊 Dataset Actual

- **Pares con ajuste necesario**: 25 samples
- **Pares balanceados (sin ajuste)**: 0 samples
- **Total**: 25 samples

## ✅ Recomendación de Balanceo

Para un modelo de regresión como este, recomiendo una proporción de **60/40 a 70/30**:

### Opción 1: Conservadora (Proporción 60/40)
- **Pares con ajuste**: 25 (60%)
- **Pares balanceados**: ~17 (40%)
- **Total**: ~42 samples

Esta proporción asegura que el modelo aprenda bien los ajustes necesarios mientras también reconoce cuándo NO ajustar.

### Opción 2: Balanceada (Proporción 50/50) ⭐ RECOMENDADA
- **Pares con ajuste**: 25 (50%)
- **Pares balanceados**: 25 (50%)
- **Total**: 50 samples

Esta es la opción más robusta para este caso de uso:
- ✅ El modelo aprenderá a predecir ajustes cercanos a cero para casos balanceados
- ✅ Mantendrá capacidad de detectar y corregir desbalances
- ✅ Reduce falsos positivos (ajustes innecesarios)
- ✅ Dataset más robusto para generalización

### Opción 3: Agresiva (Proporción 40/60)
- **Pares con ajuste**: 25 (40%)
- **Pares balanceados**: ~38 (60%)
- **Total**: ~63 samples

Solo si observas que el modelo es demasiado "ansioso" por hacer ajustes.

## 🎨 Tipos de Pares Balanceados a Incluir

Para maximizar el aprendizaje, incluye variedad:

### 1. Formas Geométricas Simples (8-10 pares)
- Cuadrado en cuadrado (concéntricos)
- Círculo en círculo
- Triángulo en triángulo
- Pentágono/hexágono centrados

### 2. Formas Simétricas (8-10 pares)
- Estrella centrada en círculo
- Cruz centrada
- Iconos simétricos (home, settings, etc.)
- Formas con simetría radial

### 3. Formas Complejas Balanceadas (7-10 pares)
- Iconos complejos pero centrados (gear, user, etc.)
- Multi-subpath centrados
- Formas orgánicas simétricas

## 📝 Cómo Crear Pares Balanceados

Para cada par balanceado:

1. **Usar el algoritmo geométrico actual**:
   - Selecciona container + content
   - Aplica "Preview/Apply" para centrar geométricamente
   - Verifica visualmente que esté centrado

2. **Agregar como training sample**:
   - Con el par ya centrado seleccionado
   - Click "Add Current as Training Sample"
   - El target será ≈(0, 0) porque ya está centrado

3. **Verificar en consola**:
   ```
   Target optical adjustment: { x: 0.02, y: -0.01 }  // Valores cercanos a cero ✅
   ```

## 🔬 Validación del Modelo Mejorado

Después de reentrenar con dataset balanceado:

### Casos de prueba:
1. **Par balanceado** → Ajuste predicho ≈ (0, 0) ± 0.1
2. **Par desbalanceado leve** → Ajuste pequeño (0.1 - 0.5)
3. **Par muy desbalanceado** → Ajuste grande (0.5 - 2.0)

### Métricas esperadas:
- **MAE (Mean Absolute Error)**: Debería mantenerse bajo (~0.1-0.3)
- **Loss**: Puede aumentar ligeramente pero no mucho
- **Generalización**: Mejor comportamiento en casos edge

## ⚙️ Configuración Recomendada

```typescript
// En mlAlignmentUtils.ts
const ML_CONFIG = {
  TRAINING_EPOCHS: 100,        // Mantener
  BATCH_SIZE: 4,               // Mantener
  VALIDATION_SPLIT: 0.2,       // Con 50 samples, 10 para validación
  LEARNING_RATE: 0.001,        // Mantener
  // ...
};
```

Con 50 samples:
- **Training set**: 40 samples (20 con ajuste + 20 balanceados)
- **Validation set**: 10 samples (5 con ajuste + 5 balanceados)

## 🚀 Plan de Implementación

1. **Preparar pares balanceados** (25 nuevos):
   - Abrir canvas con diversas formas
   - Centrar geométricamente cada par
   - Agregar como training samples

2. **Verificar dataset**:
   ```
   Training Samples: 50
   - Con ajuste: 25 (targets ≠ 0)
   - Balanceados: 25 (targets ≈ 0)
   ```

3. **Reentrenar modelo**:
   - Click "Train Model"
   - Observar loss y MAE
   - Comparar con modelo anterior

4. **Validar en casos reales**:
   - Probar con cuadrado en cuadrado
   - Probar con ícono descentrado
   - Verificar predicciones

## 📊 Análisis de Target Distribution

Con dataset balanceado, esperas:

```
Target X distribution:
  Min: -2.0    (muy desbalanceado izquierda)
  Max: +2.0    (muy desbalanceado derecha)
  Mean: ≈0.0   (balanceado)
  Std: ≈0.8-1.2 (buena varianza)

Target Y distribution:
  Similar a X
```

Sin balanceo (actual):
```
Mean: Probablemente > 0 (bias hacia ajustes)
```

## 🎯 Resultado Esperado

Con el dataset balanceado:

- ✅ **Cuadrado en cuadrado** → Ajuste ≈ (0.01, -0.02) → Prácticamente sin movimiento
- ✅ **$ en círculo** → Ajuste ≈ (0.3, 0.15) → Ajuste necesario detectado
- ✅ **Bandera** → Ajuste ≈ (0.8, 0.2) → Ajuste fuerte detectado
- ✅ **Menos falsos positivos** → El modelo sabe cuándo NO ajustar

## 🔄 Botón de Reset Agregado

Ahora puedes resetear el sistema ML completamente:

**Ubicación**: Advanced ML → Reset ML System (botón naranja)

**Función**: Limpia el modelo actual y deja el sistema listo para:
- Cargar el modelo por defecto
- Entrenar un nuevo modelo
- Subir un modelo personalizado

Esto es útil para experimentar con diferentes datasets sin residuos del modelo anterior.

---

**Recomendación final**: Usa la proporción 50/50 con 25 pares balanceados adicionales. Esto dará el mejor balance entre detectar desbalances reales y evitar ajustes innecesarios.

Fecha: 9 de octubre de 2025
