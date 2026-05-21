"""
Kiro Builder — FastAPI Backend
Entry point: uvicorn brain:app --reload --port 8000
All routes: /api/health /api/generate /api/analyze-image /api/upload
            /api/history /api/rollback /api/models /api/files
            /api/github/push /api/git/status /api/git/commit
"""

import os
import traceback
from typing import Optional

# Load .env FIRST — before any module that reads env vars at import time
from dotenv import load_dotenv
load_dotenv(override=True)

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from router import AIRouter
from parsers import parse_file
import git_manager
import projects_manager as pm
from fastapi.responses import FileResponse
from auth import (
    google_auth, get_current_user, require_user,
    get_user_projects_dir, create_token, _save_user, _get_user,
    GOOGLE_CLIENT_ID, decode_token,
)

# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(title="Kiro Builder API", version="2.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai = AIRouter()

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")


# ── Request models ────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    prompt: str
    techs: list[str] = []
    stack: dict = {}
    mode: str = "auto"
    provider: str = "auto"
    image_base64: Optional[str] = None
    image_media_type: str = "image/png"
    analysis_mode: str = "clone"
    instructions: Optional[str] = None
    conversation_history: Optional[list] = None
    action: Optional[str] = None
    project_id: Optional[str] = None
    context_files: Optional[list] = None  # existing files for iterative edits


class ProjectCreateRequest(BaseModel):
    name: str
    stack: list[str] = []


class FileWriteRequest(BaseModel):
    path: str
    content: str


class FileCreateRequest(BaseModel):
    path: str
    content: str = ""


class FileRenameRequest(BaseModel):
    old_path: str
    new_path: str


class FolderCreateRequest(BaseModel):
    path: str


class AnalyzeImageRequest(BaseModel):
    image_base64: str
    media_type: str = "image/png"


class RollbackRequest(BaseModel):
    commit_id: Optional[str] = None
    commit_hash: Optional[str] = None


class ChatSaveRequest(BaseModel):
    messages: list = []


class BackupCreateRequest(BaseModel):
    label: str = ""


class GithubPushRequest(BaseModel):
    repo: str
    token: str
    message: str = "feat: Kiro Builder update"
    files: Optional[list] = None
    private: bool = False


class GitCommitRequest(BaseModel):
    message: str
    files: Optional[list[str]] = None


class PlanRequest(BaseModel):
    prompt: str
    provider: str = "auto"


class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str = ""

class DevLoginRequest(BaseModel):
    email: str
    name: str = ""


# ── Auth routes ──────────────────────────────────────────────────────

@app.get("/api/auth/config")
async def auth_config():
    """Return Google OAuth client ID for the frontend."""
    return {
        "google_client_id": GOOGLE_CLIENT_ID,
        "auth_enabled": bool(GOOGLE_CLIENT_ID),
    }


@app.post("/api/auth/google")
async def auth_google(req: GoogleAuthRequest):
    """Exchange Google auth code for JWT + user info."""
    result = await google_auth(req.code, req.redirect_uri)
    return result


@app.post("/api/auth/dev-login")
async def auth_dev_login(req: DevLoginRequest):
    """Dev-only: login with just an email (no Google OAuth needed).
    Only available when GOOGLE_CLIENT_ID is not configured."""
    if GOOGLE_CLIENT_ID:
        raise HTTPException(403, detail="Dev login disabled when Google OAuth is configured")
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, detail="Invalid email")
    name = req.name.strip() or email.split("@")[0]
    profile = _save_user(email, name, "")
    token = create_token(email, name, "")
    return {
        "token": token,
        "user": {"email": email, "name": name, "picture": ""},
    }


@app.get("/api/auth/me")
async def auth_me(user: dict = Depends(require_user)):
    """Return current user info from JWT."""
    return {"user": user}


# ── Plan ──────────────────────────────────────────────────────────────
@app.post("/api/plan")
async def plan(req: PlanRequest):
    """Generate a structured project brief before full generation."""
    try:
        return await ai.plan_brief(req.prompt)
    except Exception as e:
        print(f"[KIRO] Plan error: {traceback.format_exc().encode('ascii', 'replace').decode()}")
        raise HTTPException(500, detail=str(e))


# ── Health ────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    """Health check — verify Claude key."""
    claude_ok = bool(ANTHROPIC_KEY)

    return {
        "status": "ok",
        "claude_ok": claude_ok,
        "version": "2.0.0",
    }


