"""
Kiro Builder — AI Router
All generation goes through Claude Sonnet 4.
Parses AI responses into structured JSON with files[].
"""

import os
import re
import json
from typing import Optional, List

import httpx

from prompts import (
    SYSTEM_PROMPT_MAIN,
    SYSTEM_PROMPT_ANALYZE,
    SYSTEM_PROMPT_EDIT,
    VISION_PROMPTS,
    PLAN_PROMPT,
    build_system_prompt,
    build_edit_prompt,
)
from design_system import generate_design_system, format_for_prompt

# ── Config ────────────────────────────────────────────────────────────
CLAUDE_MODEL  = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")


# ── JSON extraction ───────────────────────────────────────────────────
_JSON_FENCE = re.compile(r"```(?:json)?\s*\n([\s\S]*?)```", re.IGNORECASE)
_HTML_FENCE = re.compile(r"```(?:html)?\s*\n([\s\S]*?)```", re.IGNORECASE)


def _extract_json(raw: str) -> tuple[dict, str]:
    """Parse JSON from model response, stripping code fences if present. Also returns any prose text."""
    text = raw.strip()
    prose_text = ""

    m = _JSON_FENCE.search(text)
    if m:
        prose_before = text[:m.start()].strip()
        prose_after  = text[m.end():].strip() if m.end() < len(text) else ""
        prose_text   = f"{prose_before}\n\n{prose_after}".strip()
        text = m.group(1).strip()
    else:
        start_idx = text.find("{")
        if start_idx != -1:
            search_from = len(text)
            while search_from > start_idx:
                end_idx = text.rfind("}", start_idx, search_from)
                if end_idx == -1:
                    break
                candidate = text[start_idx:end_idx+1]
                try:
                    parsed = json.loads(candidate)
                    prose_text = text[:start_idx].strip()
                    return parsed, prose_text
                except json.JSONDecodeError:
                    search_from = end_idx
            prose_text = text[:start_idx].strip()

    try:
        parsed = json.loads(text)
        return parsed, prose_text
    except json.JSONDecodeError:
        # Fallback: extract raw HTML
        html_match = _HTML_FENCE.search(raw)
        if html_match:
            prose_text = raw[:html_match.start()].strip()
            html = html_match.group(1).strip()
            _he = html.lower().rfind("</html>")
            if _he != -1:
                html = html[:_he + len("</html>")].strip()
        elif "<!DOCTYPE" in raw or "<html" in raw:
            start = raw.find("<!DOCTYPE")
            if start == -1:
                start = raw.find("<html")
            prose_text = raw[:start].strip()
            html = raw[start:].strip()
            html_end = html.lower().rfind("</html>")
            if html_end != -1:
                html = html[:html_end + len("</html>")].strip()
        else:
            prose_text = ""
            html = ""

        return {
            "files": [{"name": "index.html", "path": "index.html", "content": html, "language": "html"}] if html else [],
            "explanation": prose_text,
            "suggestions": [],
        }, prose_text


def _unescape_content(text: str) -> str:
    """Helper to unescape double-escaped newlines and quotes inside JSON strings."""
    if not isinstance(text, str):
        return text
    text = text.replace('\\n', '\n')
    text = text.replace('\\t', '\t')
    text = text.replace('\\"', '"')
    return text


def _build_result(parsed: dict, prose_text: str, model_name: str, tokens: int, cost: float = 0) -> dict:
    """Build the standard response dict."""
    files = parsed.get("files", [])

    for f in files:
        if "content" in f:
            f["content"] = _unescape_content(f["content"])
        # Unescape patch strings too
        if "patches" in f:
            for p in f["patches"]:
                if "search" in p:
                    p["search"] = _unescape_content(p["search"])
                if "replace" in p:
                    p["replace"] = _unescape_content(p["replace"])

    html_file = next(
        (f for f in files if f.get("language") == "html" or f.get("name", "").endswith(".html")),
        files[0] if files else None,
    )
    code  = html_file.get("content", "") if html_file else parsed.get("code", "")
    code  = _unescape_content(code)
    if code and "</html>" in code.lower():
        _cut = code.lower().rfind("</html>")
        code = code[:_cut + len("</html>")].strip()
    for f in files:
        c = f.get("content", "")
        if c and f.get("name", "").endswith(".html") and "</html>" in c.lower():
            _cut = c.lower().rfind("</html>")
            f["content"] = c[:_cut + len("</html>")].strip()
    explanation = prose_text if prose_text else parsed.get("explanation", "")
    if explanation and explanation.strip().startswith(('{', '[', '```')):
        explanation = ""

    return {
        "code":          code,
        "files":         files,
        "explanation":   explanation,
        "suggestions":   parsed.get("suggestions", []),
        "model":         model_name,
        "tokens":        tokens,
        "cost_estimate": round(cost, 6),
    }


