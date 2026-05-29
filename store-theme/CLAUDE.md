# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **VTEX IO Store Theme** for Drogaria São Pedro - a theme-based storefront built on VTEX IO platform using the Store builder with block-based composition.

**Current version**: 5.0.21  
**Vendor**: drogariasaopedro

## Architecture & Core Concepts

### Block System (`store/blocks/`)

This project follows VTEX IO's **render-runtime-and-blocks** architecture:

- **Blocks are composable UI components** defined in JSON that reference:
  - VTEX native blocks (e.g., `flex-layout`, `sticky-layout`, `vtex.menu@2.x:menu`)
  - Custom theme styling via CSS handles
  - Props for configuration (props are block-specific configuration values)

- **Block hierarchy**: Blocks nest via `children` array. The root is defined in template JSON files:
  - `store/blocks/header/` - Header template and composition
  - `store/blocks/footer/` - Footer template and composition
  - `store/blocks/home/` - Homepage template blocks
  - `store/blocks/pdp/` - Product Detail Page blocks
  - `store/blocks/product-summary/` - Product card/summary blocks

- **Block naming convention**: `namespace.component@version:blockId#modifierName`
  - Example: `vtex.menu@2.x:menu#category-menu`

### Styles & Theme (`styles/`)

- **`styles/configs/style.json`**: Global theme configuration (NOT CSS)
  - `typeScale`: Font size multipliers
  - `spacing`: Margin/padding scale (in REM units)
  - `customMedia`: Responsive breakpoints (s, ns, m, l, xl)
  - `colors`: Semantic color tokens (black-90, white-50, etc.)
  
- **`styles/css/`**: Actual CSS files organized by page/section:
  - CSS files use **CSS Handles** (custom CSS selectors exported by blocks)
  - Override block styles using these handles
  - Example: `.sticky-header` class from `blockClass="sticky-header"` in header.jsonc

### Dependencies & Block Composition

The theme composes from VTEX core blocks (defined in `manifest.json` dependencies):

- **Layout blocks**: `flex-layout`, `sticky-layout`, `responsive-layout`, `modal-layout`, `tab-layout`
- **Store blocks**: `store-header`, `store-footer`, `store-components`, `search-result`, `product-details`
- **Navigation**: `vtex.menu`, `breadcrumb`, `category-menu`, `locale-switcher`
- **Product**: `product-summary`, `product-price`, `product-quantity`, `add-to-cart-button`
- **Commerce**: `minicart`, `login`, `checkout-summary`, `order-placed`
- **UI Components**: `carousel`, `slider`, `modal`, `drawer`, `condition-layout`

These are imported via dependency declarations in `manifest.json`.

## Development Workflow

### Install Dependencies

```bash
vtex install
```

Links all VTEX dependencies specified in `manifest.json`.

### Link Local Development

```bash
vtex link
```

Deploys the current theme to a VTEX workspace for testing. Watch for changes and relink as needed.

### Link to a Specific Workspace

```bash
vtex use <account>.<workspace>
vtex link
```

### Publish Release

```bash
yarn releasy
# or
npm run releasy
```

Triggers `postreleasy` script → `vtex publish --verbose`

### Check VTEX CLI Status

```bash
vtex whoami
vtex info
```

## Block Development Patterns

### 1. Adding a New Block to a Template

1. **Create the block definition** in appropriate JSON file (e.g., `store/blocks/header/header.jsonc`)
2. **Reference an existing VTEX block** or create a custom one
3. **Configure via props** - all configuration is done in the JSON file
4. **Add CSS styling** via `blockClass` prop + corresponding CSS file

Example:
```jsonc
"flex-layout.row#promo": {
  "props": {
    "blockClass": "promo-banner",
    "fullWidth": true,
    "horizontalAlign": "center"
  },
  "children": ["rich-text#promo"]
},

"rich-text#promo": {
  "props": {
    "text": "Summer Sale",
    "textPosition": "center"
  }
}
```

Then in `styles/css/header/promo-banner.css`:
```css
.promo-banner {
  background: #f0f0f0;
  padding: 1rem;
}
```

### 2. Component Composition Patterns

- **Flex/Grid layouts** for responsive arrangements: use `flex-layout.row` + `flex-layout.col`
- **Sticky layouts** for persistent headers: `sticky-layout` + child layout
- **Responsive layouts** for mobile/desktop variations: `responsive-layout` with `mobile` and `desktop` children
- **Condition layouts** for conditional rendering: `condition-layout` based on user state or page context

### 3. Responsive Breakpoints

Media queries follow the `customMedia` defined in `style.json`:
- `s`: 20rem (320px) - small phones
- `ns`: 40rem (640px) - larger phones/tablets
- `m`: 40rem+ (640px+) - tablets
- `l`: 64rem+ (1024px+) - desktops
- `xl`: 80rem+ (1280px+) - large desktops

Use in CSS with `@media` or VTEX's responsive-friendly components.

## Site Editor Labels (`title` prop)

