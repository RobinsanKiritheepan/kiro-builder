"""
Design System Generator for Kiro Builder
Analyzes user prompts and generates expert-level design systems
using the UI/UX Pro Max knowledge base (84 styles, 119 palettes, 73 fonts, 34 landing patterns).
"""

import csv
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "ui_data"

# ============ DATA LOADING ============

def _load_csv(filename: str) -> list[dict]:
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        return list(csv.DictReader(f))

_colors_cache = None
_typography_cache = None
_products_cache = None
_styles_cache = None
_landing_cache = None
_reasoning_cache = None

def _colors():
    global _colors_cache
    if _colors_cache is None:
        _colors_cache = _load_csv("colors.csv")
    return _colors_cache

def _typography():
    global _typography_cache
    if _typography_cache is None:
        _typography_cache = _load_csv("typography.csv")
    return _typography_cache

def _products():
    global _products_cache
    if _products_cache is None:
        _products_cache = _load_csv("products.csv")
    return _products_cache

def _styles():
    global _styles_cache
    if _styles_cache is None:
        _styles_cache = _load_csv("styles.csv")
    return _styles_cache

def _landing():
    global _landing_cache
    if _landing_cache is None:
        _landing_cache = _load_csv("landing.csv")
    return _landing_cache

def _reasoning():
    global _reasoning_cache
    if _reasoning_cache is None:
        _reasoning_cache = _load_csv("ui-reasoning.csv")
    return _reasoning_cache


# ============ PROJECT TYPE DETECTION ============

DETECTION_KEYWORDS = {
    "SaaS (General)": ["saas", "startup", "platform", "software", "b2b"],
    "Micro SaaS": ["micro saas", "indie", "solo", "niche"],
    "E-commerce": ["shop", "store", "boutique", "produit", "vente", "ecommerce", "e-commerce", "magasin", "acheter"],
    "E-commerce Luxury": ["luxe", "luxury", "premium brand", "high-end", "exclusive", "haut de gamme"],
    "B2B Service": ["b2b service", "enterprise", "corporate", "consultation"],
    "Financial Dashboard": ["financial dashboard", "trading dashboard"],
    "Analytics Dashboard": ["analytics", "dashboard", "admin panel", "gestion", "crm"],
    "Healthcare App": ["health", "santé", "medical", "clinic", "patient", "hopital"],
    "Educational App": ["education", "learning", "cours", "school", "formation", "bootcamp", "université"],
    "Creative Agency": ["agence", "agency", "creative agency", "design agency", "studio créatif", "marketing agency", "agence de design", "agence web", "agence digitale", "agence créative"],
    "Portfolio/Personal": ["portfolio", "créatif", "artiste", "designer portfolio", "photographe portfolio", "personal", "cv", "resume"],
    "Gaming": ["game", "gaming", "esport", "jeu vidéo"],
    "Fintech/Crypto": ["fintech", "crypto", "blockchain", "bitcoin", "nft", "web3", "defi"],
    "Social Media App": ["social media", "réseau social", "community app"],
    "Productivity Tool": ["productivity", "todo", "task manager", "workflow", "project management"],
    "AI/Chatbot Platform": ["chatbot", "intelligence artificielle", "machine learning"],
    "Restaurant/Food Service": ["restaurant", "food", "cuisine", "menu", "café", "brasserie", "pizzeria", "traiteur"],
    "Fitness/Gym App": ["fitness", "gym", "sport", "workout", "musculation", "yoga"],
    "Real Estate/Property": ["immobilier", "real estate", "property", "appartement", "maison", "logement"],
    "Travel/Tourism Agency": ["travel", "voyage", "tourisme", "vacances", "tourism"],
    "Hotel/Hospitality": ["hotel", "hospitality", "hébergement"],
    "Magazine/Blog": ["blog", "article", "magazine", "journal", "news", "actualité"],
    "Photography Studio": ["photo", "photographe", "photography", "studio photo"],
    "Music Streaming": ["music", "musique", "streaming audio", "playlist"],
    "Podcast Platform": ["podcast", "audio", "émission"],
    "Dating App": ["dating", "rencontre", "match"],
    "Wedding/Event Planning": ["wedding", "mariage", "event", "événement"],
    "Legal Services": ["avocat", "legal", "juridique", "law", "droit", "notaire"],
    "Construction/Architecture": ["construction", "architecture", "bâtiment", "btp", "architecte"],
    "Automotive/Car Dealership": ["auto", "voiture", "car", "automobile", "garage", "concessionnaire"],
    "Coworking Space": ["coworking", "espace de travail", "bureau partagé"],
    "Non-profit/Charity": ["association", "charity", "ong", "non-profit", "bénévole"],
    "Beauty/Spa/Wellness Service": ["beauty", "beauté", "spa", "wellness", "bien-être", "coiffure", "salon de beauté"],
    "Marketplace (P2P)": ["marketplace", "annonces", "petites annonces"],
    "Online Course/E-learning": ["cours en ligne", "e-learning", "mooc", "tutoriel", "formation en ligne"],
    "Job Board/Recruitment": ["emploi", "job board", "recrutement", "career", "offre emploi"],
    "Bakery/Cafe": ["boulangerie", "bakery", "pâtisserie"],
    "Florist/Plant Shop": ["fleuriste", "florist", "plante", "jardin", "jardinage", "pépinière"],
    "Veterinary Clinic": ["vétérinaire", "vet", "animal", "pet"],
    "Home Services (Plumber/Electrician)": ["plombier", "électricien", "home service", "dépannage", "artisan", "imprimerie", "print", "impression"],
    "Developer Tool / IDE": ["developer tool", "dev tool", "ide", "api platform"],
    "Luxury/Premium Brand": ["luxury brand", "marque premium", "haute couture"],
    "Brewery/Winery": ["brasserie", "vin", "winery", "brewery", "cave"],
    "Cybersecurity Platform": ["cybersecurity", "sécurité", "security"],
    "Mental Health App": ["mental health", "méditation", "mindfulness", "thérapie"],
    "Logistics/Delivery": ["livraison", "delivery", "logistics", "transport"],
}