# ── Claude call ───────────────────────────────────────────────────────
async def call_claude(
    prompt:           str,
    techs:            list[str],
    image_b64:        Optional[str] = None,
    image_media_type: str           = "image/png",
    analysis_mode:    str           = "clone",
    stack:            dict          = None,
    edit_mode:        bool          = False,
) -> dict:
    """Call Claude API for code generation."""
    if not ANTHROPIC_KEY:
        raise ValueError("ANTHROPIC_API_KEY not set — configure it in backend/.env")

    system = SYSTEM_PROMPT_EDIT if edit_mode else build_system_prompt(stack or {})

    headers = {
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
    }

    tech_note = f"\n\nTech stack to use: {', '.join(techs)}" if techs else ""
    user_text = f"{prompt}{tech_note}"

    if image_b64:
        vision_prompt = VISION_PROMPTS.get(analysis_mode, VISION_PROMPTS["clone"])
        content = [
            {"type": "image", "source": {"type": "base64", "media_type": image_media_type, "data": image_b64}},
            {"type": "text",  "text": f"{vision_prompt}\n\n{user_text}"},
        ]
    else:
        content = [{"type": "text", "text": user_text}]

    payload = {
        "model":      CLAUDE_MODEL,
        "max_tokens": 32000,
        "system":     system,
        "messages":   [{"role": "user", "content": content}],
    }

    # Retry up to 2 times on timeout or 5xx errors
    last_err = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=300) as client:
                r = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=payload,
                )
                r.raise_for_status()
                data = r.json()
                break
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.HTTPStatusError) as e:
            last_err = e
            if attempt < 2:
                wait = (attempt + 1) * 5
                print(f"[KIRO] Claude call attempt {attempt+1} failed ({type(e).__name__}), retrying in {wait}s...")
                import asyncio
                await asyncio.sleep(wait)
            else:
                raise last_err

    raw    = data["content"][0]["text"].strip()
    usage  = data.get("usage", {})
    input_t  = usage.get("input_tokens", 0)
    output_t = usage.get("output_tokens", 0)
    tokens = input_t + output_t
    cost   = (input_t * 0.003 + output_t * 0.015) / 1000

    parsed, prose = _extract_json(raw)
    return _build_result(parsed, prose, CLAUDE_MODEL, tokens, cost)


# ── Image analysis ────────────────────────────────────────────────────
_DEMO_ANALYSIS = {
    "type": "landing_page",
    "confidence": 85,
    "style": ["modern", "dark", "glassmorphism"],
    "colors": [
        {"hex": "#6366f1", "role": "Primaire"},
        {"hex": "#8b5cf6", "role": "Secondaire"},
        {"hex": "#0f0f23", "role": "Background"},
        {"hex": "#ffffff", "role": "Texte"},
        {"hex": "#06b6d4", "role": "Accent"},
    ],
    "description": "Modern landing page with gradient hero, feature cards, and dark theme.",
    "sections": [
        {"name": "Navbar", "height_pct": 8, "components": ["Logo", "Nav links", "CTA button"]},
        {"name": "Hero",   "height_pct": 40, "components": ["H1", "Subtitle", "Button"]},
    ],
    "detected_elements": {
        "navigation": True, "hero": True, "cta": True, "footer": True,
        "cards": True, "form": False, "media": True, "table": False,
    },
    "suggested_stack": ["React", "Tailwind"],
    "suggested_action": "clone_exact",
    "suggested_hosting": "Vercel",
    "estimated_tokens": 2100,
    "estimated_cost": 0.006,
}


