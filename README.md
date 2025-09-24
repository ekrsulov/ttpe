# TTPE - Text-to-Path Editor

A powerful web-based vector graphics editor built with React and TypeScript that specializes in creating, editing, and manipulating SVG paths with advanced text vectorization capabilities.

![TTPE Editor](https://img.shields.io/badge/Built%20with-React%20%26%20TypeScript-blue)
![Tests](https://img.shields.io/badge/E2E%20Tests-Playwright-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

### 🎨 Drawing Tools
- **Pencil Tool**: Freehand drawing with smooth path creation
- **Shape Tool**: Create geometric shapes (squares, circles, triangles, rectangles)
- **Text Tool**: Convert text to editable vector paths with font customization
- **Selection Tool**: Multi-select and transform elements

### ✨ Advanced Editing
- **Path Editing**: Edit individual path points and control points
- **Smooth Brush**: Path smoothing with adjustable radius and strength
- **Subpath Management**: Work with individual subpaths within complex paths
- **Control Point Alignment**: Automatic alignment helpers for precise editing

### 🔧 Transformation Tools
- **Multi-element Selection**: Select and transform multiple elements
- **Precise Transformations**: Scale, rotate, and translate with visual handles
- **Coordinate Display**: Show exact coordinates and rulers
- **Element Ordering**: Bring to front, send to back, and arrange layers

### 📝 Text Features
- **Font Selection**: Choose from system fonts
- **Text Vectorization**: Convert text to editable SVG paths using WASM-powered tracing
- **Font Properties**: Customize size, weight, and style
- **Path Conversion**: Text becomes fully editable vector graphics

### 🎯 Professional Features
- **Undo/Redo**: Full history management with temporal state
- **Element Arrangement**: Align, distribute, and arrange multiple elements
- **Viewport Controls**: Zoom and pan with smooth interactions
- **Responsive Design**: Works on various screen sizes

## Technology Stack

- **Frontend**: React 19 with TypeScript
- **State Management**: Zustand with temporal middleware (undo/redo)
- **Build Tool**: Vite
- **Testing**: Playwright for E2E tests
- **Graphics**: Native SVG rendering
- **Text Processing**: esm-potrace-wasm for text-to-path conversion
- **Path Manipulation**: path-data-parser for SVG path operations

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ekrsulov/ttpe.git
   cd ttpe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173` to start using the editor.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

### Basic Workflow

1. **Select a Tool**: Choose from Pencil, Shape, Text, or Select tools in the sidebar
2. **Create Content**: 
   - Use Pencil to draw freehand
   - Use Shape to create geometric forms
   - Use Text to add vectorized text
3. **Edit and Transform**: Switch to Select mode to modify your creations
4. **Fine-tune**: Use Edit mode for precise path manipulation

### Keyboard Shortcuts

- `Space` + drag: Pan the canvas
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Y`: Redo
- `Delete`: Remove selected elements

### Text Vectorization

The editor can convert any text into editable SVG paths:

1. Select the Text tool
2. Set your desired font properties (size, family, weight, style)
3. Click on the canvas to place text
4. The text is automatically converted to vector paths
5. Switch to Edit mode to modify individual path points

## Project Structure

```
src/
├── components/          # React components
│   ├── Canvas.tsx      # Main canvas component
│   ├── CanvasRenderer.tsx  # SVG rendering logic
│   ├── Sidebar.tsx     # Tool sidebar
│   ├── overlays/       # Canvas overlay components
│   ├── plugins/        # Tool-specific panels
│   └── ui/             # Reusable UI components
├── store/              # Zustand state management
│   ├── canvasStore.ts  # Main store
│   └── slices/         # Feature-specific state slices
├── utils/              # Utility functions
│   ├── pathParserUtils.ts      # SVG path parsing
│   ├── textVectorizationUtils.ts # Text-to-path conversion
│   ├── transformationUtils.ts   # Element transformations
│   └── measurementUtils.ts     # Geometric calculations
├── types/              # TypeScript type definitions
└── hooks/              # Custom React hooks
```

## Testing

The project includes comprehensive end-to-end tests using Playwright:

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Install Playwright browsers (first time only)
npx playwright install
```

### Test Coverage

- ✅ Basic application loading and navigation
- ✅ Pencil drawing and path creation
- ✅ Shape creation (all geometric shapes)
- ✅ Text input and font customization
- ✅ Element selection and transformation
- ✅ Path editing and smooth brush functionality
- ✅ Multi-element operations
- ✅ Element arrangement (align, distribute)
- ✅ Element ordering (bring to front, send to back)
- ✅ Path movement and manipulation
- ❌ Undo/redo functionality (not yet implemented)

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Add tests** if applicable
5. **Run the test suite**
   ```bash
   npm test
   npm run lint
   ```
6. **Submit a pull request**

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Maintain consistent code style (ESLint configured)
- Update documentation as needed

## Roadmap

- [ ] Import SVG files
- [ ] Export functionality
- [ ] Advanced path operations (boolean operations)
- [ ] Collaborative editing
- [ ] Plugin system for custom tools
- [ ] Mobile touch support improvements

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- Text vectorization powered by [esm-potrace-wasm](https://www.npmjs.com/package/esm-potrace-wasm)
- Path manipulation using [path-data-parser](https://www.npmjs.com/package/path-data-parser)
- Icons from [Lucide React](https://lucide.dev/)

## Support

If you encounter any issues or have questions:

1. Check the [existing issues](https://github.com/ekrsulov/ttpe/issues)
2. Create a new issue with detailed information
3. Provide steps to reproduce any bugs

---

**TTPE** - Transforming text into editable vector graphics with precision and ease.