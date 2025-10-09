# Cómo usar el Modelo Pre-entrenado de Alineamiento Óptico

## Ubicación del Modelo

El modelo pre-entrenado está ubicado en:
```
public/models/optical-alignment/
├── default-model.json
├── default-model.weights.bin
└── README.md
```

Estos archivos se copian automáticamente a `dist/models/optical-alignment/` durante el build.

## Uso en la Aplicación

1. **Abrir el Panel de Optical Alignment**
   - Selecciona el modo "Optical Alignment" en el panel lateral

2. **Cargar el Modelo Pre-entrenado**
   - Haz clic en el botón verde "Load Default Model"
   - El modelo se cargará automáticamente desde el servidor
   - No necesitas tener archivos locales

3. **Usar el Modelo**
   - Una vez cargado, el modelo está listo para predecir alineamientos
   - Puedes:
     - Aplicar predicción ML a pares individuales (selecciona container + content)
     - Aplicar ML a todos los pares con "Apply ML to All Pairs"

## Ventajas vs Cargar Modelo Local

### Con Modelo Pre-entrenado (Nuevo)
✅ Un solo clic para cargar
✅ Siempre disponible
✅ No requiere descargar archivos
✅ Se actualiza automáticamente con nuevas versiones de la app

### Con Modelo Local (Upload)
- Requiere 2 archivos (.json + .weights.bin)
- Útil para modelos personalizados
- Permite experimentar con diferentes entrenamientos

## Actualizar el Modelo

Para actualizar el modelo pre-entrenado:

1. Entrena un nuevo modelo en la aplicación
2. Descarga los archivos con "Download Model Files"
3. Reemplaza los archivos en `public/models/optical-alignment/`:
   ```bash
   cp ~/Downloads/optical-alignment-model.json public/models/optical-alignment/default-model.json
   cp ~/Downloads/optical-alignment-model.weights.bin public/models/optical-alignment/default-model.weights.bin
   ```
4. Reconstruye la aplicación: `npm run build`

## API

La función `loadPretrainedModel()` en `mlAlignmentUtils.ts` carga el modelo desde:
```
/models/optical-alignment/default-model.json
```

Vite copia automáticamente todo el contenido de `public/` a `dist/` durante el build.