# ── Generate ──────────────────────────────────────────────────────────
@app.post("/api/generate")
async def generate(req: GenerateRequest, user: dict = Depends(get_current_user)):
    """Main generation route — routes to Claude or Ollama."""
    try:
        ue = _ue(user)
        result = await ai.route(
            req.prompt, req.techs, req.mode, req.image_base64, req.stack,
            req.image_media_type, req.analysis_mode, req.provider,
            context_files=req.context_files,
        )

        files = result.get("files", [])

        # ── Project-aware file saving ──────────────────────────────────
        project_id = req.project_id
        auto_created = False

        if files:
            if project_id:
                # Auto-backup before overwriting (so user can rollback)
                try:
                    label = "Avant génération" if not req.context_files else "Avant modification"
                    pm.create_backup(project_id, label, user_email=ue)
                except Exception as e:
                    print(f"[KIRO] Auto-backup warning: {e}")

                # Write to the specified project
                try:
                    pm.save_generated_files(project_id, files, user_email=ue)
                except HTTPException:
                    project_id = None  # project doesn't exist, fall through

            if not project_id:
                # Auto-create a project and save files there
                auto_project = pm.auto_create_project(req.prompt, user_email=ue)
                project_id   = auto_project["id"]
                pm.save_generated_files(project_id, files, user_email=ue)
                auto_created = True
                result["auto_project"]    = auto_project
                result["auto_project_id"] = project_id

        if project_id:
            result["project_id"] = project_id

        return result
    except Exception as e:
        print(f"[KIRO] Generate error: {traceback.format_exc().encode('ascii', 'replace').decode()}")
        raise HTTPException(500, detail=str(e))


# ── Image analysis ────────────────────────────────────────────────────
@app.post("/api/analyze-image")
async def analyze_image(req: AnalyzeImageRequest):
    """Analyze an image with Claude Vision."""
    try:
        return await ai.analyze(req.image_base64, req.media_type)
    except Exception as e:
        print(f"[KIRO] Analyze error: {e}")
        raise HTTPException(500, detail=str(e))


# ── File upload & parsing ─────────────────────────────────────────────
@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    """Upload and parse PDF/DOCX/CSV/JSON/ZIP files."""
    try:
        content = await file.read()
        result = parse_file(file.filename, content)
        result["filename"] = file.filename
        result["size"] = len(content)
        return result
    except Exception as e:
        print(f"[KIRO] Upload error: {e}")
        raise HTTPException(500, detail=str(e))


# ── Git history ───────────────────────────────────────────────────────
@app.get("/api/history")
async def get_history():
    """Return recent git commits."""
    try:
        commits = git_manager.get_history(limit=30)
        return {"commits": commits}
    except Exception as e:
        return {"commits": [], "error": str(e)}


# ── Rollback ──────────────────────────────────────────────────────────
@app.post("/api/rollback")
async def rollback(req: RollbackRequest):
    """Rollback to a specific commit."""
    commit_hash = req.commit_hash or req.commit_id
    if not commit_hash:
        raise HTTPException(400, detail="commit_hash or commit_id required")
    try:
        result = git_manager.rollback(commit_hash)
        return result
    except ValueError as e:
        raise HTTPException(404, detail=str(e))
    except Exception as e:
        raise HTTPException(500, detail=str(e))


# ── Models ────────────────────────────────────────────────────────────
@app.get("/api/models")
async def get_models():
    """List available AI models."""
    return await ai.list_models()


# ── Files ─────────────────────────────────────────────────────────────
@app.get("/api/files")
async def get_files():
    """Return project files from generated_projects/."""
    files = git_manager.read_files()
    return {
        "files": [
            {
                "name": f["name"],
                "path": f["path"],
                "content": f["content"][:300] + "..." if len(f["content"]) > 300 else f["content"],
                "language": f["language"],
            }
            for f in files
        ]
    }


# ── GitHub push ───────────────────────────────────────────────────────
@app.post("/api/github/push")
async def github_push(req: GithubPushRequest):
    """Push generated files to GitHub."""
    try:
        result = git_manager.push_to_github(
            repo_name=req.repo,
            token=req.token,
            message=req.message,
            files=req.files,
            private=req.private,
        )
        return result
    except Exception as e:
        print(f"[KIRO] GitHub push error: {e}")
        raise HTTPException(400, detail=str(e))


# ── Git status ────────────────────────────────────────────────────────
@app.get("/api/git/status")
async def git_status():
    """Return local git status."""
    try:
        return git_manager.get_status()
    except Exception as e:
        return {"initialized": False, "error": str(e)}


# ── Git commit ────────────────────────────────────────────────────────
@app.post("/api/git/commit")
async def git_commit(req: GitCommitRequest):
    """Create a local git commit."""
    try:
        result = git_manager.commit_files(req.message, req.files)
        return result
    except Exception as e:
        raise HTTPException(500, detail=str(e))


