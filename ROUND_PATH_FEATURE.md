# Round Path Feature

## Descripción
La nueva herramienta "Round Path" permite redondear las esquinas de un path, convirtiendo ángulos agudos en curvas suaves. Esta funcionalidad es perfecta para suavizar formas geométricas y crear diseños más orgánicos.

## Cómo usar

1. **Crear o seleccionar un path**: Primero crea un path usando la herramienta Lápiz o selecciona un path existente.

2. **Cambiar a modo Edit**: Haz clic en la herramienta "Edit" en la barra lateral.

3. **Encontrar la sección Round Path**: En el panel de edición, encontrarás tres secciones:
   - Smooth Brush
   - Path Simplification 
   - **Round Path** (nueva funcionalidad)

4. **Ajustar el radio**: Usa el slider "Radius" para controlar qué tanto se redondearán las esquinas:
   - Valores bajos (0.1-5): Redondeo sutil
   - Valores medios (5-20): Redondeo moderado
   - Valores altos (20-50): Redondeo pronunciado

5. **Aplicar el redondeo**: Haz clic en el botón "Round Path" para aplicar el efecto.

## Características técnicas

- **Algoritmo inteligente**: Solo redondea esquinas que están dentro de un rango de ángulos específico (30-150 grados)
- **Preservación de estilos**: Mantiene todos los estilos del path original (color, grosor, etc.)
- **Soporte para paths complejos**: Funciona con paths simples y compuestos
- **Radio adaptativo**: El radio se ajusta automáticamente para no exceder el 40% de la longitud de los segmentos adyacentes

## Casos de uso

- Suavizar formas geométricas creadas con la herramienta Shape
- Redondear esquinas de paths dibujados a mano
- Crear efectos de diseño más orgánicos y suaves
- Mejorar la apariencia de iconos y elementos gráficos

## Notas técnicas

La funcionalidad utiliza Paper.js internamente para realizar los cálculos de redondeo de manera precisa y eficiente. Los puntos de control se calculan usando el número mágico para aproximación de círculos (0.5522847498) para obtener curvas suaves y naturales.