def detect_project_type(prompt: str) -> str:
    prompt_lower = prompt.lower()
    scores = {}

    for ptype, keywords in DETECTION_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw in prompt_lower:
                score += len(kw) * 2  # longer match = more specific
        if score > 0:
            scores[ptype] = score

    if not scores:
        # Default fallback based on common words
        if any(w in prompt_lower for w in ["site", "page", "web"]):
            return "SaaS (General)"
        return "SaaS (General)"

    return max(scores, key=scores.get)


def wants_dark_mode(prompt: str) -> bool:
    dark_keywords = ["dark", "sombre", "nuit", "noir", "dark mode", "dark theme", "neon", "cyber", "futuriste"]
    prompt_lower = prompt.lower()
    return any(kw in prompt_lower for kw in dark_keywords)


# ============ MATCHING FUNCTIONS ============

def _match_score(text: str, query: str) -> int:
    text_lower = text.lower()
    score = 0
    for word in query.lower().split():
        if len(word) > 2 and word in text_lower:
            score += 1
    return score


def find_best_palette(project_type: str, dark_mode: bool) -> dict:
    colors = _colors()
    best = None
    best_score = -1

    for row in colors:
        product = row.get("Product Type", "")
        score = _match_score(product, project_type)
        # Exact match bonus
        if product.lower().strip() == project_type.lower().strip():
            score += 100
        if score > best_score:
            best_score = score
            best = row

    if not best:
        best = colors[0] if colors else {}

    palette = {
        "primary": best.get("Primary", "#6366F1"),
        "on_primary": best.get("On Primary", "#FFFFFF"),
        "secondary": best.get("Secondary", "#8B5CF6"),
        "accent": best.get("Accent", "#EA580C"),
        "background": best.get("Background", "#F8FAFC"),
        "foreground": best.get("Foreground", "#1E293B"),
        "card": best.get("Card", "#FFFFFF"),
        "card_foreground": best.get("Card Foreground", "#1E293B"),
        "muted": best.get("Muted", "#E9EFF8"),
        "muted_foreground": best.get("Muted Foreground", "#64748B"),
        "border": best.get("Border", "#E2E8F0"),
        "destructive": best.get("Destructive", "#DC2626"),
        "product_type": best.get("Product Type", "General"),
        "notes": best.get("Notes", ""),
    }

    if dark_mode:
        palette["background"] = best.get("Foreground", "#0F172A")
        palette["foreground"] = "#F8FAFC"
        palette["card"] = "#1E1E2E"
        palette["card_foreground"] = "#F8FAFC"
        palette["muted"] = "#1E293B"
        palette["muted_foreground"] = "#94A3B8"
        palette["border"] = "#334155"

    return palette