async def analyze_image(image_b64: str, media_type: str = "image/png") -> dict:
    """Analyze an image with Claude Vision. Returns structured metadata."""
    if not ANTHROPIC_KEY:
        print("[KIRO] No API key — returning demo analysis")
        return _DEMO_ANALYSIS

    headers = {
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
    }
    payload = {
        "model":      CLAUDE_MODEL,
        "max_tokens": 1024,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_b64}},
                {"type": "text",  "text": SYSTEM_PROMPT_ANALYZE},
            ],
        }],
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()

        raw = data["content"][0]["text"].strip()
        m = _JSON_FENCE.search(raw)
        if m:
            raw = m.group(1).strip()
        return json.loads(raw)
    except Exception as e:
        print(f"[KIRO] Image analysis failed: {e}")
        return _DEMO_ANALYSIS


# ── Prompt enrichment ─────────────────────────────────────────────────
_SITE_TYPES = {
    "landing":   ["landing", "landing page", "homepage", "home page", "marketing", "saas", "startup"],
    "dashboard": ["dashboard", "admin", "analytics", "metrics", "stats", "panel", "management", "crm", "erp"],
    "portfolio": ["portfolio", "personal site", "resume", "cv", "showcase", "personal website"],
    "ecommerce": ["shop", "store", "ecommerce", "e-commerce", "product", "cart", "checkout", "marketplace"],
    "blog":      ["blog", "article", "post", "news", "magazine", "publication"],
    "app":       ["app", "tool", "calculator", "converter", "generator", "editor", "player", "game"],
    "docs":      ["docs", "documentation", "reference", "api reference", "guide", "tutorial"],
}

_QUALITY_REFS = {
    "landing":   "Vercel.com, Linear.app, or Stripe.com",
    "dashboard": "Linear.app, Vercel Analytics, or Retool",
    "portfolio": "read.cv or Framer sites",
    "ecommerce": "Shopify or Lemon Squeezy",
    "blog":      "Ghost.org or Substack",
    "app":       "Raycast or Linear",
    "docs":      "Vercel Docs or Radix UI Docs",
}

_DESIGN_CONTEXT = {
    "landing": (
        "Structure: sticky navbar -> hero (100vh) -> social proof -> features grid -> "
        "pricing section -> testimonials -> FAQ -> CTA banner -> footer. "
        "Use gradient orbs in the hero background. Primary CTA uses accent color with glow."
    ),
    "dashboard": (
        "Structure: sidebar nav (260px) -> topbar with search/avatar -> main content area. "
        "Use stat cards at the top, then charts, then a data table. "
        "Sidebar active item: accent background with slight glow."
    ),
    "portfolio": (
        "Structure: minimal navbar -> hero with name/role/tagline -> selected work grid -> "
        "about section -> skills/stack -> contact form -> footer. "
        "Typography-driven design, generous whitespace, muted palette."
    ),
    "ecommerce": (
        "Structure: navbar with cart icon -> hero banner -> product grid -> "
        "featured product -> trust badges -> newsletter -> footer. "
        "Product cards: image, name, price, add-to-cart button."
    ),
    "blog": (
        "Structure: header with logo + nav -> hero post (large featured image) -> "
        "article grid (3 cols) -> newsletter signup -> footer. "
        "Clean reading typography, generous line height."
    ),
    "app": (
        "Structure: minimal topbar -> centered main tool area -> result/output panel. "
        "Focus on the core interaction. Use dark theme with clear input/output separation."
    ),
    "docs": (
        "Structure: fixed sidebar with nav tree -> content area (max 65ch) -> right TOC. "
        "Code blocks use dark theme with syntax highlighting. "
        "Breadcrumbs at top, prev/next navigation at bottom."
    ),
}


def _detect_site_type(prompt: str) -> str:
    """Detect the site type from the prompt text."""
    text = prompt.lower()
    for site_type, keywords in _SITE_TYPES.items():
        if any(kw in text for kw in keywords):
            return site_type
    return "landing"


def enrich_prompt(prompt: str, stack: dict = None) -> tuple[str, dict]:
    """Enrich a user prompt with AI-selected design system. Returns (enriched_prompt, design_system)."""
    stack = stack or {}
    site_type = _detect_site_type(prompt)
    quality   = _QUALITY_REFS.get(site_type, "Vercel.com or Linear.app")

    # Generate design system from UI knowledge base
    ds = generate_design_system(prompt, stack)
    ds_block = format_for_prompt(ds)

    enriched = (
        f"{prompt}\n\n"
        f"{ds_block}\n\n"
        f"Quality reference: match the visual quality of {quality}.\n"
        f"Real content: invent a realistic product name, tagline, features, and copy — no Lorem Ipsum.\n"
        f"Fully responsive: must look great at 375px (mobile), 768px (tablet), and 1280px (desktop).\n"
    )
    return enriched, ds


