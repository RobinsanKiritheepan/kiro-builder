"""
Kiro Builder — Project Manager
Handles per-project filesystem isolation under backend/projects/{id}/
Each project: kiro.json metadata + arbitrary file tree
"""

import os
import json
import shutil
import re
import subprocess
import threading
from pathlib import Path
from datetime import datetime

from fastapi import HTTPException

PROJECTS_DIR = Path(__file__).parent / "projects"


# ── User-scoped directory ────────────────────────────────────────────

def _user_projects_dir(user_email: str | None = None) -> Path:
    """Return projects dir scoped to user. Falls back to global if no user."""
    if user_email:
        import re
        safe = re.sub(r'[^a-zA-Z0-9._@-]', '_', user_email.lower().strip())
        d = PROJECTS_DIR / safe
        d.mkdir(parents=True, exist_ok=True)
        return d
    return PROJECTS_DIR


# ── Helpers ───────────────────────────────────────────────────────────

def _ensure_dir(user_email: str | None = None):
    _user_projects_dir(user_email).mkdir(exist_ok=True)


def _slug(name: str) -> str:
    """Convert project name to filesystem-safe ID."""
    slug = re.sub(r'[^a-zA-Z0-9\-_]', '-', name.lower().strip())
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug or 'project'


def _valid_id(project_id: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9_\-]+$', project_id))


def _safe_path(project_id: str, rel_path: str, user_email: str | None = None) -> Path:
    """Return absolute path inside project dir. Raises HTTP 400 on path traversal."""
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_root = (base / project_id).resolve()
    if not project_root.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")
    rel = rel_path.lstrip('/')
    target = (project_root / rel).resolve()
    try:
        target.relative_to(project_root)
    except ValueError:
        raise HTTPException(400, detail="Path traversal detected")
    return target


def _read_kiro_json(project_dir: Path) -> dict | None:
    kiro = project_dir / "kiro.json"
    if not kiro.exists():
        return None
    try:
        return json.loads(kiro.read_text(encoding='utf-8'))
    except Exception:
        return None


def _touch_updated(project_id: str, user_email: str | None = None):
    """Bump updated_at in kiro.json."""
    try:
        base = _user_projects_dir(user_email)
        kiro_path = base / project_id / "kiro.json"
        if kiro_path.exists():
            meta = json.loads(kiro_path.read_text(encoding='utf-8'))
            meta["updated_at"] = datetime.utcnow().isoformat() + "Z"
            kiro_path.write_text(json.dumps(meta, indent=2), encoding='utf-8')
    except Exception:
        pass


def _get_lang(filename: str) -> str:
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return {
        'js': 'javascript', 'jsx': 'javascript', 'mjs': 'javascript',
        'ts': 'typescript', 'tsx': 'typescript',
        'py': 'python', 'html': 'html', 'css': 'css', 'scss': 'css',
        'json': 'json', 'md': 'markdown', 'sh': 'shell', 'bash': 'shell',
        'yaml': 'yaml', 'yml': 'yaml', 'sql': 'sql', 'rs': 'rust',
        'go': 'go', 'java': 'java', 'rb': 'ruby', 'php': 'php',
        'vue': 'javascript', 'svelte': 'javascript',
        'toml': 'toml', 'xml': 'xml', 'txt': 'plaintext',
    }.get(ext, 'plaintext')


# ── React + Vite + Tailwind template ─────────────────────────────────

TEMPLATE_DIR = PROJECTS_DIR / "_template"
_template_lock = threading.Lock()


