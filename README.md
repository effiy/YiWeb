# YiWeb

AI-powered code review web application. Browse file trees, review code with AI assistance, and analyze business processes — all in the browser.

## Tech Stack

- **Vue 3.5** — reactive UI (global build, no bundler)
- **Native ESM** — browser-native module system
- **Marked.js** — Markdown rendering
- **Mermaid.js** — diagram rendering
- **Font Awesome 6.4** — icon set

## Getting Started

Serve the project root with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .

# PHP
php -S localhost:8080
```

Open `http://localhost:8080/src/views/aicr/` to access the code review interface.

Environment switches automatically based on hostname. Append `?debug=true` for debug logging, or `?env=local` to force local endpoints.

## Project Structure

```
YiWeb/
├── src/
│   ├── core/           # Config & API services
│   └── views/aicr/     # Code review view (hooks, utils, constants)
├── cdn/
│   ├── components/     # Vue components
│   ├── styles/         # CSS stylesheets
│   └── utils/          # Shared utility modules
├── tests/              # Test evidence
└── index.html          # Root shell
```

## Architecture

```
Browser
├── Vue 3 App (global)
│   ├── Components (/cdn/components/)
│   ├── Hooks (/src/views/aicr/hooks/)
│   └── Utils (/cdn/utils/)
├── API Services (/src/core/services/)
│   ├── CRUD operations
│   ├── Business process analysis
│   └── Auth handling
└── Config (/src/core/config.js)
    ├── Environment detection
    └── Endpoint management
```

## API Endpoints

| Service | Production | Local |
|---------|-----------|-------|
| Data | `https://data.effiy.cn` | `http://localhost:9000` |
| API | `https://api.effiy.cn` | `http://localhost:8080` |
| Ollama | `https://ollama.effiy.cn` | `http://localhost:11434` |

## Development

No build step required. Edit files and refresh the browser. Use `?debug=true` to enable debug logging.

For environment switching, use `?env=local` or call `window.setEnv('local')` in the console.
