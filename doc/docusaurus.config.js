// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'VectorNest Documentation',
  tagline: 'Web Vector Editor - Technical Documentation',
  favicon: 'img/logo.svg',

  // Set the production url of your site here
  url: 'https://ekrsulov.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/ttpe/docs/',

  // GitHub pages deployment config (adjust as needed)
  organizationName: 'ekrsulov',
  projectName: 'ttpe',

  onBrokenLinks: 'warn',

  // Internationalization (i18n)
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Point to your repo for "Edit this page" links
          editUrl: 'https://github.com/ekrsulov/ttpe/tree/main/doc/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: false, // Disable blog
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Social card image
      image: 'img/social-card.png',
      navbar: {
        title: 'VectorNest',
        logo: {
          alt: 'VectorNest Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docs',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/ekrsulov/ttpe',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/docs',
              },
              {
                label: 'Architecture',
                to: '/docs/architecture/overview',
              },
              {
                label: 'Plugins',
                to: '/docs/plugins/overview',
              },
            ],
          },
          {
            title: 'Resources',
            items: [
              {
                label: 'API Reference',
                to: '/docs/api/create-api',
              },
              {
                label: 'UI Components',
                to: '/docs/ui/components',
              },
              {
                label: 'Theming',
                to: '/docs/ui/theming',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/ekrsulov/ttpe',
              },
              {
                label: 'Contributing',
                to: '/docs/contributing/style-guide',
              },
              {
                label: 'Changelog',
                to: '/docs/changelog',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} VectorNest Project. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['typescript', 'jsx', 'tsx', 'bash', 'json'],
      },
      // Algolia search integration (configure when ready)
      // algolia: {
      //   appId: 'YOUR_APP_ID',
      //   apiKey: 'YOUR_SEARCH_API_KEY',
      //   indexName: 'ttpe',
      // },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      mermaid: {
        theme: { light: 'default', dark: 'dark' },
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
    }),

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownImages: 'ignore',
    },
  },
  themes: [
    '@docusaurus/theme-mermaid',
  ],
};

module.exports = config;