def _ensure_template():
    """Create + npm-install the shared template once. All projects copy from it."""
    if (TEMPLATE_DIR / "node_modules" / "react").exists():
        return  # already ready

    with _template_lock:
        # Double-check after acquiring lock
        if (TEMPLATE_DIR / "node_modules" / "react").exists():
            return

        print("[KIRO TEMPLATE] Building shared React+Vite+Tailwind template...")
        TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)

        pkg = {
            "name": "kiro-template",
            "private": True,
            "version": "0.1.0",
            "type": "module",
            "scripts": {
                "dev": "vite",
                "build": "vite build",
                "preview": "vite preview"
            },
            "dependencies": {
                "react": "^19.0.0",
                "react-dom": "^19.0.0"
            },
            "devDependencies": {
                "@vitejs/plugin-react": "^4.4.0",
                "vite": "^6.0.0",
                "tailwindcss": "^3.4.0",
                "postcss": "^8.4.0",
                "autoprefixer": "^10.4.0"
            }
        }
        (TEMPLATE_DIR / "package.json").write_text(
            json.dumps(pkg, indent=2), encoding='utf-8')

        (TEMPLATE_DIR / "vite.config.js").write_text(
            "import { defineConfig } from 'vite'\n"
            "import react from '@vitejs/plugin-react'\n\n"
            "export default defineConfig({\n"
            "  plugins: [react()],\n"
            "})\n", encoding='utf-8')

        (TEMPLATE_DIR / "tailwind.config.js").write_text(
            "/** @type {import('tailwindcss').Config} */\n"
            "export default {\n"
            "  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],\n"
            "  theme: { extend: {} },\n"
            "  plugins: [],\n"
            "}\n", encoding='utf-8')

        (TEMPLATE_DIR / "postcss.config.js").write_text(
            "export default {\n"
            "  plugins: {\n"
            "    tailwindcss: {},\n"
            "    autoprefixer: {},\n"
            "  },\n"
            "}\n", encoding='utf-8')

        (TEMPLATE_DIR / ".gitignore").write_text(
            "node_modules/\ndist/\n.env\n.DS_Store\n", encoding='utf-8')

        src = TEMPLATE_DIR / "src"
        src.mkdir(exist_ok=True)
        (TEMPLATE_DIR / "public").mkdir(exist_ok=True)

        (TEMPLATE_DIR / "index.html").write_text(
            '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
            '  <meta charset="UTF-8" />\n'
            '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
            '  <title>Kiro App</title>\n'
            '</head>\n<body>\n'
            '  <div id="root"></div>\n'
            '  <script type="module" src="/src/main.jsx"></script>\n'
            '</body>\n</html>\n', encoding='utf-8')

        (src / "main.jsx").write_text(
            "import React from 'react'\n"
            "import ReactDOM from 'react-dom/client'\n"
            "import App from './App'\n"
            "import './index.css'\n\n"
            "ReactDOM.createRoot(document.getElementById('root')).render(\n"
            "  <React.StrictMode>\n"
            "    <App />\n"
            "  </React.StrictMode>\n"
            ")\n", encoding='utf-8')

        (src / "index.css").write_text(
            "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n",
            encoding='utf-8')

        (src / "App.jsx").write_text(
            "export default function App() {\n"
            "  return (\n"
            '    <div className="min-h-screen bg-gray-50 flex items-center justify-center">\n'
            '      <h1 className="text-4xl font-bold text-gray-800">Hello Kiro</h1>\n'
            "    </div>\n"
            "  )\n"
            "}\n", encoding='utf-8')

        # npm install — only happens once
        npm = shutil.which("npm")
        if npm:
            print("[KIRO TEMPLATE] npm install (one-time)...")
            r = subprocess.run(
                [npm, "install"],
                cwd=str(TEMPLATE_DIR),
                capture_output=True, text=True, timeout=180,
                env={**os.environ, "NODE_ENV": "development"},
            )
            if r.returncode == 0:
                print("[KIRO TEMPLATE] npm install OK")
            else:
                print(f"[KIRO TEMPLATE] npm install FAILED: {r.stderr[:300]}")
        else:
            print("[KIRO TEMPLATE] npm not found, template has no node_modules")


def _scaffold_from_template(project_dir: Path, project_name: str):
    """Copy the shared template into a new project directory (fast)."""
    _ensure_template()

    # Copy everything from template into project dir
    for item in TEMPLATE_DIR.iterdir():
        dest = project_dir / item.name
        if dest.exists():
            continue  # don't overwrite kiro.json etc.
        if item.is_dir():
            shutil.copytree(item, dest, symlinks=True)
        else:
            shutil.copy2(item, dest)

    # Customize: update package name and page title
    pkg_path = project_dir / "package.json"
    if pkg_path.exists():
        pkg = json.loads(pkg_path.read_text(encoding='utf-8'))
        pkg["name"] = _slug(project_name)
        pkg_path.write_text(json.dumps(pkg, indent=2), encoding='utf-8')

    idx_path = project_dir / "index.html"
    if idx_path.exists():
        html = idx_path.read_text(encoding='utf-8')
        html = html.replace('<title>Kiro App</title>', f'<title>{project_name}</title>')
        idx_path.write_text(html, encoding='utf-8')

    print(f"[KIRO PROJECTS] Scaffolded from template -> {project_dir.name}")