Every block that appears in the **VTEX Site Editor** (CMS panel) should have a human-readable `title` prop. Without it, editors see auto-generated IDs like `flex-layout.row#4-desktop`, which makes it hard to identify sections.

```jsonc
"flex-layout.row#4-desktop": {
  "props": {
    "title": "Header Bar Principal",
    "blockClass": "main-header",
    "fullWidth": true
  },
  "children": [...]
}
```

**Rule**: always add `title` to any block that a non-developer might select or reorder in the Site Editor:

- Top-level layout rows/columns
- Carousels and shelves
- Banners and rich-text sections
- Product shelves on the homepage

Prefer **Portuguese, descriptive titles** since the store's admin team is Brazilian:

```jsonc
"slider-layout#home": {
  "props": {
    "title": "Carrossel - Banner Principal"
  }
},
"shelf#home": {
  "props": {
    "title": "Prateleira - Produtos em Destaque"
  }
},
"rich-text#promo": {
  "props": {
    "title": "Texto - Faixa Promocional"
  }
}
```

Use the pattern `Tipo - Descrição` (e.g. `Prateleira - Ofertas`, `Banner - Topo`) to keep the Site Editor tree organized and scannable.

## CSS Handle System

VTEX blocks export **CSS Handles** - custom class names that can be styled:

1. Each block component defines its CSS handles in documentation
2. Blocks accept `blockClass` prop to add custom classes
3. Style via class selectors in CSS files

Example: `sticky-layout` exports handle `.sticky-header` when `blockClass="sticky-header"` is set.

## File Organization

```
store-theme/
├── manifest.json          # App metadata, dependencies, builders
├── CLAUDE.md              # This file
├── store/
│   ├── blocks/            # Block template compositions
│   │   ├── header/        # Header block definitions
│   │   ├── footer/        # Footer blocks
│   │   ├── home/          # Homepage blocks
│   │   ├── pdp/           # Product page blocks
│   │   └── product-summary/ # Product card blocks
│   ├── routes.json        # URL routing/page mappings
│   └── templates/         # (if any) template overrides
├── styles/
│   ├── configs/
│   │   └── style.json     # Theme tokens (colors, spacing, fonts)
│   └── css/               # Organized CSS per page/section
├── docs/                  # Documentation schemas (contact-schema.json)
├── sitemap/               # Sitemap configuration
├── assets/                # Static images/files
└── .vscode/
    └── mcp.json           # MCP server configuration
```

## Styling Strategy

1. **Token-based**: Use `style.json` for semantic tokens (colors, spacing, typography)
2. **Component-scoped**: Each CSS file styles a specific block/section
3. **CSS Handles**: Reference official block handles rather than generic selectors
4. **Responsive-first**: Design for mobile, enhance for larger screens
5. **Override approach**: Customize VTEX blocks via CSS, not by modifying `node_modules`

## Common Tasks

### Add a New Page/Route

1. Create block definitions in `store/blocks/<page>/`
2. Add route mapping in `store/routes.json`
3. Link theme to test: `vtex link`

### Customize a VTEX Block

1. Identify the block's CSS handles (check VTEX documentation)
2. Add styling in appropriate CSS file under `styles/css/`
3. Use `blockClass` prop to apply custom class name if needed
4. Test with `vtex link`

### Update Theme Dependencies

1. Edit `manifest.json` dependencies section
2. Run `vtex install`
3. Run `vtex link` to test changes

### Debug Block Issues

1. Use VTEX Workspace Preview/DevTools in browser
2. Inspect the actual block instance in VTEX Site Editor
3. Check block prop configuration in JSON
4. Verify CSS is loading via browser DevTools
5. Check `vtex link` console for errors

## MCP Integration

The project includes **VTEX Developer MCP** (`@vtex/developer-mcp`) configured in `.vscode/mcp.json`. This provides Claude Code with VTEX-specific tools and context for more intelligent code suggestions.

## Key Dependencies

See `manifest.json` for full dependency list. Critical ones:

- `vtex.store@2.x` - Core storefront framework
- `vtex.styleguide@9.x` - Design system components
- `vtex.store-components@3.x` - Common UI components
- `vtex.flex-layout@0.x` - Layout composition
- `vtex.search@2.x` - Search functionality
- `vtex.product-details@1.x` - Product page
- `vtex.minicart@2.x` - Shopping cart

## Troubleshooting

**Block not appearing after linking:**
- Verify block is referenced in correct JSON file
- Check `vtex link` console for errors
- Ensure dependency version in `manifest.json` matches block namespace

**Styles not applying:**
- Verify CSS file is in `styles/css/` directory
- Check browser DevTools for CSS selector specificity issues
- Ensure `blockClass` prop matches CSS class name

**Dependency version conflict:**
- Clear `node_modules`: `rm -rf node_modules`
- Reinstall: `vtex install`
- Relink: `vtex link`

## References

- [VTEX IO Documentation](https://developers.vtex.com/docs/guides)
- [Store Framework Blocks](https://developers.vtex.com/docs/guides/vtex-io-documentation-blocks)
- [CSS Handles](https://developers.vtex.com/docs/guides/vtex-io-documentation-styling)
