#!/usr/bin/env python3
"""Inject animated SVG icons + CSS into the three Mesonsoft product pages."""
import re
from pathlib import Path

P = Path("/Users/mesonx/MY LAB/mesonsoft")
PARTIALS = P / "src/partials"
INLINE_CSS = P / "public/assets/inline-head.css"

PURPLE = "#9F66FF"
PINK = "#FF196E"

def svg_circle(cx, cy, r):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}"/>'

def svg_rect(x, y, w, h, rx=0):
    rx_attr = f' rx="{rx}"' if rx else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}"{rx_attr}/>'

def svg_line(x1, y1, x2, y2):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>'

def svg_poly(points):
    return f'<polyline points="{points}"/>'

def svg_path(d):
    return f'<path d="{d}"/>'

def make_svg(parts, stroke="currentColor", sw=2):
    body = "".join(parts)
    return (
        f'<svg class="aux-icon-list-icon ms-icon" '
        f'viewBox="0 0 24 24" fill="none" '
        f'stroke="{stroke}" stroke-width="{sw}" '
        f'stroke-linecap="round" stroke-linejoin="round">'
        f'{body}</svg>'
    )
# ============ ICON LIBRARY ============
ICONS = {
    # Advanced LLM Integration
    "LLM Models": make_svg([svg_circle(12,12,10), svg_circle(12,12,4)], sw=1.5),
    "Integrated": make_svg([
        svg_circle(18,18,3), svg_circle(6,6,3),
        svg_path("M13 6h3a2 2 0 0 1 2 2v7"),
        svg_path("M10 14h4"),
        svg_path("M7 18a2 2 0 0 1-2-2V9"),
        svg_path("M9 9h4v7"),
    ], sw=1.8),
    "Enterprise": make_svg([
        svg_path("M3 21V8l9-5 9 5v13"),
        svg_path("M9 21V12h6v9"),
    ]),
    "Integrations": make_svg([
        svg_rect(4,4,16,16,2),
        svg_line(8,8,8,16), svg_line(12,8,12,16), svg_line(16,8,16,16),
    ], sw=1.8),
    "Uptime": make_svg([
        svg_circle(12,12,10),
        svg_poly("12 6 12 12 16 14"),
    ]),
    "Reliability": make_svg([
        svg_path("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"),
    ]),
    "Avg": make_svg([
        svg_path("M18 20V10"),
        svg_path("M12 20V4"),
        svg_path("M6 20v-6"),
    ]),
    "Response": make_svg([
        svg_path("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"),
    ]),
    # Agentic Automation
    "Agents": make_svg([
        svg_rect(3,11,18,10,2),
        svg_circle(12,5,2),
        svg_path("M12 7v4"),
        svg_path("M12 16v2"),
        svg_rect(5,14,2,4,1),
        svg_rect(17,14,2,4,1),
    ]),
    "Deployed": make_svg([
        svg_path("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"),
        svg_poly("7 10 12 15 17 10"),
        svg_line(12,15,12,3),
    ]),
    "Tasks": make_svg([
        svg_path("M9 11l3 3L22 4"),
        svg_path("M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"),
    ]),
    "Automated": make_svg([
        svg_circle(12,12,3),
        svg_circle(5,12,1.4),
        svg_circle(19,12,1.4),
        svg_path("M12 9v6"),
        svg_path("M5 12h2"),
        svg_path("M17 12h2"),
    ]),
    "Resolution": make_svg([
        svg_circle(12,12,10),
        svg_circle(12,12,6),
        svg_circle(12,12,2),
    ]),
    "Rate": make_svg([
        svg_path("M12 20V10"),
        svg_path("M18 20V4"),
        svg_path("M6 20v-4"),
    ]),
    "Operation": make_svg([
        svg_circle(12,12,3),
        svg_path("M12 1v4"),
        svg_path("M12 19v4"),
        svg_poly("4.22 4.22 7.05 7.05"),
        svg_poly("16.95 16.95 19.78 19.78"),
        svg_line(1,12,5,12),
        svg_line(19,12,23,12),
        svg_poly("4.22 19.78 7.05 16.95"),
        svg_poly("16.95 7.05 19.78 4.22"),
    ]),
    "Support": make_svg([
        svg_path("M18 8h1a4 4 0 0 1 0 8h-1"),
        svg_path("M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"),
        svg_line(6,15,18,15),
    ]),
    # Enterprise-Grade Security
    "Security": make_svg([
        svg_path("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"),
        svg_path("M12 8v4l2 2"),
    ]),
    "Monitoring": make_svg([
        svg_path("M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"),
        svg_circle(12,12,3),
    ]),
    "Encryption": make_svg([
        svg_path("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"),
        svg_path("M12 8v4l2 2"),
    ]),
    "Standard": make_svg([
        svg_circle(12,8,6),
        svg_poly("15.477 12.89 17 22 12 19 9 22 10.523 12.89"),
    ]),
    "Compliance": make_svg([
        svg_rect(6,2,12,16,0),
        svg_poly("14 2 14 8 20 8"),
        svg_line(16,13,8,13),
        svg_line(16,17,8,17),
    ]),
    "Coverage": make_svg([
        svg_path("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"),
    ]),
    "Years": make_svg([
        svg_rect(3,4,18,18,2),
        svg_line(16,2,16,6),
        svg_line(8,2,8,6),
        svg_line(3,10,21,10),
    ]),
    "Experience": make_svg([
        svg_poly("12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"),
    ]),
}