# ── Post-processing ────────────────────────────────────────────────────
_LINK_CSS_RE = re.compile(
    r'<link\s[^>]*rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+\.css)["\'][^>]*>',
    re.IGNORECASE,
)


def post_process_files(files: List[dict]) -> List[dict]:
    """Post-process AI-generated files to fix common CSS/HTML bugs."""
    for f in files:
        if isinstance(f.get("path"), str):
            f["path"] = f["path"].lstrip("/")

    css_lookup: dict[str, str] = {}
    for f in files:
        lang = f.get("language", "")
        name = f.get("name", "")
        if lang == "css" or name.endswith(".css"):
            css_lookup[name.lstrip("/")] = f.get("content", "")
            basename = name.split("/")[-1]
            css_lookup[basename] = f.get("content", "")

    for f in files:
        if f.get("language") != "html":
            continue

        content = f.get("content", "")
        if not content:
            continue

        modified = False

        for link_match in list(_LINK_CSS_RE.finditer(content)):
            href = link_match.group(1).lstrip("./")
            basename = href.split("/")[-1]
            css_content = css_lookup.get(href) or css_lookup.get(basename)
            if css_content:
                inline_tag = f"<style>\n{css_content}\n</style>"
                content = content.replace(link_match.group(0), inline_tag, 1)
                print(f"[KIRO POST] Inlined external CSS: {href} ({len(css_content)} chars)")
                modified = True

        if '<meta name="viewport"' not in content and "<meta name='viewport'" not in content:
            viewport_tag = '<meta name="viewport" content="width=device-width, initial-scale=1">'
            if "<head>" in content:
                content = content.replace("<head>", f"<head>\n  {viewport_tag}", 1)
            elif "<HEAD>" in content:
                content = content.replace("<HEAD>", f"<HEAD>\n  {viewport_tag}", 1)
            modified = True

        if "fonts.googleapis.com" not in content and "fonts.bunny.net" not in content:
            fonts_link = (
                '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
                '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
                '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">'
            )
            if "</head>" in content:
                content = content.replace("</head>", f"  {fonts_link}\n</head>", 1)
            elif "</HEAD>" in content:
                content = content.replace("</HEAD>", f"  {fonts_link}\n</HEAD>", 1)
            modified = True

        if "font-family" not in content:
            body_font = "body { font-family: 'Inter', system-ui, sans-serif; }"
            if "<style>" in content:
                content = content.replace("<style>", f"<style>\n{body_font}\n", 1)
            modified = True

        # ── Smart image fallback: keep images but add onerror fallback ──
        # For background-image: url('https://...') → add CSS gradient fallback behind
        ext_bg_re = re.compile(
            r"(background(?:-image)?\s*:\s*url\(['\"]?https?://[^)\"']+['\"]?\))",
            re.IGNORECASE,
        )
        for m in list(ext_bg_re.finditer(content)):
            old = m.group(0)
            # Add gradient fallback: if image fails, gradient shows
            fallback = old + ", linear-gradient(135deg, var(--primary, #1a1a2e) 0%, var(--secondary, #16213e) 40%, var(--muted, #0f3460) 100%)"
            content = content.replace(old, fallback, 1)
            print(f"[KIRO POST] Added bg-image fallback gradient")
            modified = True

        # For <img src="https://..."> → add onerror fallback
        ext_img_re = re.compile(
            r'<img\s([^>]*src=["\']https?://[^"\']+["\'][^>]*)(/?>)',
            re.IGNORECASE,
        )
        for m in list(ext_img_re.finditer(content)):
            full = m.group(0)
            attrs = m.group(1)
            close = m.group(2)
            if 'onerror' in attrs:
                continue
            alt_match = re.search(r'alt=["\']([^"\']*)["\']', attrs, re.IGNORECASE)
            alt = alt_match.group(1) if alt_match else ""
            initials = "".join(w[0].upper() for w in alt.split()[:2]) if alt else "📷"
            onerror = (
                f"onerror=\"this.style.display='none';"
                f"var d=document.createElement('div');"
                f"d.style.cssText='aspect-ratio:4/3;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);"
                f"display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);"
                f"font-size:1.5rem;border-radius:8px;width:100%;height:100%';"
                f"d.textContent='{initials}';"
                f"this.parentNode.insertBefore(d,this)\""
            )
            new_tag = f'<img {attrs} {onerror}{close}'
            content = content.replace(full, new_tag, 1)
            print(f"[KIRO POST] Added img onerror fallback: {alt or 'no alt'}")
            modified = True

        # ── Fix invisible sections: fade-up animations with opacity:0 ──
        # IntersectionObserver may not fire in iframe preview, so inject a
        # small fallback script that makes all .fade-up visible after load.
        if 'fade-up' in content or 'fade-in' in content or 'reveal' in content:
            fallback_js = (
                "\n<script>"
                "document.addEventListener('DOMContentLoaded',function(){"
                "setTimeout(function(){"
                "document.querySelectorAll('.fade-up,.fade-in,.reveal,.slide-up,.animate-on-scroll')"
                ".forEach(function(el){el.classList.add('visible','in-view','revealed','active');"
                "el.style.opacity='1';el.style.transform='none'})},300);"
                # Also set up IntersectionObserver as normal for scroll effect
                "if(window.IntersectionObserver){"
                "var o=new IntersectionObserver(function(entries){"
                "entries.forEach(function(e){if(e.isIntersecting){"
                "e.target.classList.add('visible','in-view');e.target.style.opacity='1';e.target.style.transform='none'}})}"
                ",{threshold:0.1});"
                "document.querySelectorAll('.fade-up,.fade-in,.reveal,.slide-up,.animate-on-scroll')"
                ".forEach(function(el){o.observe(el)})}"
                "});</" + "script>\n"
            )
            if "</body>" in content:
                content = content.replace("</body>", fallback_js + "</body>", 1)
                print("[KIRO POST] Injected fade-up animation fallback script")
                modified = True

        # ── Fix truncated HTML: close all open tags if </html> is missing ──
        if '</html>' not in content and '</HTML>' not in content:
            print("[KIRO POST] HTML truncated — auto-closing tags")
            # Close any open divs/sections, then close body/html
            open_divs = content.count('<div') - content.count('</div')
            open_sections = content.count('<section') - content.count('</section')
            closing = ''
            for _ in range(max(0, open_divs)):
                closing += '</div>'
            for _ in range(max(0, open_sections)):
                closing += '</section>'
            if '</body>' not in content:
                closing += '\n</body>'
            closing += '\n</html>'
            content += closing
            modified = True

        light_bg_markers = ["#fafafa", "#ffffff", "#f4f4f5", "background: white", "background:#fff"]
        dark_text_markers = ["color: #18", "color: #1c", "color: #11", "--text:", "var(--text)"]
        has_light_bg = any(m in content for m in light_bg_markers)
        has_dark_text = any(m in content for m in dark_text_markers)
        if has_light_bg and not has_dark_text:
            if "body {" in content:
                content = content.replace("body {", "body {\n  color: #18181b;", 1)
                modified = True

        if modified:
            f["content"] = content

    return files