def find_best_fonts(project_type: str) -> dict:
    typo = _typography()
    best = None
    best_score = -1

    for row in typo:
        best_for = row.get("Best For", "")
        mood = row.get("Mood/Style Keywords", "")
        combined = f"{best_for} {mood}"
        score = _match_score(combined, project_type)
        if score > best_score:
            best_score = score
            best = row

    if not best or best_score == 0:
        # Smart default based on type
        type_lower = project_type.lower()
        if any(w in type_lower for w in ["luxury", "premium", "beauty", "spa", "wedding"]):
            idx = 0  # Classic Elegant
        elif any(w in type_lower for w in ["tech", "saas", "ai", "developer", "crypto"]):
            idx = 2  # Tech Startup
        elif any(w in type_lower for w in ["creative", "agency", "portfolio", "design"]):
            idx = 4 if len(typo) > 4 else 0  # Creative Bold
        else:
            idx = 1  # Modern Professional
        best = typo[idx] if len(typo) > idx else typo[0]

    return {
        "pairing_name": best.get("Font Pairing Name", "Modern Professional"),
        "heading": best.get("Heading Font", "Poppins"),
        "body": best.get("Body Font", "Open Sans"),
        "category": best.get("Category", "Sans + Sans"),
        "css_import": best.get("CSS Import", ""),
        "tailwind_config": best.get("Tailwind Config", ""),
        "mood": best.get("Mood/Style Keywords", ""),
    }


def find_best_style(project_type: str) -> dict:
    products = _products()
    best = None
    best_score = -1

    for row in products:
        ptype = row.get("Product Type", "")
        keywords = row.get("Keywords", "")
        combined = f"{ptype} {keywords}"
        score = _match_score(combined, project_type)
        if ptype.lower().strip() == project_type.lower().strip():
            score += 100
        if score > best_score:
            best_score = score
            best = row

    if not best:
        best = products[0] if products else {}

    # Find style details from styles.csv
    style_name = best.get("Primary Style Recommendation", "Glassmorphism + Flat Design")
    style_detail = None
    for s in _styles():
        cat = s.get("Style Category", "")
        if cat and cat.lower() in style_name.lower():
            style_detail = s
            break

    return {
        "product_type": best.get("Product Type", "General"),
        "primary_style": style_name,
        "secondary_styles": best.get("Secondary Styles", ""),
        "landing_pattern": best.get("Landing Page Pattern", "Hero + Features + CTA"),
        "color_focus": best.get("Color Palette Focus", ""),
        "key_considerations": best.get("Key Considerations", ""),
        "ai_prompt_keywords": style_detail.get("AI Prompt Keywords", "") if style_detail else "",
        "css_keywords": style_detail.get("CSS/Technical Keywords", "") if style_detail else "",
        "design_variables": style_detail.get("Design System Variables", "") if style_detail else "",
        "implementation_checklist": style_detail.get("Implementation Checklist", "") if style_detail else "",
    }


