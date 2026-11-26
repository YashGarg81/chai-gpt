# UI Responsive Browser QA — ChaiGPT

**Target URL:** `http://localhost:3000/c/cmwx986e4000500unug2tsrqq`

| Viewport | Status | Sidebar Behavior | Layout / Composer / Overflow |
| :--- | :--- | :--- | :--- |
| **1920x1080** (Desktop) | **PASS** | Visible & docked | Aligned, no overlap, no visible overflow |
| **1440x900** (Desktop) | **PASS** | Visible & docked | Aligned, no overlap, no visible overflow |
| **1366x768** (Laptop) | **PASS** | Visible & docked | Aligned, no overlap, no visible overflow |
| **768x1024** (Tablet) | **PASS** | Collapsible / toggle button | Aligned, no overlap, no visible overflow |
| **390x844** (Mobile) | **PASS** | Collapsed to `Toggle sidebar` button | Aligned, no overlap, no visible overflow |
| **360x800** (Small Mobile) | **PASS** | Collapsed to `Toggle sidebar` button | Aligned, no overlap, no visible overflow |

## Notes
- **Console errors:** 0 console errors.
- **Limitation:** `evaluate_script` was blocked by a user-configured deny rule, so `document.documentElement.scrollWidth <= window.innerWidth` was verified visually rather than via JS.
