# TTPE Documentation

This directory contains the complete technical documentation for the TTPE Web Vector Editor, built with Docusaurus.

## Quick Start

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn

### Installation

```bash
cd doc
npm install
```

### Development

Run the documentation site locally with hot reload:

```bash
npm run start
```

The site will open at `http://localhost:3000`.

### Build

Generate a static site for production:

```bash
npm run build
```

Output will be in the `build/` directory.

### Serve Built Site

Preview the production build locally:

```bash
npm run serve
```

### Link Checking

Validate all internal links to catch broken references:

```bash
npm run lint:links
```

## Documentation Structure

```
doc/
├── docs/                       # Markdown documentation files
│   ├── index.md               # Landing page
│   ├── architecture/          # System architecture
│   ├── plugins/               # Plugin system and catalog
│   ├── event-bus/             # Event bus documentation
│   ├── api/                   # Public API reference
│   ├── features/              # Core features
│   ├── ui/                    # UI components and theming
│   ├── ops/                   # Operations and deployment
│   ├── contributing/          # Contribution guidelines
│   ├── faq.md                 # Frequently asked questions
│   ├── troubleshooting.md     # Common issues and solutions
│   └── changelog.md           # Version history
├── static/                    # Static assets (images, fonts)
├── src/                       # React components and theme
├── docusaurus.config.js       # Docusaurus configuration
├── sidebars.js                # Sidebar navigation structure
└── package.json               # Dependencies and scripts
```

## Contributing to Documentation

See [docs/contributing/style-guide.md](docs/contributing/style-guide.md) for documentation standards and best practices.

## Deployment

The documentation can be deployed to:

- **GitHub Pages**: `npm run deploy` (requires repository configuration)
- **Netlify**: Connect to repository, set build command to `npm run build`, publish directory to `build`
- **Vercel**: Similar configuration to Netlify
- **Static hosting**: Upload contents of `build/` directory

## Troubleshooting

### Port Already in Use

If port 3000 is occupied:

```bash
npm run start -- --port 3001
```

### Build Failures

Clear the cache and rebuild:

```bash
npm run clear
npm run build
```

### Broken Links

Run the link checker to identify issues:

```bash
npm run lint:links
```

## License

Same as the main TTPE project