def find_landing_pattern(pattern_name: str) -> dict:
    landing = _landing()
    best = None
    best_score = -1

    for row in landing:
        name = row.get("Pattern Name", "")
        keywords = row.get("Keywords", "")
        combined = f"{name} {keywords}"
        score = _match_score(combined, pattern_name)
        if score > best_score:
            best_score = score
            best = row

    if not best:
        best = landing[0] if landing else {}

    return {
        "pattern_name": best.get("Pattern Name", "Hero + Features + CTA"),
        "section_order": best.get("Section Order", ""),
        "cta_placement": best.get("Primary CTA Placement", ""),
        "color_strategy": best.get("Color Strategy", ""),
        "recommended_effects": best.get("Recommended Effects", ""),
        "conversion_optimization": best.get("Conversion Optimization", ""),
    }


def find_reasoning(project_type: str) -> dict:
    reasoning = _reasoning()
    best = None
    best_score = -1

    for row in reasoning:
        cat = row.get("UI_Category", "")
        score = _match_score(cat, project_type)
        if cat.lower().strip() == project_type.lower().strip():
            score += 100
        if score > best_score:
            best_score = score
            best = row

    if not best:
        return {}

    return {
        "recommended_pattern": best.get("Recommended_Pattern", ""),
        "style_priority": best.get("Style_Priority", ""),
        "color_mood": best.get("Color_Mood", ""),
        "typography_mood": best.get("Typography_Mood", ""),
        "key_effects": best.get("Key_Effects", ""),
        "anti_patterns": best.get("Anti_Patterns", ""),
    }


# ============ MAIN GENERATOR ============

def generate_design_system(prompt: str, stack: list[str] = None) -> dict:
    """
    Analyze prompt and generate a complete design system.
    """
    project_type = detect_project_type(prompt)
    dark_mode = wants_dark_mode(prompt)

    palette = find_best_palette(project_type, dark_mode)
    fonts = find_best_fonts(project_type)
    style = find_best_style(project_type)
    landing = find_landing_pattern(style.get("landing_pattern", ""))
    reasoning = find_reasoning(project_type)

    css_vars = f"""  --primary: {palette['primary']};
  --on-primary: {palette['on_primary']};
  --secondary: {palette['secondary']};
  --accent: {palette['accent']};
  --background: {palette['background']};
  --foreground: {palette['foreground']};
  --card: {palette['card']};
  --card-foreground: {palette['card_foreground']};
  --muted: {palette['muted']};
  --muted-foreground: {palette['muted_foreground']};
  --border: {palette['border']};
  --destructive: {palette['destructive']};
  --radius: 12px;"""

    return {
        "project_type": project_type,
        "dark_mode": dark_mode,
        "style_name": style["primary_style"],
        "secondary_styles": style["secondary_styles"],
        "palette": palette,
        "fonts": {
            "pairing_name": fonts["pairing_name"],
            "heading": fonts["heading"],
            "body": fonts["body"],
            "category": fonts["category"],
            "css_import": fonts.get("css_import", ""),
        },
        "landing_pattern": landing,
        "reasoning": reasoning,
        "css_variables": css_vars,
        "style_details": {
            "ai_prompt": style.get("ai_prompt_keywords", ""),
            "css_keywords": style.get("css_keywords", ""),
            "design_variables": style.get("design_variables", ""),
            "checklist": style.get("implementation_checklist", ""),
            "key_considerations": style.get("key_considerations", ""),
        },
    }


