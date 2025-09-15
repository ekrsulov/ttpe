# TTPE - Aplicación de Canvas Interactiva

TTPE es una aplicación web interactiva de canvas construida con React, TypeScript y Vite. Proporciona una interfaz de dibujo con múltiples herramientas y plugins para crear y editar gráficos de manera eficiente.

## Características

- **Herramientas de Dibujo**: Incluye herramientas como lápiz, formas geométricas, texto y selección.
- **Plugins Modulares**: Sistema de plugins para funcionalidades como pan, zoom, historial, eliminación y organización.
- **Interfaz de Usuario**: Sidebar con paneles para cada herramienta y plugin.
- **Gestión de Estado**: Utiliza Zustand para una gestión eficiente del estado de la aplicación.
- **Canvas Interactivo**: Soporte para operaciones de dibujo, selección y manipulación de elementos.

### Plugins Disponibles

- **PencilPanel**: Herramienta de dibujo a mano alzada.
- **ShapePanel**: Creación de formas geométricas.
- **TextPanel**: Inserción y edición de texto.
- **SelectPanel**: Selección y manipulación de elementos.
- **PanPanel**: Navegación por el canvas.
- **ZoomPanel**: Control de zoom.
- **HistoryPanel**: Deshacer y rehacer acciones.
- **DeletePanel**: Eliminación de elementos.
- **ArrangePanel**: Organización de elementos.
- **OrderPanel**: Cambio de orden de capas.

## Tecnologías Utilizadas

- **React**: Biblioteca para la construcción de interfaces de usuario.
- **TypeScript**: Superset de JavaScript con tipado estático.
- **Vite**: Herramienta de construcción rápida para desarrollo web.
- **Zustand**: Biblioteca de gestión de estado ligera.
- **ESLint**: Herramienta de linting para mantener la calidad del código.

## Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/ekrsulov/ttpe.git
   cd ttpe
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abre tu navegador y ve a `http://localhost:5173` (o el puerto que indique Vite).

## Uso

- Selecciona herramientas desde la barra lateral para dibujar, crear formas o agregar texto.
- Utiliza los plugins para navegar, hacer zoom y gestionar el historial de acciones.
- Guarda tu trabajo exportando el canvas como imagen o archivo.

## Construcción para Producción

Para construir la aplicación para producción:

```bash
npm run build
```

Los archivos generados estarán en el directorio `dist`.

## Contribución

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Haz un fork del proyecto.
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`).
3. Haz commit de tus cambios (`git commit -am 'Agrega nueva funcionalidad'`).
4. Haz push a la rama (`git push origin feature/nueva-funcionalidad`).
5. Abre un Pull Request.

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

## Contacto

Para preguntas o soporte, contacta al mantenedor del proyecto.