# ── Projects ──────────────────────────────────────────────────────────

def _ue(user): return user["email"] if user else None


@app.get("/api/projects")
async def projects_list(user: dict = Depends(get_current_user)):
    """List all projects."""
    return {"projects": pm.list_projects(user_email=_ue(user))}


@app.post("/api/projects")
async def projects_create(req: ProjectCreateRequest, user: dict = Depends(get_current_user)):
    """Create a new project."""
    try:
        project = pm.create_project(req.name, req.stack, user_email=_ue(user))
        return project
    except Exception as e:
        raise HTTPException(500, detail=str(e))


@app.get("/api/projects/{project_id}")
async def projects_get(project_id: str, user: dict = Depends(get_current_user)):
    """Get project metadata."""
    return pm.get_project(project_id, user_email=_ue(user))


@app.delete("/api/projects/{project_id}")
async def projects_delete(project_id: str, user: dict = Depends(get_current_user)):
    """Delete a project."""
    pm.delete_project(project_id, user_email=_ue(user))
    return {"ok": True}


@app.get("/api/projects/{project_id}/files")
async def projects_file_tree(project_id: str, user: dict = Depends(get_current_user)):
    """Return file tree for a project."""
    return {"files": pm.get_file_tree(project_id, user_email=_ue(user))}


@app.get("/api/projects/{project_id}/files/flat")
async def projects_files_flat(project_id: str, user: dict = Depends(get_current_user)):
    """Return all files with content (to hydrate IDE)."""
    return {"files": pm.get_project_files_flat(project_id, user_email=_ue(user))}


@app.get("/api/projects/{project_id}/file")
async def projects_read_file(project_id: str, path: str, user: dict = Depends(get_current_user)):
    """Read a specific file. path = query param."""
    content = pm.read_file(project_id, path, user_email=_ue(user))
    return {"path": path, "content": content}


@app.post("/api/projects/{project_id}/file")
async def projects_write_file(project_id: str, req: FileWriteRequest, user: dict = Depends(get_current_user)):
    """Write/update a file."""
    return pm.write_file(project_id, req.path, req.content, user_email=_ue(user))


@app.post("/api/projects/{project_id}/file/create")
async def projects_create_file(project_id: str, req: FileCreateRequest, user: dict = Depends(get_current_user)):
    """Create a new file."""
    return pm.create_file(project_id, req.path, req.content, user_email=_ue(user))


@app.delete("/api/projects/{project_id}/file")
async def projects_delete_file(project_id: str, path: str, user: dict = Depends(get_current_user)):
    """Delete a file or folder. path = query param."""
    return pm.delete_file_or_folder(project_id, path, user_email=_ue(user))


@app.post("/api/projects/{project_id}/file/rename")
async def projects_rename_file(project_id: str, req: FileRenameRequest, user: dict = Depends(get_current_user)):
    """Rename or move a file."""
    return pm.rename_file(project_id, req.old_path, req.new_path, user_email=_ue(user))


@app.post("/api/projects/{project_id}/folder")
async def projects_create_folder(project_id: str, req: FolderCreateRequest, user: dict = Depends(get_current_user)):
    """Create a folder."""
    return pm.create_folder(project_id, req.path, user_email=_ue(user))


@app.get("/api/projects/{project_id}/preview/{file_path:path}")
async def projects_serve_file(project_id: str, file_path: str, user: dict = Depends(get_current_user)):
    """Serve a static file from a project (for preview)."""
    try:
        target = pm._safe_path(project_id, file_path, user_email=_ue(user))
        if not target.exists() or not target.is_file():
            raise HTTPException(404, detail="File not found")
        return FileResponse(str(target))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=str(e))