def format_for_prompt(ds: dict) -> str:
    """
    Format design system as text block for Claude's prompt injection.
    """
    palette = ds["palette"]
    fonts = ds["fonts"]
    landing = ds["landing_pattern"]
    reasoning = ds.get("reasoning", {})
    style_details = ds.get("style_details", {})

    lines = []
    lines.append("")
    lines.append("═══════════════════════════════════════════")
    lines.append("   DESIGN SYSTEM EXPERT — UTILISATION OBLIGATOIRE")
    lines.append("═══════════════════════════════════════════")
    lines.append("")
    lines.append(f"Type de projet: {ds['project_type']}")
    lines.append(f"Style UI: {ds['style_name']}")
    if ds.get("secondary_styles"):
        lines.append(f"Styles alt: {ds['secondary_styles']}")
    lines.append(f"Mode: {'DARK' if ds['dark_mode'] else 'LIGHT'}")
    lines.append("")

    lines.append("── PALETTE (OBLIGATOIRE — utilise ces hex EXACTEMENT) ──")
    lines.append(f"  Primary:    {palette['primary']}  (text: {palette['on_primary']})")
    lines.append(f"  Secondary:  {palette['secondary']}")
    lines.append(f"  Accent/CTA: {palette['accent']}")
    lines.append(f"  Background: {palette['background']}")
    lines.append(f"  Foreground: {palette['foreground']}")
    lines.append(f"  Card:       {palette['card']}  (text: {palette['card_foreground']})")
    lines.append(f"  Muted:      {palette['muted']}  (text: {palette['muted_foreground']})")
    lines.append(f"  Border:     {palette['border']}")
    lines.append(f"  Error:      {palette['destructive']}")
    if palette.get("notes"):
        lines.append(f"  Logique: {palette['notes']}")
    lines.append("")

    lines.append("── TYPOGRAPHIE (OBLIGATOIRE) ──")
    lines.append(f"  {fonts['pairing_name']} ({fonts['category']})")
    lines.append(f"  Titres: font-family: '{fonts['heading']}', sans-serif")
    lines.append(f"  Corps:  font-family: '{fonts['body']}', sans-serif")
    if fonts.get("css_import"):
        lines.append(f"  {fonts['css_import']}")
    lines.append("")

    lines.append("── CSS VARIABLES :root ──")
    lines.append(ds["css_variables"])
    lines.append(f"  --font-heading: '{fonts['heading']}', sans-serif;")
    lines.append(f"  --font-body: '{fonts['body']}', sans-serif;")
    lines.append("")

    lines.append("── STRUCTURE PAGE ──")
    lines.append(f"  Pattern: {landing.get('pattern_name', '')}")
    if landing.get("section_order"):
        lines.append(f"  Sections: {landing['section_order']}")
    if landing.get("cta_placement"):
        lines.append(f"  CTA: {landing['cta_placement']}")
    if landing.get("recommended_effects"):
        lines.append(f"  Effets: {landing['recommended_effects']}")
    if landing.get("conversion_optimization"):
        lines.append(f"  Conversion: {landing['conversion_optimization']}")
    lines.append("")

    if style_details.get("ai_prompt"):
        lines.append("── DIRECTIVES STYLE ──")
        lines.append(f"  {style_details['ai_prompt']}")
        lines.append("")

    if reasoning.get("key_effects"):
        lines.append(f"Effets CSS recommandés: {reasoning['key_effects']}")
    if reasoning.get("anti_patterns"):
        lines.append(f"⛔ ANTI-PATTERNS: {reasoning['anti_patterns']}")
    lines.append("")

    lines.append("RÈGLE ABSOLUE: Utilise EXACTEMENT ces couleurs hex, ces fonts,")
    lines.append("et cette structure. Le design system est le résultat d'une analyse")
    lines.append("experte de 119 palettes, 84 styles et 73 font pairings.")
    lines.append("═══════════════════════════════════════════")

    return "\n".join(lines)


def get_summary(ds: dict) -> dict:
    """Return a compact summary for the frontend chat display."""
    return {
        "project_type": ds["project_type"],
        "style_name": ds["style_name"],
        "dark_mode": ds["dark_mode"],
        "palette_colors": [
            ds["palette"]["primary"],
            ds["palette"]["secondary"],
            ds["palette"]["accent"],
            ds["palette"]["background"],
            ds["palette"]["foreground"],
        ],
        "fonts": {
            "heading": ds["fonts"]["heading"],
            "body": ds["fonts"]["body"],
        },
        "landing_pattern": ds["landing_pattern"].get("pattern_name", ""),
    }
