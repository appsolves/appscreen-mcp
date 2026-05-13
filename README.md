# App Store Screenshot Generator

A free, open-source tool for creating beautiful App Store screenshots with customizable backgrounds, text overlays, 2D and 3D device mockups, and full MCP-based automation for coding agents.

**[Start using it now. Hosted on GitHub Pages](https://appsolves.github.io/appscreen-mcp/)**

![App Store Screenshot Generator](img/screenshot-generator.png)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> 🍋 **Original project by [YuzuHub](https://yuzuhub.com)**.  
> This fork by **[AppSolves](https://appsolves.dev)** adds a full **Model Context Protocol (MCP) server** so coding agents such as Codex and Claude can control the screenshot generator programmatically.

## Features

> [!TIP]
> This tool has an `npm` package available under [`@appsolves/appscreen-mcp`](https://www.npmjs.com/package/@appsolves/appscreen-mcp) that exposes the full screenshot generator functionality as an MCP server. See the [**MCP Automation**](#mcp-automation) section below and the [MCP server README](mcp-server/README.md) for details.

### Output & Export

- **Multiple Output Sizes**: iPhone 6.9", 6.7", 6.5", 5.5" and iPad 12.9", 11" App Store requirements, plus custom sizes
- **Batch Export**: Export all screenshots at once as a ZIP file
- **Per-Screenshot Settings**: Each screenshot can have its own background, device settings, and text
- **PNG Export**: Export the current screenshot directly
- **ZIP Export**: Export all screenshots for one or multiple languages

### Backgrounds

- **Gradient Backgrounds**: Multi-stop gradients with draggable color stops and angle control
- **Preset Gradients**: Quick-access gradient presets for common styles
- **Solid Color**: Simple single-color backgrounds
- **Image Backgrounds**: Upload custom images with blur, overlay, and fit options
- **Noise Overlay**: Add subtle noise texture to any background

### Device Mockups

- **2D Mode**: Position, scale, rotate, and adjust corner radius of screenshots
- **3D Mode**: Interactive iPhone 15 Pro Max 3D mockup with drag-to-rotate
- **Position Presets**: Centered, bleed, tilt left/right, perspective, and more
- **Shadow Effects**: Customizable drop shadows with color, blur, opacity, and offset
- **Border Effects**: Add borders around screenshots with adjustable width and opacity

### Text Overlays

- **Headlines & Subheadlines**: Separate controls with enable/disable toggles
- **Font Picker**: Access to 1500+ Google Fonts with search and preview
- **Text Styling**: Font weight, italic, underline, strikethrough options
- **Positioning**: Top, center, or bottom placement with offset control
- **Line Height**: Adjustable spacing for multi-line text

### Multi-Language Support

- **Multiple Languages**: Add translations for any language
- **Language Flags**: Visual language switcher with flag icons
- **AI-Powered Translation**: Auto-translate using Claude, OpenAI, or Google AI
- **Per-Screenshot Languages**: Different text per screenshot if needed
- **Localized Screenshots**: Upload language-specific screenshot images with auto-detection from filename
- **Smart Duplicate Detection**: Dialog to replace, create new, or skip when uploading matching screenshots
- **Multi-Language Export**: Export current language only or all languages in separate folders

### Project Management

- **Multiple Projects**: Create, rename, and delete projects
- **Auto-Save**: All changes saved automatically to browser storage via IndexedDB
- **Screenshot Count**: See screenshot counts in project selector

### User Interface

- **Dark Theme**: Easy on the eyes for extended editing sessions
- **Side Preview Carousel**: See adjacent screenshots while editing
- **Drag & Drop**: Reorder screenshots by dragging
- **Collapsible Sections**: Clean UI with expandable settings panels
- **Tab Persistence**: Remembers your active tab between sessions

### MCP Automation

This fork adds a full **MCP server** for coding agents.

With MCP, agents can:

- Create, switch, rename, duplicate, and delete projects
- Add blank screenshots or upload screenshot images
- Configure output sizes and languages
- Set backgrounds, background images, and device mockup settings
- Set localized headline and subheadline text
- Add and edit overlay elements such as text, emoji, icons, graphics, and popouts
- Export PNG files and ZIP bundles
- Capture editor previews for visual inspection
- Generate complete multi-screen screenshot sets in one structured tool call

## Getting Started

### Just Want to Use It?

Visit **[appsolves.github.io/appscreen-mcp](https://appsolves.github.io/appscreen-mcp/)** to use the tool directly in your browser. No installation needed!

---

### Want to Develop & Customize?

#### Option 1: Run Locally (Command Line)

Since this app uses IndexedDB for persistence, you need to serve it through a local web server.

```bash
# From the repository root

# Using Python
python3 -m http.server 8000

# Or using Node.js
npx serve .
```

Then open:

```txt
http://localhost:8000
```

#### Option 2: VS Code Live Server

If you have the "Live Server" extension installed in VS Code, right-click `index.html` and select **Open with Live Server**.

#### Option 3: Docker

Run the pre-built Docker image from GitHub Container Registry:

```bash
# Using Docker directly
docker run -d -p 8080:80 ghcr.io/appsolves/appscreen-mcp:latest

# Using Docker Compose
docker compose up -d
```

Then open:

```txt
http://localhost:8080
```

#### Building locally

If you want to build the image yourself:

```bash
docker compose -f docker-compose.build.yml up -d
```

## MCP Server

This fork includes a full **Model Context Protocol server** under `mcp-server/`.

The browser app exposes a stable internal automation API in `mcp-bridge.js`. The MCP server uses **Playwright** to open the app and call `window.AppScreenMCP` directly, instead of relying on brittle DOM scraping.

This makes the tool reliable and agent-friendly for systems such as:

- Codex
- Claude Desktop
- Cursor
- other MCP-compatible clients

### What the MCP server can do

The MCP server exposes structured tools for:

- project management
- screenshot upload and selection
- localized screenshot images
- output size configuration
- language configuration
- backgrounds and background images
- mockup/device positioning
- headline and subheadline control
- overlays such as text, emoji, icons, graphics, and popouts
- style propagation across screenshots
- current PNG export
- ZIP export of all screenshots
- editor preview capture
- full multi-screen screenshot set creation in one call

### Quick start

```bash
# Terminal 1, from repository root
python3 -m http.server 8000

# Terminal 2
cd mcp-server
npm install
npx playwright install chromium
npm run build
APPSCREEN_URL=http://localhost:8000 npm start
```

For the hosted fork:

```bash
cd mcp-server
npm install
npx playwright install chromium
npm run build
APPSCREEN_URL=https://appsolves.github.io/appscreen-mcp/ npm start
```

See **[`mcp-server/README.md`](mcp-server/README.md)** for:

- MCP setup
- Claude Desktop configuration
- package usage
- recommended workflows
- complete MCP tool list

## Usage

1. **Upload Screenshots**: Drag and drop your app screenshots or click to browse
2. **Choose Output Size**: Select the target device size from the sidebar
3. **Customize Background**: Choose gradient, solid color, or image background
4. **Position Screenshot**: Use presets or manually adjust scale, position, and rotation
5. **Switch to 3D** (optional): Enable 3D mode for interactive iPhone mockup
6. **Add Text**: Enter your headline and optional subheadline
7. **Export**: Download the current screenshot or export all at once as ZIP

## AI Translation

To use the AI-powered translation feature:

1. Click the Settings icon (gear) in the sidebar
2. Choose your AI provider (Claude, OpenAI, or Google)
3. Enter your API key from the respective provider's console
4. Add multiple languages to your headline/subheadline
5. Click the translate icon and use **Auto-translate with AI**

Your API key is stored locally in your browser and only sent to the selected AI provider's API.

## Tech Stack

- Vanilla JavaScript (no frameworks)
- HTML5 Canvas for 2D rendering
- Three.js for 3D device mockups
- IndexedDB for local storage
- JSZip for batch export
- Google Fonts API for font picker
- Claude/OpenAI/Google APIs for translations
- Playwright for MCP-driven browser automation
- MCP server built with `@modelcontextprotocol/sdk`
- Docker + nginx for containerized deployment

## Apps Using This Project

Built something with this tool? Add your app to the list by submitting a pull request!

| App | Description | Link |
|-----|-------------|------|
| Cable | Manage your 12V systems like Boats and RVs | [cable.yuzuhub.com](https://cable.yuzuhub.com) |
| Eno | Wine pairings and food pairings made easy | [eno.yuzuhub.com](https://eno.yuzuhub.com) |
| TravelRates Currency Converter* | Exchange Rates for Travelers | [apple.com](https://apps.apple.com/sg/app/travelrates-currency-converter/id6756080378) |
| Trakz Sales Tracker | Manage sales for restaurants and small businesses | [apple.com](https://apps.apple.com/us/app/trakz-sales-tracker/id6748954468) |
| AI Soccer Insights Football IQ | AI-powered football predictions and insights | [apple.com](https://apps.apple.com/us/app/ai-soccer-insights-football-iq/id6592649804) |
| Navegatime | time tracking for workers and business functions | [play.google.com](https://play.google.com/store/apps/details?id=com.companyname.NavegaTime) |
| Sommo | Your personal wine journey - scan labels, learn wine, and build your tasting journal | [sommo.app](https://sommo.app) |
| Dandelion: Write and Let Go | An ephemeral journal for writing to let go, not save. | [apple.com](https://apps.apple.com/us/app/dandelion-write-and-let-go/id6757363901) |
| *Your app here* | *Submit a PR to add your app* | *Your app link* |

## License

MIT License. Feel free to use, modify, and distribute.

## Credits

- **Samsung Galaxy S25 Ultra 3D Model** by [mistJS](https://sketchfab.com/mistjs) - Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **iPhone 15 Pro Max 3D Model** by [MajdyModels](https://sketchfab.com/majdymodels) - Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Author

Original project by [Stefan](https://github.com/BlackMac) at [YuzuHub](https://yuzuhub.com/en).  
This fork and MCP integration are maintained by [AppSolves](https://appsolves.dev).