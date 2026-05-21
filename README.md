# ⚡ Kiro Builder

A production-grade AI app builder — Lovable.dev-style — with a React frontend and FastAPI backend.

## Features

- **AI Code Generation** — Claude Sonnet (complex) + Ollama (simple) + Vision (images)
- **Live Preview** — Web, Mobile (iPhone bezel), and Raw HTML views
- **Code Editor** — highlight.js syntax highlighting with line numbers
- **File Explorer** — VSCode-style file tree with extension icons
- **Git History** — Commit list, rollback, and GitHub push
- **Demo Mode** — Works offline without API keys

## Quick Start

```bash
# Windows — double-click or run:
start.bat
```

This will:
1. Create Python venv + install dependencies
2. Start FastAPI backend on port 8000
3. Start Vite dev server on port 3000
4. Open http://localhost:3000 in your browser

## Manual Setup

### Backend

```bash
cd backend
cp .env.example .env         # Add your ANTHROPIC_API_KEY
python -m venv venv
venv\Scripts\activate         # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for Claude/Vision mode |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Claude model to use |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model name |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/generate` | Generate code from prompt |
| `POST` | `/api/upload` | Upload image (returns base64) |
| `GET` | `/api/history` | List commit history |
| `POST` | `/api/rollback` | Restore a previous commit |
| `GET` | `/api/files` | List current files |
| `POST` | `/api/github/push` | Push index.html to GitHub |

## AI Routing Logic

```
Image provided?  → Claude Vision
mode = "claude"  → Claude Sonnet
mode = "ollama"  → Ollama
mode = "auto"    → Complex prompt / long prompt / React/FastAPI → Claude
                   Simple prompt                                → Ollama (Claude fallback)
```

## Project Structure

```
KiroBuilder/
├── frontend/              # React + Vite + Tailwind v3
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── TopBar.jsx
│       │   ├── LeftPanel/
│       │   │   ├── ChatTab.jsx
│       │   │   ├── FilesTab.jsx
│       │   │   └── HistoryTab.jsx
│       │   ├── CodeEditor.jsx
│       │   ├── PreviewPanel.jsx
│       │   └── StatusBar.jsx
│       └── hooks/
│           ├── useGenerate.js
│           └── useGitHub.js
├── backend/               # FastAPI + brain.py
│   ├── main.py
│   ├── brain.py
│   ├── requirements.txt
│   └── .env.example
├── index.html             # Standalone single-file version
├── start.bat              # Windows launcher
└── README.md
```