# ── Smart edit: patch or diff-merge ───────────────────────────────────
import difflib


def _apply_patches(ai_files: list[dict], context_files: list[dict]) -> list[dict]:
    """
    Smart edit handler. Supports three modes:
    1. PATCH mode: AI returned 'patches' [{search, replace}] → apply them
    2. DIFF-MERGE mode: AI returned 'content' but it's shorter than original
       → extract the real changes via difflib and apply them to original
    3. PASSTHROUGH: AI returned 'content' of similar length → use as-is
    """
    originals = {}
    for cf in context_files:
        name = cf.get("name", "")
        originals[name] = cf
    print(f"[KIRO PATCH] originals keys: {list(originals.keys())}")

    result_files = []

    for f in ai_files:
        name = f.get("name", "")
        patches = f.get("patches", [])
        ai_content = f.get("content", "")
        print(f"[KIRO PATCH] Processing {name}: patches={len(patches)}, content={len(ai_content)} chars")

        original = originals.get(name, {})
        orig_content = original.get("content", "")

        if patches and orig_content:
            # MODE 1: Explicit patches
            patched = _apply_search_replace(orig_content, patches, name)
            result_files.append({
                "name": name,
                "path": f.get("path", original.get("path", "")),
                "content": patched,
                "language": f.get("language", original.get("language", "")),
            })

        elif ai_content and orig_content:
            orig_lines = len(orig_content.split('\n'))
            ai_lines = len(ai_content.split('\n'))
            ratio = ai_lines / orig_lines if orig_lines > 0 else 1

            print(f"[KIRO PATCH] {name}: ratio={ratio:.2f} ({ai_lines}/{orig_lines} lines)")
            if ratio < 0.95 and orig_lines > 50:
                # MODE 2: AI returned shorter file — diff-merge to preserve content
                print(f"[KIRO PATCH] {name}: TRIGGERING diff-merge (ratio={ratio:.2f} < 0.95)")
                merged = _diff_merge(orig_content, ai_content, name)
                result_files.append({
                    "name": name,
                    "path": f.get("path", original.get("path", "")),
                    "content": merged,
                    "language": f.get("language", original.get("language", "")),
                })
            else:
                # MODE 3: Passthrough (small file or full rewrite)
                result_files.append(f)
        elif ai_content:
            # No original — new file or first gen
            result_files.append(f)
        else:
            print(f"[KIRO PATCH] {name}: no patches and no content — skipping")

    # Carry over unchanged files
    ai_names = {f.get("name", "") for f in result_files}
    for cf in context_files:
        if cf.get("name", "") not in ai_names:
            result_files.append(cf)

    return result_files


