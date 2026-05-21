"""
Kiro Builder — Git Manager
Local git operations (GitPython) + GitHub push (PyGithub).
Working directory: backend/generated_projects/
"""

import os
import base64
from pathlib import Path
from datetime import datetime

import git  # GitPython
from github import Github, GithubException

# ── Project directory ─────────────────────────────────────────────────
PROJECTS_DIR = Path(__file__).parent / "generated_projects"


def _ensure_repo() -> git.Repo:
    """Initialise the git repo if it doesn't exist, return Repo object."""
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

    gitignore = PROJECTS_DIR / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text("__pycache__/\n.env\nnode_modules/\n.DS_Store\n", encoding="utf-8")

    try:
        repo = git.Repo(PROJECTS_DIR)
    except git.InvalidGitRepositoryError:
        repo = git.Repo.init(PROJECTS_DIR)
        print(f"[KIRO] Git repo initialized at {PROJECTS_DIR}")
        # Initial commit so we have a HEAD
        repo.index.add([".gitignore"])
        repo.index.commit("Initial commit")

    return repo


# ── File operations ───────────────────────────────────────────────────
def save_files(files: list[dict]) -> list[str]:
    """Write generated files to disk. Returns list of written paths."""
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    written = []

    for f in files:
        name = f.get("name", "index.html")
        rel_path = f.get("path", f"/{name}").lstrip("/")
        full_path = PROJECTS_DIR / rel_path

        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(f.get("content", ""), encoding="utf-8")
        written.append(rel_path)

    return written


def read_files() -> list[dict]:
    """Read all project files from generated_projects/."""
    if not PROJECTS_DIR.exists():
        return []

    files = []
    for path in sorted(PROJECTS_DIR.rglob("*")):
        if path.is_dir():
            continue
        if path.name.startswith("."):
            continue
        if ".git" in path.parts:
            continue

        rel = path.relative_to(PROJECTS_DIR).as_posix()
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            continue

        ext = path.suffix.lstrip(".")
        lang_map = {
            "jsx": "jsx", "tsx": "tsx", "js": "javascript", "ts": "typescript",
            "py": "python", "html": "html", "css": "css", "scss": "scss",
            "json": "json", "sql": "sql", "md": "markdown", "yaml": "yaml",
            "yml": "yaml", "toml": "toml",
        }

        files.append({
            "name": path.name,
            "path": rel,
            "content": content,
            "language": lang_map.get(ext, ext),
        })

    return files


# ── Git operations ────────────────────────────────────────────────────
def auto_commit(message: str) -> dict:
    """Stage all changes and commit. Returns commit info."""
    repo = _ensure_repo()

    repo.git.add("-A")

    if not repo.is_dirty(untracked_files=True):
        return {"hash": "", "message": "No changes to commit"}

    commit = repo.index.commit(message)
    short = commit.hexsha[:7]
    print(f"[KIRO] Committed: {short} — {message}")

    return {
        "hash": commit.hexsha,
        "short_hash": short,
        "message": message,
        "date": datetime.now().isoformat(),
    }


def commit_files(message: str, files: list[str] | None = None) -> dict:
    """Commit specific files or all changes."""
    repo = _ensure_repo()

    if files:
        for f in files:
            repo.index.add([f])
    else:
        repo.git.add("-A")

    if not repo.is_dirty(untracked_files=True):
        return {"hash": "", "message": "No changes to commit"}

    commit = repo.index.commit(message)
    return {
        "hash": commit.hexsha,
        "short_hash": commit.hexsha[:7],
        "message": message,
    }


def get_history(limit: int = 30) -> list[dict]:
    """Return recent commits from the repo."""
    try:
        repo = _ensure_repo()
    except Exception:
        return []

    commits = []
    for c in repo.iter_commits(max_count=limit):
        commits.append({
            "hash": c.hexsha,
            "short_hash": c.hexsha[:7],
            "message": c.message.strip(),
            "date": c.committed_datetime.isoformat(),
            "files_changed": c.stats.total.get("files", 0),
        })

    return commits


def rollback(commit_hash: str) -> dict:
    """Checkout files from a specific commit. Returns file list."""
    repo = _ensure_repo()

    try:
        repo.git.checkout(commit_hash, "--", ".")
    except git.GitCommandError as e:
        raise ValueError(f"Cannot rollback to {commit_hash}: {e}")

    files = read_files()

    # Auto-commit the rollback
    auto_commit(f"Rollback to {commit_hash[:7]}")

    return {
        "files": files,
        "commit_hash": commit_hash,
        "message": f"Rolled back to {commit_hash[:7]}",
    }


def get_status() -> dict:
    """Return git status: modified, untracked, staged files."""
    try:
        repo = _ensure_repo()
    except Exception:
        return {"initialized": False, "modified": [], "untracked": [], "staged": []}

    return {
        "initialized": True,
        "branch": str(repo.active_branch) if not repo.head.is_detached else "detached",
        "modified": [item.a_path for item in repo.index.diff(None)],
        "untracked": repo.untracked_files,
        "staged": [item.a_path for item in repo.index.diff("HEAD")],
    }


# ── GitHub push ───────────────────────────────────────────────────────
def push_to_github(
    repo_name: str,
    token: str,
    message: str,
    files: list[dict] | None = None,
    private: bool = False,
) -> dict:
    """Push files to a GitHub repository using PyGithub."""
    g = Github(token)
    user = g.get_user()

    # Parse repo name — support "owner/repo" or just "repo"
    if "/" in repo_name:
        owner, name = repo_name.split("/", 1)
    else:
        owner = user.login
        name = repo_name

    # Get or create repo
    try:
        if owner == user.login:
            repo = user.get_repo(name)
        else:
            repo = g.get_repo(f"{owner}/{name}")
        print(f"[KIRO] Found existing repo: {repo.html_url}")
    except GithubException:
        repo = user.create_repo(name, private=private, auto_init=True)
        print(f"[KIRO] Created new repo: {repo.html_url}")

    # If no files passed, read from generated_projects/
    if not files:
        files = read_files()

    if not files:
        raise ValueError("No files to push")

    # Push each file
    commit_url = None
    for f in files:
        file_path = f.get("path", f.get("name", "index.html")).lstrip("/")
        content = f.get("content", "")

        try:
            existing = repo.get_contents(file_path)
            result = repo.update_file(
                file_path, message, content, existing.sha
            )
            commit_url = result["commit"].html_url
        except GithubException:
            result = repo.create_file(file_path, message, content)
            commit_url = result["commit"].html_url

    return {
        "repo_url": repo.html_url,
        "commit_url": commit_url or repo.html_url,
        "message": f"Pushed {len(files)} files to {repo.full_name}",
        "status": "pushed",
        "url": f"{repo.html_url}/blob/main/{files[0].get('path', 'index.html').lstrip('/')}",
    }
