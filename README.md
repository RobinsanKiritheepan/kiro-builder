# Kiro Builder

Générateur d'applications web par IA — façon Lovable.dev — avec un frontend React et un backend FastAPI.

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Claude API](https://img.shields.io/badge/Claude_API-D97757?style=flat&logo=anthropic&logoColor=white)

## Fonctionnalités

- **Génération de code par IA** — Claude Sonnet (cas complexes) + Ollama (cas simples) + Vision (images)
- **Aperçu en direct** — Vues Web, Mobile (cadre iPhone) et HTML brut
- **Éditeur de code** — Coloration syntaxique highlight.js avec numéros de ligne
- **Explorateur de fichiers** — Arborescence façon VSCode avec icônes par extension
- **Historique Git** — Liste des commits, rollback et push vers GitHub
- **Mode démo** — Fonctionne hors-ligne sans clé API

## Démarrage rapide

```bash
# Windows — double-cliquer ou lancer :
start.bat
```

Ce script va :
1. Créer un environnement virtuel Python + installer les dépendances
2. Démarrer le backend FastAPI sur le port 8000
3. Démarrer le serveur Vite sur le port 3000
4. Ouvrir http://localhost:3000 dans le navigateur

## Installation manuelle

### Backend

```bash
cd backend
cp .env.example .env          # Ajouter votre ANTHROPIC_API_KEY
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Requis pour le mode Claude / Vision |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Modèle Claude utilisé |
| `OLLAMA_URL` | `http://localhost:11434` | URL du serveur Ollama |
| `OLLAMA_MODEL` | `llama3.2` | Nom du modèle Ollama |

## Routes de l'API

| Méthode | Chemin | Description |
|---|---|---|
| `GET` | `/api/health` | Vérification de l'état |
| `POST` | `/api/generate` | Génère du code à partir d'un prompt |
| `POST` | `/api/upload` | Upload d'image (renvoie du base64) |
| `GET` | `/api/history` | Liste l'historique des commits |
| `POST` | `/api/rollback` | Restaure un commit précédent |
| `GET` | `/api/files` | Liste les fichiers courants |
| `POST` | `/api/github/push` | Pousse index.html vers GitHub |

## Logique de routage IA

```
Image fournie ?   → Claude Vision
mode = "claude"   → Claude Sonnet
mode = "ollama"   → Ollama
mode = "auto"     → Prompt complexe / long / React/FastAPI → Claude
                    Prompt simple                          → Ollama (fallback Claude)
```

## Structure du projet

```
KiroBuilder/
├── frontend/              # React + Vite + Tailwind v3
│   └── src/
│       ├── App.jsx
│       ├── components/    # TopBar, LeftPanel, CodeEditor, PreviewPanel...
│       └── hooks/         # useGenerate.js, useGitHub.js
├── backend/               # FastAPI + brain.py
│   ├── brain.py           # Logique de génération
│   ├── router.py          # Routes API
│   └── requirements.txt
├── index.html             # Version autonome (fichier unique)
├── start.bat              # Lanceur Windows
└── README.md
```

---

ROBINSAN Kiritheepan — Étudiant ingénieur à l'ENSEA