# ============ CSS ANIMATIONS ============
CSS = """
/* ===== Entrance-animated icon-list icons (Mesonsoft product pages) ===== */
.aux-icon-list-item .aux-icon-list-icon.ms-icon {
    display: inline-block;
    width: 24px;
    height: 24px;
    margin-right: 10px;
    vertical-align: -4px;
    color: #9F66FF;
    transition: color 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.aux-icon-list-item .aux-icon-list-icon.ms-icon svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    transition: stroke 0.3s ease;
}

/* ---- initial (pre-entrance) state ---- */
.aux-icon-list-item-beea072 .aux-icon-list-icon.ms-icon {
    color: #9F66FF;
    transform: scale(0.55) translateY(10px);
    opacity: 0;
    transition: color 0.3s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                opacity 0.35s ease;
}
.aux-icon-list-item-79db1fb .aux-icon-list-icon.ms-icon {
    color: #FF196E;
    transform: scale(0.55) translateY(10px);
    opacity: 0;
    transition: color 0.3s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                opacity 0.35s ease;
}
.aux-icon-list-item-79db1fb:nth-child(2) .aux-icon-list-icon.ms-icon {
    transition-delay: 0.12s;
}

/* ---- once the item has scrolled into view ---- */
.aux-icon-list-item.ms-icon-entered .aux-icon-list-icon.ms-icon {
    opacity: 1;
    transform: scale(1) translateY(0);
}
.aux-icon-list-item.ms-icon-entered.aux-icon-list-item-beea072 .aux-icon-list-icon.ms-icon {
    color: #9F66FF;
}
.aux-icon-list-item.ms-icon-entered.aux-icon-list-item-79db1fb .aux-icon-list-icon.ms-icon {
    color: #FF196E;
}

/* ---- entrance keyframe (runs once, then holds its final state) ---- */
.aux-icon-list-item.ms-icon-entered .aux-icon-list-icon.ms-icon {
    animation: ms-icon-entrance 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.aux-icon-list-item-79db1fb.ms-icon-entered .aux-icon-list-icon.ms-icon {
    animation-delay: 0.1s;
}
.aux-icon-list-item-79db1fb:nth-child(2).ms-icon-entered .aux-icon-list-icon.ms-icon {
    animation-delay: 0.22s;
}

@keyframes ms-icon-entrance {
    0% {
        opacity: 0;
        transform: scale(0.55) translateY(10px) rotate(-6deg);
    }
    60% {
        opacity: 1;
        transform: scale(1.12) translateY(-2px) rotate(2deg);
    }
    100% {
        opacity: 1;
        transform: scale(1) translateY(0) rotate(0deg);
    }
}

/* ---- hover pop effect (after entrance) ---- */
.aux-icon-list-item:hover .aux-icon-list-icon.ms-icon {
    transform: scale(1.22) translateY(-2px);
    color: #9F66FF;
}
.aux-icon-list-item-beea072:hover .aux-icon-list-icon.ms-icon {
    color: #9F66FF;
    filter: drop-shadow(0 4px 8px rgba(159, 102, 255, 0.45));
}
.aux-icon-list-item-79db1fb:hover .aux-icon-list-icon.ms-icon {
    color: #FF196E;
    filter: drop-shadow(0 4px 8px rgba(255, 25, 110, 0.45));
}

@media (prefers-reduced-motion: reduce) {
    .aux-icon-list-item .aux-icon-list-icon.ms-icon {
        animation: none !important;
        transition: color 0.2s ease;
        transform: none !important;
        opacity: 1 !important;
    }
    .aux-icon-list-item.ms-icon-entered .aux-icon-list-icon.ms-icon {
        animation: none !important;
    }
}
"""


# ============ INJECTION LOGIC ============
def process_file(filepath):
    content = filepath.read_text(encoding="utf-8")
    if 'class="aux-icon-list-icon ms-icon"' in content:
        print(f"  Skipping {filepath.name} - icons already present")
        return False

    def inject_icon(match):
        before_li, li_attrs, gt, li_content, after_li = match.groups()
        text_match = re.search(
            r'class="aux-icon-list-text"[^>]*>([^<]+)<', li_content
        )
        if not text_match:
            return match.group(0)
        label = text_match.group(1).strip()
        icon_svg = ICONS.get(label)
        if not icon_svg:
            print(f"  Warning: No icon mapping for '{label}'")
            return match.group(0)
        new_content = li_content.replace(
            '<span class="aux-icon-list-text"',
            f'{icon_svg}<span class="aux-icon-list-text"',
        )
        return f'{before_li}{li_attrs}>{new_content}{after_li}'

    new_content = re.sub(
        r'(<li)([^>]*)(>)(.*?)(</li>)',
        inject_icon,
        content,
        flags=re.DOTALL,
    )

    if new_content != content:
        filepath.write_text(new_content, encoding="utf-8")
        return True
    return False


def add_css():
    if not INLINE_CSS.exists():
        print(f"  Warning: {INLINE_CSS} not found")
        return False
    content = INLINE_CSS.read_text(encoding="utf-8")
    if "ms-icon-entrance" in content:
        print("  CSS already present in inline-head.css")
        return False
    INLINE_CSS.write_text(
        content.rstrip() + "\n\n" + CSS + "\n", encoding="utf-8"
    )
    return True


# ============ MAIN ============
if __name__ == "__main__":
    print("Injecting animated SVG icons + CSS...")
    print()

    files = [
        PARTIALS / "advanced-llm-integration.html",
        PARTIALS / "agentic-automation.html",
        PARTIALS / "enterprise-grade-security.html",
    ]

    changed = 0
    for filepath in files:
        print(f"Processing {filepath.name}...")
        if process_file(filepath):
            changed += 1
            print("  Icons injected")
        else:
            print("  No changes needed")

    print()
    print("Updating CSS...")
    if add_css():
        print("  CSS added")

    print()
    print(f"Done! Modified {changed} HTML file(s).")
    print()
    print("Icon library:", len(ICONS), "icons")
    for label in sorted(ICONS.keys()):
        print(f"  - {label}")