@app.get("/api/projects/{project_id}/assembled")
async def projects_assembled_preview(project_id: str, user: dict = Depends(get_current_user)):
    """Assemble all project files into a single preview HTML.

    For Vite/React projects where index.html is just a shell,
    this inlines the CSS and JSX into a standalone HTML document
    using Babel standalone for client-side transpilation.
    """
    import re

    try:
        files = pm.get_project_files_flat(project_id, user_email=_ue(user))
        if not files:
            return {"html": ""}

        # Find index.html
        html_file = next((f for f in files if f.get("name") == "index.html"), None)
        html_content = html_file.get("content", "") if html_file else ""

        # Check if it's a Vite shell (has <script type="module" src=)
        is_vite_shell = '<script type="module"' in html_content and '<div id="root">' in html_content

        if not is_vite_shell:
            # Already a standalone HTML — inject animation fallback if needed
            html_out = html_content
            if any(cls in html_out for cls in ['fade-up', 'fade-in', 'reveal', 'slide-up', 'animate-on-scroll']):
                fallback_js = (
                    "\n<script>"
                    "document.addEventListener('DOMContentLoaded',function(){"
                    "setTimeout(function(){"
                    "document.querySelectorAll('.fade-up,.fade-in,.reveal,.slide-up,.animate-on-scroll')"
                    ".forEach(function(el){el.classList.add('visible','in-view','revealed','active');"
                    "el.style.opacity='1';el.style.transform='none'})},300);"
                    "if(window.IntersectionObserver){"
                    "var o=new IntersectionObserver(function(entries){"
                    "entries.forEach(function(e){if(e.isIntersecting){"
                    "e.target.classList.add('visible','in-view');e.target.style.opacity='1';e.target.style.transform='none'}})}"
                    ",{threshold:0.1});"
                    "document.querySelectorAll('.fade-up,.fade-in,.reveal,.slide-up,.animate-on-scroll')"
                    ".forEach(function(el){o.observe(el)})}"
                    "});</scr" + "ipt>\n"
                )
                if "</body>" in html_out:
                    html_out = html_out.replace("</body>", fallback_js + "</body>", 1)
            return {"html": html_out}

        # Vite project → assemble from parts
        css_parts = []
        jsx_parts = []
        for f in files:
            name = f.get("name", "")
            content = f.get("content", "")
            if not content:
                continue
            if name.endswith(".css"):
                # Skip @tailwind directives (handled by CDN)
                cleaned = re.sub(r'@tailwind\s+\w+;\s*', '', content)
                if cleaned.strip():
                    css_parts.append(f"/* {name} */\n{cleaned}")
            elif name.endswith((".jsx", ".tsx")) and name not in ("main.jsx", "main.tsx"):
                # Strip import/export statements for inline bundling
                cleaned = re.sub(r'^\s*import\s+.*?[\'";]\s*$', '', content, flags=re.MULTILINE)
                cleaned = re.sub(r'^\s*export\s+default\s+', '', cleaned, flags=re.MULTILINE)
                cleaned = re.sub(r'^\s*export\s+', '', cleaned, flags=re.MULTILINE)
                jsx_parts.append(f"// ── {name} ──\n{cleaned}")

        # Extract title from original HTML
        title_match = re.search(r'<title>(.*?)</title>', html_content, re.I)
        title = title_match.group(1) if title_match else "Preview"

        # Build assembled HTML
        assembled = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
{chr(10).join(css_parts)}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel">
const {{ useState, useEffect, useRef, useCallback, useMemo, Fragment }} = React;

{chr(10).join(jsx_parts)}

// ── Mount ──
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
  </script>
</body>
</html>"""
        return {"html": assembled}
    except Exception as e:
        print(f"[KIRO] Assembled preview error: {e}")
        return {"html": ""}


# ── Chat persistence ─────────────────────────────────────────────────

@app.get("/api/projects/{project_id}/chat")
async def projects_load_chat(project_id: str, user: dict = Depends(get_current_user)):
    """Load chat messages for a project."""
    messages = pm.load_chat(project_id, user_email=_ue(user))
    return {"messages": messages}


@app.post("/api/projects/{project_id}/chat")
async def projects_save_chat(project_id: str, req: ChatSaveRequest, user: dict = Depends(get_current_user)):
    """Save chat messages for a project."""
    return pm.save_chat(project_id, req.messages, user_email=_ue(user))


# ── Backup system ────────────────────────────────────────────────────

@app.get("/api/projects/{project_id}/backups")
async def projects_list_backups(project_id: str, user: dict = Depends(get_current_user)):
    """List all backups for a project."""
    return {"backups": pm.list_backups(project_id, user_email=_ue(user))}


@app.post("/api/projects/{project_id}/backups")
async def projects_create_backup(project_id: str, req: BackupCreateRequest, user: dict = Depends(get_current_user)):
    """Create a backup snapshot of the project."""
    return pm.create_backup(project_id, req.label, user_email=_ue(user))


@app.post("/api/projects/{project_id}/backups/{backup_id}/restore")
async def projects_restore_backup(project_id: str, backup_id: str, user: dict = Depends(get_current_user)):
    """Restore a project from a backup snapshot."""
    return pm.restore_backup(project_id, backup_id, user_email=_ue(user))


@app.delete("/api/projects/{project_id}/backups/{backup_id}")
async def projects_delete_backup(project_id: str, backup_id: str, user: dict = Depends(get_current_user)):
    """Delete a specific backup."""
    return pm.delete_backup(project_id, backup_id, user_email=_ue(user))


# ── Entry point ───────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("brain:app", host="0.0.0.0", port=port, reload=True)
