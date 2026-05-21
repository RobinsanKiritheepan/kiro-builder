"""
Kiro Builder — Authentication Module
Google OAuth + JWT tokens + user folder management
"""

import os
import re
import json
import secrets
from pathlib import Path
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ── JWT (using PyJWT) ────────────────────────────────────────────────
import jwt as pyjwt

JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "168"))  # 7 days default

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

USERS_DIR = Path(__file__).parent / "users"
PROJECTS_DIR = Path(__file__).parent / "projects"

security = HTTPBearer(auto_error=False)


# ── User helpers ─────────────────────────────────────────────────────

def _sanitize_email(email: str) -> str:
    """Convert email to a safe folder name."""
    return re.sub(r'[^a-zA-Z0-9._@-]', '_', email.lower().strip())


def _user_dir(email: str) -> Path:
    """Return the user's project directory, creating it if needed."""
    safe = _sanitize_email(email)
    user_projects = PROJECTS_DIR / safe
    user_projects.mkdir(parents=True, exist_ok=True)
    return user_projects


def _user_profile_path(email: str) -> Path:
    """Path to user profile JSON."""
    USERS_DIR.mkdir(parents=True, exist_ok=True)
    return USERS_DIR / f"{_sanitize_email(email)}.json"


def _save_user(email: str, name: str, picture: str = "") -> dict:
    """Create or update user profile."""
    profile_path = _user_profile_path(email)
    now = datetime.now(timezone.utc).isoformat()

    if profile_path.exists():
        profile = json.loads(profile_path.read_text(encoding='utf-8'))
        profile["name"] = name
        profile["picture"] = picture
        profile["last_login"] = now
    else:
        profile = {
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": now,
            "last_login": now,
        }

    # Ensure user has a projects folder
    _user_dir(email)

    profile_path.write_text(json.dumps(profile, indent=2, ensure_ascii=False), encoding='utf-8')
    return profile


def _get_user(email: str) -> dict | None:
    """Read user profile."""
    path = _user_profile_path(email)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None


# ── JWT ──────────────────────────────────────────────────────────────

def create_token(email: str, name: str, picture: str = "") -> str:
    """Create a JWT token for the user."""
    payload = {
        "sub": email,
        "name": name,
        "picture": picture,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(401, detail="Invalid token")


# ── FastAPI dependency ───────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict | None:
    """Extract user from JWT. Returns None if no token (for backward compat)."""
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    return {
        "email": payload["sub"],
        "name": payload.get("name", ""),
        "picture": payload.get("picture", ""),
    }


async def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Same as get_current_user but raises 401 if not authenticated."""
    if not credentials:
        raise HTTPException(401, detail="Authentication required")
    payload = decode_token(credentials.credentials)
    return {
        "email": payload["sub"],
        "name": payload.get("name", ""),
        "picture": payload.get("picture", ""),
    }


# ── Google OAuth ─────────────────────────────────────────────────────

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


async def google_auth(code: str, redirect_uri: str) -> dict:
    """Exchange Google auth code for user info + JWT.

    1. Exchange code → access_token via Google
    2. Fetch user info from Google
    3. Save/update user profile
    4. Return JWT + user info
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(500, detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env")

    async with httpx.AsyncClient(timeout=15) as client:
        # Exchange code for token
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            error_detail = token_resp.text[:200]
            raise HTTPException(400, detail=f"Google token exchange failed: {error_detail}")

        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(400, detail="No access_token from Google")

        # Fetch user info
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(400, detail="Failed to fetch Google user info")

        userinfo = userinfo_resp.json()

    email = userinfo.get("email", "")
    name = userinfo.get("name", email.split("@")[0])
    picture = userinfo.get("picture", "")

    if not email:
        raise HTTPException(400, detail="No email in Google response")

    # Save user
    profile = _save_user(email, name, picture)

    # Create JWT
    token = create_token(email, name, picture)

    return {
        "token": token,
        "user": {
            "email": email,
            "name": name,
            "picture": picture,
        },
    }


def get_user_projects_dir(email: str) -> Path:
    """Get the projects directory for a user."""
    return _user_dir(email)
