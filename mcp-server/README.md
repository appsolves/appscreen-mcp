# AppScreen MCP Server

This package exposes the AppScreen App Store Screenshot Generator as a Model Context Protocol server.

It uses a clean in-app automation bridge (`../mcp-bridge.js`) and Playwright. The MCP server does not scrape random UI selectors. It loads the app, calls `window.AppScreenMCP`, and saves exported PNG/ZIP artifacts to disk when requested.

## Install

```bash
cd mcp-server
npm install
npx playwright install chromium
npm run build
```

## Run

```bash
APPSCREEN_URL=http://localhost:8000 APPSCREEN_OUTPUT_DIR=./outputs npm start
```

For a hosted fork:

```bash
APPSCREEN_URL=https://appsolves.github.io/appscreen/ npm start
```

For local development, start the app from the repository root first:

```bash
python3 -m http.server 8000
```

## Claude Desktop example

```json
{
  "mcpServers": {
    "appscreen": {
      "command": "node",
      "args": ["/absolute/path/to/appscreen/mcp-server/dist/index.js"],
      "env": {
        "APPSCREEN_URL": "http://localhost:8000",
        "APPSCREEN_OUTPUT_DIR": "/absolute/path/to/appscreen/mcp-server/outputs"
      }
    }
  }
}
```

## Main tools

- `appscreen_initialize`
- `appscreen_get_capabilities`
- `appscreen_get_state`
- `appscreen_create_project`
- `appscreen_set_output_size`
- `appscreen_set_languages`
- `appscreen_add_screenshot`
- `appscreen_set_background`
- `appscreen_set_background_image`
- `appscreen_set_device_settings`
- `appscreen_set_text`
- `appscreen_add_text_element`
- `appscreen_add_emoji_element`
- `appscreen_add_icon_element`
- `appscreen_add_graphic_element`
- `appscreen_add_popout`
- `appscreen_update_element`
- `appscreen_update_popout`
- `appscreen_apply_style_to_all`
- `appscreen_export_current_png`
- `appscreen_export_all_zip`
- `appscreen_run_cable_launch_recipe`
- `appscreen_raw_bridge_call`

## File inputs

Tools that accept images can receive either:

- `filePath`: a local path readable by the MCP server process
- `dataUrl`: a `data:image/*;base64,...` string
- `base64` plus `mimeType`

Exports return base64 data and, when `saveToFile` is true, write files into `APPSCREEN_OUTPUT_DIR`.
