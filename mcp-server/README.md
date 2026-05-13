# AppScreen MCP Server

This package exposes the AppScreen App Store Screenshot Generator as a Model Context Protocol server.

It uses a clean in-app automation bridge (`../mcp-bridge.js`) and Playwright. The MCP server does not scrape random UI selectors. It loads the app, calls `window.AppScreenMCP`, and saves exported PNG/ZIP artifacts to disk when requested.

## npm package

The MCP server is published on npm as:

```bash
@appsolves/appscreen-mcp
```

For most users, no repository clone is required. MCP clients can run the server directly with `npx`:

```bash
npx -y @appsolves/appscreen-mcp@latest
```

The package controls the hosted AppScreen frontend by default:

```txt
https://appsolves.github.io/appscreen-mcp/
```

You only need to clone this repository if you want to develop the MCP server or run a local copy of the frontend.

## Local development install

```bash
cd mcp-server
npm install
npx playwright install chromium
npm run build
```

## Run locally

For local development, start the AppScreen frontend from the repository root first:

```bash
python3 -m http.server 8000
```

Then run the MCP server:

```bash
cd mcp-server
APPSCREEN_URL=http://localhost:8000 APPSCREEN_OUTPUT_DIR=./outputs npm start
```

For the hosted fork:

```bash
cd mcp-server
APPSCREEN_URL=https://appsolves.github.io/appscreen-mcp/ npm start
```

## Environment variables

| Variable | Required | Default | Description |
|---|---:|---|---|
| `APPSCREEN_URL` | No | `https://appsolves.github.io/appscreen-mcp/` | URL of the AppScreen frontend that the MCP server should control. Use `http://localhost:8000` for local development or your hosted GitHub Pages URL for the public app. |
| `APPSCREEN_OUTPUT_DIR` | No | `~/AppScreenMCP/outputs` | Directory where exported PNG/ZIP artifacts are saved when `saveToFile` is enabled. Relative paths are resolved from the MCP server process working directory, so absolute paths are recommended for predictable behavior. |
| `APPSCREEN_HEADLESS` | No | `true` | Controls whether Playwright runs Chromium hidden or visible. Set to `false` to see the browser while debugging or watching an agent control the app. |
| `APPSCREEN_BROWSER_TIMEOUT_MS` | No | `60000` | Timeout in milliseconds for browser navigation, bridge initialization, and Playwright operations. Increase this if the hosted app or large screenshot sets load slowly. |
| `APPSCREEN_BROWSER_PROFILE_DIR` | No | `~/AppScreenMCP/browser-profile` | Persistent Chromium profile directory used by Playwright. This preserves browser storage such as IndexedDB between MCP runs. Use a stable absolute path if you want AppScreen projects to persist after closing the browser. |

### Recommended defaults

For most users, only `APPSCREEN_URL` and optionally `APPSCREEN_HEADLESS` are needed:

```toml
[mcp_servers.appscreen.env]
APPSCREEN_URL = "https://appsolves.github.io/appscreen-mcp/"
APPSCREEN_HEADLESS = "true"
```

If you want predictable export and browser persistence paths, set absolute directories:

```toml
[mcp_servers.appscreen.env]
APPSCREEN_URL = "https://appsolves.github.io/appscreen-mcp/"
APPSCREEN_OUTPUT_DIR = "C:/Users/YourName/AppScreenMCP/outputs"
APPSCREEN_BROWSER_PROFILE_DIR = "C:/Users/YourName/AppScreenMCP/browser-profile"
APPSCREEN_HEADLESS = "false"
```

### Notes

- `APPSCREEN_OUTPUT_DIR` controls exported files only. It does not control browser storage.
- `APPSCREEN_BROWSER_PROFILE_DIR` controls Chromium's persistent profile, including IndexedDB.
- `APPSCREEN_HEADLESS = "false"` is useful during development because you can watch the agent control the app in real time.
- Avoid using `./outputs` in shared documentation unless you intentionally want outputs relative to the MCP server process working directory.

## Codex example

Add this to your Codex MCP config:

```toml
[mcp_servers.appscreen]
command = "npx"
args = ["-y", "@appsolves/appscreen-mcp@latest"]

[mcp_servers.appscreen.env]
APPSCREEN_URL = "https://appsolves.github.io/appscreen-mcp/"
APPSCREEN_HEADLESS = "true"
```

For visible browser debugging and explicit output paths:

```toml
[mcp_servers.appscreen]
command = "npx"
args = ["-y", "@appsolves/appscreen-mcp@latest"]

[mcp_servers.appscreen.env]
APPSCREEN_URL = "https://appsolves.github.io/appscreen-mcp/"
APPSCREEN_OUTPUT_DIR = "C:/Users/YourName/AppScreenMCP/outputs"
APPSCREEN_BROWSER_PROFILE_DIR = "C:/Users/YourName/AppScreenMCP/browser-profile"
APPSCREEN_HEADLESS = "false"
```

## Claude Desktop example

To use the published npm package:

```json
{
  "mcpServers": {
    "appscreen": {
      "command": "npx",
      "args": ["-y", "@appsolves/appscreen-mcp@latest"],
      "env": {
        "APPSCREEN_URL": "https://appsolves.github.io/appscreen-mcp/",
        "APPSCREEN_HEADLESS": "true"
      }
    }
  }
}
```

For local development from a cloned repository:

```json
{
  "mcpServers": {
    "appscreen": {
      "command": "node",
      "args": ["/absolute/path/to/appscreen-mcp/mcp-server/dist/index.js"],
      "env": {
        "APPSCREEN_URL": "http://localhost:8000",
        "APPSCREEN_OUTPUT_DIR": "/absolute/path/to/appscreen-mcp/mcp-server/outputs",
        "APPSCREEN_HEADLESS": "false"
      }
    }
  }
}
```

## Main tools

- `appscreen_initialize`
- `appscreen_get_usage_guide`
- `appscreen_get_capabilities`
- `appscreen_get_state`
- `appscreen_create_project`
- `appscreen_switch_project`
- `appscreen_rename_project`
- `appscreen_duplicate_project`
- `appscreen_delete_current_project`
- `appscreen_set_output_size`
- `appscreen_set_languages`
- `appscreen_select_screenshot`
- `appscreen_add_blank_screenshot`
- `appscreen_add_screenshot`
- `appscreen_set_localized_screenshot_image`
- `appscreen_remove_screenshot`
- `appscreen_duplicate_screenshot`
- `appscreen_set_background`
- `appscreen_set_background_image`
- `appscreen_set_device_settings`
- `appscreen_apply_position_preset`
- `appscreen_set_text`
- `appscreen_add_text_element`
- `appscreen_add_emoji_element`
- `appscreen_add_icon_element`
- `appscreen_add_graphic_element`
- `appscreen_update_element`
- `appscreen_delete_element`
- `appscreen_add_popout`
- `appscreen_update_popout`
- `appscreen_delete_popout`
- `appscreen_apply_style_to_all`
- `appscreen_create_screenshot_set`
- `appscreen_patch_state`
- `appscreen_capture_editor_preview`
- `appscreen_export_current_png`
- `appscreen_export_all_zip`
- `appscreen_demo_run_cable_launch_recipe`
- `appscreen_raw_bridge_call`

## Recommended workflow for agents

For production App Store or Google Play screenshot sets with different captions per screenshot, use:

1. `appscreen_initialize`
2. `appscreen_get_usage_guide`
3. `appscreen_get_capabilities`
4. `appscreen_create_screenshot_set`
5. `appscreen_capture_editor_preview` if visual editor inspection is needed
6. `appscreen_export_all_zip` if the ZIP was not already exported by `appscreen_create_screenshot_set`

Do not use `appscreen_demo_run_cable_launch_recipe` for production multi-screen sets. It is a legacy/demo shortcut that applies one shared headline/subheadline map across all screenshots.

## File inputs

Tools that accept images can receive either:

- `filePath`: a local path readable by the MCP server process
- `dataUrl`: a `data:image/*;base64,...` string
- `base64` plus `mimeType`

Exports return base64 data and, when `saveToFile` is true, write files into `APPSCREEN_OUTPUT_DIR`.

## Typical agent prompt

```txt
Use AppScreen MCP.

First call appscreen_get_usage_guide.

Then create a production screenshot set:
- projectName: "My App Launch"
- outputDevice: "iphone-6.9"
- languages: ["en", "de"]
- use a polished blue-purple gradient background
- use centered phone mockups with a slight rotation
- upload these local screenshot paths
- give every screenshot different English and German headline/subheadline text
- export all languages as ZIP
- capture an editor preview
- return the output file paths
```

## How it works

The MCP server starts a Playwright-controlled Chromium instance and opens the AppScreen frontend. The frontend exposes a stable automation bridge at:

```js
window.AppScreenMCP
```

The MCP server calls that bridge directly from the browser context. This keeps automation reliable because the server does not depend on fragile button labels, CSS selectors, or UI layout details.

The browser profile is persistent by default, so AppScreen's IndexedDB data can survive MCP restarts. Exported PNG/ZIP files are saved separately to `APPSCREEN_OUTPUT_DIR`.

## License

MIT License.