# ── Project CRUD ──────────────────────────────────────────────────────

def create_project(name: str, stack: list = [], user_email: str | None = None) -> dict:
    """Create a new project directory with kiro.json + React scaffold."""
    _ensure_dir(user_email)
    base = _user_projects_dir(user_email)
    base_slug = _slug(name)
    slug = base_slug
    counter = 1
    while (base / slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    project_id = slug
    project_dir = base / project_id
    project_dir.mkdir(parents=True)

    meta = {
        "id":         project_id,
        "name":       name,
        "stack":      stack,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    (project_dir / "kiro.json").write_text(json.dumps(meta, indent=2), encoding='utf-8')

    # Scaffold React + Vite + Tailwind from shared template
    _scaffold_from_template(project_dir, name)

    print(f"[KIRO PROJECTS] Created: {project_id}")
    return meta


def list_projects(user_email: str | None = None) -> list[dict]:
    """Return all projects sorted by modification time (newest first)."""
    _ensure_dir(user_email)
    base = _user_projects_dir(user_email)
    projects = []
    for d in sorted(base.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if d.is_dir() and d.name != '_template':
            meta = _read_kiro_json(d)
            if meta:
                projects.append(meta)
    return projects


def get_project(project_id: str, user_email: str | None = None) -> dict:
    """Return metadata for a single project."""
    _ensure_dir(user_email)
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")
    meta = _read_kiro_json(project_dir)
    if not meta:
        raise HTTPException(404, detail=f"Project '{project_id}' has no kiro.json")
    return meta


def delete_project(project_id: str, user_email: str | None = None) -> bool:
    """Delete a project directory entirely."""
    _ensure_dir(user_email)
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")
    shutil.rmtree(project_dir)
    print(f"[KIRO PROJECTS] Deleted: {project_id}")
    return True


# ── File tree ─────────────────────────────────────────────────────────

_SKIP_DIRS = {'node_modules', '.git', 'dist', '__pycache__', '.vite', '.backups'}

def _build_tree(directory: Path, root: Path) -> list[dict]:
    result = []
    try:
        entries = sorted(
            directory.iterdir(),
            key=lambda p: (p.is_file(), p.name.lower()),
        )
        for entry in entries:
            if entry.name == 'kiro.json':
                continue
            if entry.is_dir() and entry.name in _SKIP_DIRS:
                continue
            rel = entry.relative_to(root).as_posix()
            if entry.is_dir():
                result.append({
                    "name":     entry.name,
                    "path":     rel + "/",
                    "type":     "directory",
                    "children": _build_tree(entry, root),
                })
            else:
                result.append({
                    "name": entry.name,
                    "path": rel,
                    "type": "file",
                })
    except PermissionError:
        pass
    return result


def get_file_tree(project_id: str, user_email: str | None = None) -> list[dict]:
    """Return recursive file tree for a project."""
    _ensure_dir(user_email)
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")
    return _build_tree(project_dir, project_dir)


# ── File read / write ─────────────────────────────────────────────────

def read_file(project_id: str, rel_path: str, user_email: str | None = None) -> str:
    """Read a file from a project."""
    target = _safe_path(project_id, rel_path, user_email)
    if not target.exists():
        raise HTTPException(404, detail=f"File '{rel_path}' not found")
    if not target.is_file():
        raise HTTPException(400, detail=f"'{rel_path}' is not a file")
    return target.read_text(encoding='utf-8', errors='replace')


def write_file(project_id: str, rel_path: str, content: str, user_email: str | None = None) -> dict:
    """Write content to a file (creates parent dirs as needed)."""
    target = _safe_path(project_id, rel_path, user_email)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')
    _touch_updated(project_id, user_email)
    return {"ok": True, "path": rel_path}


def create_file(project_id: str, rel_path: str, content: str = "", user_email: str | None = None) -> dict:
    """Create a new file (same as write_file, exposed separately for clarity)."""
    return write_file(project_id, rel_path, content, user_email)


def delete_file_or_folder(project_id: str, rel_path: str, user_email: str | None = None) -> dict:
    """Delete a file or folder."""
    target = _safe_path(project_id, rel_path, user_email)
    if not target.exists():
        raise HTTPException(404, detail=f"'{rel_path}' not found")
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    _touch_updated(project_id, user_email)
    return {"ok": True, "path": rel_path}


def rename_file(project_id: str, old_path: str, new_path: str, user_email: str | None = None) -> dict:
    """Rename or move a file/folder within the project."""
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_root = (base / project_id).resolve()
    if not project_root.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")

    src = _safe_path(project_id, old_path, user_email)
    # Validate destination manually (project must exist for _safe_path)
    new_rel = new_path.lstrip('/')
    dst = (project_root / new_rel).resolve()
    try:
        dst.relative_to(project_root)
    except ValueError:
        raise HTTPException(400, detail="Path traversal detected in new_path")

    if not src.exists():
        raise HTTPException(404, detail=f"'{old_path}' not found")
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.rename(dst)
    _touch_updated(project_id, user_email)
    return {"ok": True, "old_path": old_path, "new_path": new_path}


def create_folder(project_id: str, rel_path: str, user_email: str | None = None) -> dict:
    """Create a folder inside a project."""
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_root = (base / project_id).resolve()
    if not project_root.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")
    rel = rel_path.lstrip('/')
    target = (project_root / rel).resolve()
    try:
        target.relative_to(project_root)
    except ValueError:
        raise HTTPException(400, detail="Path traversal detected")
    target.mkdir(parents=True, exist_ok=True)
    _touch_updated(project_id, user_email)
    return {"ok": True, "path": rel_path}


# ── Bulk operations (used by /api/generate) ───────────────────────────

def save_generated_files(project_id: str, files: list[dict], user_email: str | None = None) -> dict:
    """Write all AI-generated files to a project directory."""
    _ensure_dir(user_email)
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")
    project_root = project_dir.resolve()

    written = 0
    for f in files:
        name     = f.get("name", "file.txt")
        raw_path = f.get("path", "/").lstrip("/").rstrip("/")
        content  = f.get("content", "")
        # Handle two formats:
        #   1. path is directory  -> {name:"App.jsx", path:"/src/"}  -> rel = "src/App.jsx"
        #   2. path is full path  -> {name:"App.jsx", path:"/src/App.jsx"} -> rel = "src/App.jsx"
        if raw_path.endswith(name):
            rel = raw_path  # path already includes the filename
        else:
            rel = f"{raw_path}/{name}".lstrip("/") if raw_path else name
        target  = (project_root / rel).resolve()
        try:
            target.relative_to(project_root)
        except ValueError:
            continue  # skip path traversal attempts
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding='utf-8')
        written += 1

    _touch_updated(project_id, user_email)
    print(f"[KIRO PROJECTS] Saved {written} files -> {project_id}")
    return {"ok": True, "files_written": written}


def get_project_files_flat(project_id: str, user_email: str | None = None) -> list[dict]:
    """Return all files as flat list with content (used to hydrate IDE)."""
    _ensure_dir(user_email)
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")

    result = []
    for p in sorted(project_dir.rglob("*"), key=lambda x: x.as_posix()):
        # Skip heavy/generated dirs
        if any(part in _SKIP_DIRS for part in p.parts):
            continue
        if p.is_file() and p.name not in ('kiro.json', 'chat.json'):
            rel   = p.relative_to(project_dir).as_posix()
            parts = rel.rsplit('/', 1)
            name  = parts[-1]
            path  = ('/' + parts[0] + '/') if len(parts) > 1 else '/'
            try:
                content = p.read_text(encoding='utf-8', errors='replace')
            except Exception:
                content = ''
            result.append({
                "name":     name,
                "path":     path,
                "content":  content,
                "language": _get_lang(name),
            })
    return result


# ── Auto-create helper ────────────────────────────────────────────────

def auto_create_project(prompt: str = "", user_email: str | None = None) -> dict:
    """Create a project automatically with a name derived from the user prompt."""
    ts = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
    # Extract a meaningful name from the prompt (first 40 chars, cleaned)
    base = prompt.strip()[:40].strip() if prompt.strip() else ""
    if base:
        # Remove trailing incomplete words
        if ' ' in base and not prompt.strip()[40:41] == '':
            base = base[:base.rfind(' ')]
        name = f"{base} {ts}"
    else:
        name = f"project-{ts}"
    return create_project(name, stack=[], user_email=user_email)


# ── Chat persistence ─────────────────────────────────────────────────

def save_chat(project_id: str, messages: list, user_email: str | None = None) -> dict:
    """Save chat messages to project folder."""
    _ensure_dir(user_email)
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")
    chat_path = project_dir / "chat.json"
    # Cap at 100 messages
    capped = messages[-100:] if len(messages) > 100 else messages
    chat_path.write_text(json.dumps(capped, ensure_ascii=False, indent=2), encoding='utf-8')
    return {"ok": True, "count": len(capped)}


def load_chat(project_id: str, user_email: str | None = None) -> list:
    """Load chat messages from project folder."""
    _ensure_dir(user_email)
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")
    chat_path = project_dir / "chat.json"
    if not chat_path.exists():
        return []
    try:
        data = json.loads(chat_path.read_text(encoding='utf-8'))
        # Handle both formats: raw list or {messages: [...]}
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return data.get("messages", [])
        return []
    except Exception:
        return []


# ── Backup system ────────────────────────────────────────────────────

def _backups_dir(project_id: str, user_email: str | None = None) -> Path:
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")
    bk_dir = project_dir / ".backups"
    bk_dir.mkdir(exist_ok=True)
    return bk_dir


def create_backup(project_id: str, label: str = "", user_email: str | None = None) -> dict:
    """Create a timestamped snapshot of the project files."""
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")

    ts = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
    backup_id = f"backup-{ts}"
    bk_dir = _backups_dir(project_id, user_email) / backup_id
    bk_dir.mkdir(parents=True, exist_ok=True)

    # Copy all project files (skip node_modules, .backups, .git, dist)
    skip = {'node_modules', '.git', 'dist', '__pycache__', '.vite', '.backups'}
    for item in project_dir.iterdir():
        if item.name in skip:
            continue
        dest = bk_dir / item.name
        if item.is_dir():
            shutil.copytree(item, dest, symlinks=True)
        else:
            shutil.copy2(item, dest)

    # Save backup metadata
    meta = {
        "id": backup_id,
        "label": label or f"Backup {ts}",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "project_id": project_id,
    }
    (bk_dir / "_backup_meta.json").write_text(json.dumps(meta, indent=2), encoding='utf-8')

    print(f"[KIRO BACKUP] Created: {project_id}/{backup_id}")
    return meta


def list_backups(project_id: str, user_email: str | None = None) -> list[dict]:
    """List all backups for a project, newest first."""
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")

    bk_dir = project_dir / ".backups"
    if not bk_dir.exists():
        return []

    backups = []
    for d in sorted(bk_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if d.is_dir():
            meta_path = d / "_backup_meta.json"
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text(encoding='utf-8'))
                    backups.append(meta)
                except Exception:
                    pass
    return backups


def restore_backup(project_id: str, backup_id: str, user_email: str | None = None) -> dict:
    """Restore a project from a backup snapshot."""
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")

    bk_dir = project_dir / ".backups" / backup_id
    if not bk_dir.exists():
        raise HTTPException(404, detail=f"Backup '{backup_id}' not found")

    # First create an auto-backup of current state before restoring
    auto_backup = create_backup(project_id, label=f"Auto-save before restore {backup_id}", user_email=user_email)

    # Clear project files (keep .backups and node_modules)
    keep = {'node_modules', '.git', 'dist', '.backups', '.vite'}
    for item in project_dir.iterdir():
        if item.name in keep:
            continue
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()

    # Copy backup files back
    for item in bk_dir.iterdir():
        if item.name == '_backup_meta.json':
            continue
        dest = project_dir / item.name
        if item.is_dir():
            shutil.copytree(item, dest, symlinks=True)
        else:
            shutil.copy2(item, dest)

    _touch_updated(project_id, user_email)
    print(f"[KIRO BACKUP] Restored: {project_id} from {backup_id}")
    return {"ok": True, "backup_id": backup_id, "auto_backup": auto_backup}


def delete_backup(project_id: str, backup_id: str, user_email: str | None = None) -> dict:
    """Delete a specific backup."""
    if not _valid_id(project_id):
        raise HTTPException(400, detail="Invalid project_id")
    base = _user_projects_dir(user_email)
    project_dir = base / project_id
    if not project_dir.exists():
        raise HTTPException(404, detail=f"Project '{project_id}' not found")

    bk_dir = project_dir / ".backups" / backup_id
    if not bk_dir.exists():
        raise HTTPException(404, detail=f"Backup '{backup_id}' not found")

    shutil.rmtree(bk_dir)
    print(f"[KIRO BACKUP] Deleted: {project_id}/{backup_id}")
    return {"ok": True, "backup_id": backup_id}