def _apply_search_replace(content: str, patches: list, filename: str) -> str:
    """Apply search/replace patches to content."""
    applied = 0
    failed = 0
    for i, patch in enumerate(patches):
        search = patch.get("search", "")
        replace = patch.get("replace", "")
        if not search:
            continue
        if search in content:
            content = content.replace(search, replace, 1)
            applied += 1
        else:
            # Fuzzy: strip trailing whitespace per line
            search_norm = '\n'.join(l.rstrip() for l in search.split('\n'))
            content_norm = '\n'.join(l.rstrip() for l in content.split('\n'))
            if search_norm in content_norm:
                idx = content_norm.index(search_norm)
                lines_before = content_norm[:idx].count('\n')
                search_lc = search_norm.count('\n') + 1
                orig_lines = content.split('\n')
                before = '\n'.join(orig_lines[:lines_before])
                after = '\n'.join(orig_lines[lines_before + search_lc:])
                content = before + ('\n' if before else '') + replace + ('\n' if after else '') + after
                applied += 1
            else:
                print(f"[KIRO PATCH] Patch {i} FAILED for {filename}: {search[:80]}...")
                failed += 1
    print(f"[KIRO PATCH] {filename}: {applied} applied, {failed} failed")
    return content


def _diff_merge(original: str, ai_shortened: str, filename: str) -> str:
    """
    When AI returns a shortened version of a file (dropped sections),
    use difflib to find what actually changed and apply only those changes
    to the original file. ALL deletions are treated as truncation (preserved).
    """
    orig_lines = original.split('\n')
    ai_lines = ai_shortened.split('\n')

    # Use SequenceMatcher to find matching blocks
    sm = difflib.SequenceMatcher(None, orig_lines, ai_lines, autojunk=False)
    opcodes = sm.get_opcodes()

    result = []
    changes_applied = 0

    for tag, i1, i2, j1, j2 in opcodes:
        if tag == 'equal':
            # Keep original lines (preserves formatting)
            result.extend(orig_lines[i1:i2])
        elif tag == 'replace':
            # AI changed these lines — use AI version
            # But only if the replacement is similar size (real edit, not truncation)
            orig_block = i2 - i1
            ai_block = j2 - j1
            if ai_block >= orig_block * 0.5 or orig_block <= 5:
                # Real change — use AI version
                result.extend(ai_lines[j1:j2])
                changes_applied += 1
            else:
                # AI drastically shortened this block — likely truncation
                # Try to find what actually changed within the block
                result.extend(orig_lines[i1:i2])
                print(f"[KIRO MERGE] {filename}: preserved {orig_block} lines (replace block looked like truncation)")
        elif tag == 'insert':
            # AI added new lines — include them
            result.extend(ai_lines[j1:j2])
            changes_applied += 1
        elif tag == 'delete':
            # In edit mode, ALL deletions are treated as truncation — preserve original
            deleted_count = i2 - i1
            result.extend(orig_lines[i1:i2])
            if deleted_count > 3:
                print(f"[KIRO MERGE] {filename}: preserved {deleted_count} 'deleted' lines (truncation)")

    merged = '\n'.join(result)
    orig_lc = len(orig_lines)
    merged_lc = len(result)
    print(f"[KIRO MERGE] {filename}: {orig_lc} orig → {merged_lc} merged ({changes_applied} changes, AI had {len(ai_lines)} lines)")
    return merged


