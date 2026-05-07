# YiWeb Architecture

## Overview

Vue 3 CDN multi-page application suite. Zero-build — browser-native ES Modules.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Vue 3 (Global Build, CDN) |
| Modules | Native ES Modules |
| Styling | CSS3 (Custom Properties) |
| Rendering | marked + mermaid |
| Runtime | Modern browser |

## Directory Structure

```
YiWeb/
├── cdn/                        # Shared resources (cross-app)
│   ├── components/             # Vue component library
│   │   ├── common/             #   Generic (Button, Modal, Form, etc.)
│   │   └── business/           #   Business (MarkdownView, SearchHeader, etc.)
│   ├── utils/                  # Utility functions
│   │   ├── core/               #   http, api, error, storage, log, i18n, validation, eventBus
│   │   ├── view/               #   Vue app factory (baseView, componentLoader, registry)
│   │   ├── ui/                 #   message, dialog, loading, template
│   │   ├── browser/            #   dom, events
│   │   ├── time/               #   date, timeParams, timeSelectors
│   │   └── data/               #   domain, dataUtils
│   ├── styles/                 # Shared theme (theme.css, reset.css, utilities.css)
│   ├── markdown/               # Markdown renderer (plugin architecture)
│   └── mermaid/                # Mermaid renderer
├── src/                        # Application source
│   ├── core/                   # Global config + services
│   │   ├── config.js           #   Environment config (local/prod)
│   │   ├── services/           #   API service layer
│   │   └── utils/              #   App-level utilities
│   └── views/                  # View applications
│       └── aicr/               #   AICR code review app
│           ├── index.html      #     HTML entry
│           ├── index.js        #     App entry (createBaseView)
│           ├── hooks/          #     Composable hooks
│           ├── components/     #     App-specific components
│           └── styles/         #     App-specific styles
├── docs/                       # Project documentation
├── tests/                      # Test directory
├── index.html                  # Brand homepage
└── design-system.md            # Design system
```

## Placement Rules

| Content Type | Location | Reason |
|-------------|----------|--------|
| Cross-app Vue components | `cdn/components/` | Multi-app shared |
| Generic utilities | `cdn/utils/` | Framework-agnostic |
| Vue-specific utilities | `cdn/utils/view/` | Vue-only |
| App-specific components | `src/views/<app>/components/` | Not cross-app |
| Global config | `src/core/config.js` | Single source |
| API services | `src/core/services/` | Per business module |
| Shared styles | `cdn/styles/` | Cross-app consistency |

## Key Architecture Patterns

1. **App Factory**: `createBaseView` factory function in `cdn/utils/view/baseView.js`
2. **State Management**: `createStore + useComputed + useMethods` pattern
3. **Component Registration**: `registerGlobalComponent` with template caching
4. **Environment Switching**: URL param `?env=local` or `localStorage`
5. **Markdown Plugin System**: `cdn/markdown/` plugin architecture

## Applications

| App | Entry | Description |
|-----|-------|-------------|
| Brand Home | `/index.html` | Landing page |
| AICR | `/src/views/aicr/index.html` | AI Code Review viewer |