# ── AIRouter class ─────────────────────────────────────────────────────
class AIRouter:
    """Main router class — all requests go to Claude Sonnet."""

    async def route(
        self,
        prompt:           str,
        techs:            list[str],
        mode:             str  = "auto",
        image_b64:        Optional[str] = None,
        stack:            dict = None,
        image_media_type: str  = "image/png",
        analysis_mode:    str  = "clone",
        provider:         str  = "auto",
        context_files:    list = None,
    ) -> dict:
        stack = stack or {}
        ds = None  # design system (only for fresh generation)

        # Build prompt: edit mode if context files exist, otherwise fresh generation
        if context_files and not image_b64:
            enriched = build_edit_prompt(prompt, context_files)
            print(f"[KIRO ROUTER] Edit mode — {len(context_files)} context file(s)")
        elif not image_b64:
            enriched, ds = enrich_prompt(prompt, stack)
        else:
            enriched = prompt

        site_type = _detect_site_type(prompt)
        print(f"[KIRO ROUTER] Site type: {site_type} | Model: {CLAUDE_MODEL}")

        # Call Claude
        if image_b64:
            print(f"[KIRO ROUTER] Vision mode -> {CLAUDE_MODEL}")
            result = await call_claude(prompt, techs, image_b64, image_media_type, analysis_mode, stack)
        elif context_files and not image_b64:
            print(f"[KIRO ROUTER] Edit mode -> {CLAUDE_MODEL}")
            result = await call_claude(enriched, techs, None, "image/png", "clone", stack, edit_mode=True)
        else:
            print(f"[KIRO ROUTER] Generate -> {CLAUDE_MODEL}")
            result = await call_claude(enriched, techs, None, "image/png", "clone", stack)

        # Apply patches (edit mode) — handles both patch and legacy formats
        if context_files and result.get("files"):
            result["files"] = _apply_patches(result["files"], context_files)

        # Post-process files
        if result.get("files"):
            result["files"] = post_process_files(result["files"])
            if result["files"]:
                html_f = next(
                    (f for f in result["files"] if f.get("language") == "html" or f.get("name", "").endswith(".html")),
                    result["files"][0],
                )
                result["code"] = html_f.get("content", result.get("code", ""))

        result["model_used"]       = CLAUDE_MODEL
        result["model_reason"]     = "claude_only"
        result["routing_decision"] = "claude"

        # Attach design system metadata (for frontend display)
        if ds:
            from design_system import get_summary
            result["design_system"] = get_summary(ds)

        return result

    @staticmethod
    async def plan_brief(prompt: str) -> dict:
        """Generate a project brief using Claude."""
        if not ANTHROPIC_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY not set")

        headers = {
            "x-api-key":         ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "content-type":      "application/json",
        }
        payload = {
            "model":      CLAUDE_MODEL,
            "max_tokens": 1024,
            "system":     PLAN_PROMPT,
            "messages":   [{"role": "user", "content": prompt}],
        }
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers, json=payload,
            )
            r.raise_for_status()
            data = r.json()
        raw = data["content"][0]["text"].strip()
        m = _JSON_FENCE.search(raw)
        if m:
            raw = m.group(1).strip()
        return json.loads(raw)

    @staticmethod
    async def analyze(image_b64: str, media_type: str = "image/png") -> dict:
        return await analyze_image(image_b64, media_type)

    @staticmethod
    async def list_models() -> dict:
        models = []
        if ANTHROPIC_KEY:
            models.append({
                "id":       CLAUDE_MODEL,
                "provider": "anthropic",
                "label":    f"Claude — {CLAUDE_MODEL}",
                "online":   True,
            })
        return {"models": models, "default": CLAUDE_MODEL}
