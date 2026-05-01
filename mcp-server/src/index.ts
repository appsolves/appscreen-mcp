#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import crypto from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { z } from 'zod';

const DEFAULT_APP_URL = process.env.APPSCREEN_URL ?? 'https://appsolves.github.io/appscreen-mcp/';
const OUTPUT_DIR =
  process.env.APPSCREEN_OUTPUT_DIR ??
  path.join(os.homedir(), 'AppScreenMCP', 'outputs');
const HEADLESS = process.env.APPSCREEN_HEADLESS !== 'false';
const BROWSER_TIMEOUT_MS = Number(process.env.APPSCREEN_BROWSER_TIMEOUT_MS ?? 60_000);

type Json = Record<string, unknown>;

type BridgeResponse<T = unknown> = {
  ok: boolean;
  error?: string;
  result?: T;
  [key: string]: unknown;
};

let browser: Browser | null = null;
let page: Page | null = null;
let currentUrl = DEFAULT_APP_URL;

const server = new McpServer({
  name: 'appscreen-mcp',
  version: '1.0.0',
});

function text(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function toToolError(error: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

async function ensureOutputDir() {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

function extensionForMime(mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('zip')) return 'zip';
  return 'bin';
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'artifact';
}

function normalizeDataUrl(input: { filePath?: string; dataUrl?: string; base64?: string; mimeType?: string }) {
  if (input.dataUrl) return input.dataUrl;
  if (input.base64) return `data:${input.mimeType ?? 'image/png'};base64,${input.base64}`;
  throw new Error('Expected filePath, dataUrl, or base64.');
}

async function imageInputToDataUrl(input: { filePath?: string; dataUrl?: string; base64?: string; mimeType?: string }) {
  if (input.filePath) {
    const absolute = path.resolve(input.filePath);
    const buffer = await readFile(absolute);
    const ext = path.extname(absolute).slice(1).toLowerCase();
    const mimeType = input.mimeType ?? (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png');
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
  return normalizeDataUrl(input);
}

async function saveBase64Artifact(base64: string, fileName: string, mimeType: string) {
  await ensureOutputDir();
  const resolvedName = safeName(fileName || `appscreen-${crypto.randomUUID()}.${extensionForMime(mimeType)}`);
  const outputPath = path.join(OUTPUT_DIR, resolvedName);
  await writeFile(outputPath, Buffer.from(base64, 'base64'));
  return outputPath;
}

async function getPage(url = currentUrl) {
  if (!browser) {
    browser = await chromium.launch({ headless: HEADLESS });
  }

  if (!page || page.isClosed()) {
    page = await browser.newPage({ acceptDownloads: true });
    page.setDefaultTimeout(BROWSER_TIMEOUT_MS);
  }

  if (page.url() === 'about:blank' || page.url() !== url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: BROWSER_TIMEOUT_MS });
  }

  await page.waitForFunction(() => Boolean((window as any).AppScreenMCP), undefined, { timeout: BROWSER_TIMEOUT_MS });
  return page;
}

async function bridge<T = unknown>(method: string, args: Json = {}) {
  const p = await getPage();
  const response = await p.evaluate(
    async ({ method, args }) => {
      const api = (window as any).AppScreenMCP;
      if (!api) throw new Error('window.AppScreenMCP is not available.');
      if (typeof api[method] !== 'function') throw new Error(`Unknown AppScreenMCP method: ${method}`);
      return await api[method](args);
    },
    { method, args },
  ) as BridgeResponse<T>;

  if (!response || response.ok !== true) {
    throw new Error(response?.error ?? `AppScreenMCP.${method} failed.`);
  }

  if ('result' in response && Object.keys(response).length <= 2) return response.result as T;
  const { ok: _ok, ...rest } = response;
  return rest as T;
}

const maybeFileImage = {
  filePath: z.string().optional().describe('Local image file path readable by the MCP server.'),
  dataUrl: z.string().optional().describe('data:image/*;base64,... image data URL.'),
  base64: z.string().optional().describe('Raw base64 image data.'),
  mimeType: z.string().optional().describe('MIME type for base64 input, for example image/png.'),
};

const indexArg = z.number().int().min(0).optional();

function registerTool<T extends z.ZodRawShape>(
  name: string,
  description: string,
  schema: T,
  handler: (args: z.infer<z.ZodObject<T>>) => Promise<unknown>,
) {
  const callback = async (args: unknown) => {
    try {
      return text(await handler(args as z.infer<z.ZodObject<T>>));
    } catch (error) {
      return toToolError(error);
    }
  };

  server.registerTool(
    name,
    {
      description,
      inputSchema: schema,
    } as any,
    callback as any,
  );
}

registerTool(
  'appscreen_initialize',
  'Launch or reconnect to the AppScreen browser session and verify that the automation bridge is ready.',
  {
    url: z.string().url().optional().describe('App URL to control. Defaults to APPSCREEN_URL or http://localhost:8000.'),
  },
  async ({ url }) => {
    if (url) currentUrl = url;
    const p = await getPage(currentUrl);
    const health = await bridge('health');
    return { ok: true, url: p.url(), outputDir: OUTPUT_DIR, headless: HEADLESS, health };
  },
);

registerTool('appscreen_get_capabilities', 'List controllable AppScreen features, output sizes, background types, and support flags.', {}, async () => bridge('getCapabilities'));

registerTool(
  'appscreen_get_state',
  'Read the current AppScreen project state. Runtime HTMLImageElement objects are intentionally omitted.',
  { includeScreenshots: z.boolean().default(true) },
  async (args) => bridge('getState', args),
);

registerTool('appscreen_create_project', 'Create and switch to a new project.', { name: z.string().min(1) }, async (args) => bridge('createProject', args));
registerTool('appscreen_switch_project', 'Switch to an existing project by id.', { projectId: z.string().min(1) }, async (args) => bridge('switchProject', args));
registerTool('appscreen_rename_project', 'Rename the current project.', { name: z.string().min(1) }, async (args) => bridge('renameProject', args));
registerTool('appscreen_duplicate_project', 'Duplicate a project.', { sourceProjectId: z.string().optional(), name: z.string().optional() }, async (args) => bridge('duplicateProject', args));
registerTool('appscreen_delete_current_project', 'Delete the current project and switch to another available project.', {}, async () => bridge('deleteCurrentProject'));

registerTool(
  'appscreen_set_output_size',
  'Set the target output size. Use custom with width and height for arbitrary dimensions.',
  {
    device: z.enum(['iphone-6.9', 'iphone-6.7', 'iphone-6.5', 'iphone-5.5', 'ipad-12.9', 'ipad-11', 'android-phone', 'android-phone-hd', 'android-tablet-7', 'android-tablet-10', 'web-og', 'web-twitter', 'web-hero', 'web-feature', 'custom']),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
  },
  async (args) => bridge('setOutputSize', args),
);

registerTool(
  'appscreen_set_languages',
  'Configure project languages and the active language.',
  {
    languages: z.array(z.string().min(2)).min(1),
    currentLanguage: z.string().min(2).optional(),
  },
  async (args) => bridge('setLanguages', args),
);

registerTool('appscreen_select_screenshot', 'Select a screenshot by zero-based index.', { index: z.number().int().min(0) }, async (args) => bridge('selectScreenshot', args));
registerTool('appscreen_add_blank_screenshot', 'Add a blank screenshot slot.', { name: z.string().optional(), language: z.string().optional(), deviceType: z.string().optional() }, async (args) => bridge('addBlankScreenshot', args));

registerTool(
  'appscreen_add_screenshot',
  'Upload/add a screenshot image from a local file, data URL, or base64 payload.',
  {
    ...maybeFileImage,
    name: z.string().optional(),
    language: z.string().optional(),
    deviceType: z.string().optional(),
    replaceIndex: z.number().int().min(0).optional(),
  },
  async (args) => {
    const dataUrl = await imageInputToDataUrl(args);
    return bridge('addScreenshotFromDataUrl', { ...args, dataUrl });
  },
);

registerTool(
  'appscreen_set_localized_screenshot_image',
  'Set or replace the image for a specific screenshot and language.',
  {
    ...maybeFileImage,
    index: indexArg,
    language: z.string().min(2),
    name: z.string().optional(),
    deviceType: z.string().optional(),
  },
  async (args) => {
    const dataUrl = await imageInputToDataUrl(args);
    return bridge('setLocalizedScreenshotImage', { ...args, dataUrl });
  },
);

registerTool('appscreen_remove_screenshot', 'Remove a screenshot by zero-based index.', { index: z.number().int().min(0) }, async (args) => bridge('removeScreenshot', args));
registerTool('appscreen_duplicate_screenshot', 'Duplicate a screenshot by index.', { index: indexArg }, async (args) => bridge('duplicateScreenshot', args));

registerTool(
  'appscreen_set_background',
  'Set gradient, solid, noise, blur, overlay, and other background settings for a screenshot.',
  {
    index: indexArg,
    background: z.record(z.string(), z.any()).describe('Background patch. Examples: {type:"solid",solid:"#111827"} or {type:"gradient",gradient:{angle:135,stops:[...]}}'),
  },
  async (args) => bridge('setBackground', args),
);

registerTool(
  'appscreen_set_background_image',
  'Set an uploaded image as the screenshot background.',
  {
    ...maybeFileImage,
    index: indexArg,
    fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
    blur: z.number().default(0),
    overlayColor: z.string().default('#000000'),
    overlayOpacity: z.number().min(0).max(100).default(0),
  },
  async (args) => {
    const dataUrl = await imageInputToDataUrl(args);
    return bridge('setBackgroundImage', { ...args, dataUrl });
  },
);

registerTool(
  'appscreen_set_device_settings',
  'Patch 2D/3D mockup settings: scale, x, y, rotation, perspective, corner radius, shadow, frame, use3D, device3D, rotation3D.',
  {
    index: indexArg,
    settings: z.record(z.string(), z.any()),
  },
  async (args) => bridge('setDeviceSettings', args),
);

registerTool('appscreen_apply_position_preset', 'Apply one of the app position presets to the selected screenshot.', { index: indexArg, preset: z.string().min(1) }, async (args) => bridge('applyPositionPreset', args));

registerTool(
  'appscreen_set_text',
  'Set headline/subheadline text and styling. headline/subheadline may be strings or language maps like {en:"...",de:"..."}.',
  {
    index: indexArg,
    headline: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
    subheadline: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
    language: z.string().optional(),
    settings: z.record(z.string(), z.any()).default({}),
  },
  async (args) => bridge('setText', args),
);

registerTool('appscreen_add_text_element', 'Add a movable text element overlay.', { index: indexArg, text: z.string().default('Text'), settings: z.record(z.string(), z.any()).default({}) }, async (args) => bridge('addTextElement', args));
registerTool('appscreen_add_emoji_element', 'Add a movable emoji overlay.', { index: indexArg, emoji: z.string().default('✨'), name: z.string().optional(), settings: z.record(z.string(), z.any()).default({}) }, async (args) => bridge('addEmojiElement', args));
registerTool('appscreen_add_icon_element', 'Add a Lucide icon overlay.', { index: indexArg, iconName: z.string().default('star'), settings: z.record(z.string(), z.any()).default({}) }, async (args) => bridge('addIconElement', args));

registerTool(
  'appscreen_add_graphic_element',
  'Add a movable image/graphic overlay from file, data URL, or base64.',
  {
    ...maybeFileImage,
    index: indexArg,
    name: z.string().optional(),
    settings: z.record(z.string(), z.any()).default({}),
  },
  async (args) => {
    const dataUrl = await imageInputToDataUrl(args);
    return bridge('addGraphicElementFromDataUrl', { ...args, dataUrl });
  },
);

registerTool('appscreen_update_element', 'Patch an existing overlay element by id.', { index: indexArg, id: z.string().min(1), patch: z.record(z.string(), z.any()) }, async (args) => bridge('updateElement', args));
registerTool('appscreen_delete_element', 'Delete an overlay element by id.', { index: indexArg, id: z.string().min(1) }, async (args) => bridge('deleteElement', args));
registerTool('appscreen_add_popout', 'Add a popout/callout crop element.', { index: indexArg, patch: z.record(z.string(), z.any()).default({}) }, async (args) => bridge('addPopout', args));
registerTool('appscreen_update_popout', 'Patch an existing popout/callout by id.', { index: indexArg, id: z.string().min(1), patch: z.record(z.string(), z.any()) }, async (args) => bridge('updatePopout', args));
registerTool('appscreen_delete_popout', 'Delete a popout/callout by id.', { index: indexArg, id: z.string().min(1) }, async (args) => bridge('deletePopout', args));

registerTool(
  'appscreen_apply_style_to_all',
  'Copy style settings from one screenshot to all other screenshots.',
  {
    sourceIndex: indexArg,
    includeText: z.boolean().default(true),
    includeBackground: z.boolean().default(true),
    includeDevice: z.boolean().default(true),
    includeElements: z.boolean().default(true),
    includePopouts: z.boolean().default(true),
  },
  async (args) => bridge('applyStyleToAll', args),
);

registerTool(
  'appscreen_patch_state',
  'Advanced escape hatch: deep-merge a patch into the app state. Use only when no higher-level tool fits.',
  { patch: z.record(z.string(), z.any()) },
  async (args) => bridge('patchState', args),
);

registerTool(
  'appscreen_export_current_png',
  'Render the selected screenshot as PNG. Returns base64 and optionally saves it to APPSCREEN_OUTPUT_DIR.',
  {
    language: z.string().optional(),
    saveToFile: z.boolean().default(true),
    fileName: z.string().optional(),
  },
  async ({ saveToFile, fileName, ...args }) => {
    const exported = await bridge<{ fileName: string; mimeType: string; base64: string; dataUrl: string }>('renderCurrentPng', args);
    const outputPath = saveToFile ? await saveBase64Artifact(exported.base64, fileName ?? exported.fileName, exported.mimeType) : undefined;
    return { ...exported, outputPath };
  },
);

registerTool(
  'appscreen_export_all_zip',
  'Export all screenshots as a ZIP. Can export current language only, selected languages, or all project languages.',
  {
    languages: z.array(z.string()).optional(),
    currentLanguageOnly: z.boolean().default(false),
    saveToFile: z.boolean().default(true),
    fileName: z.string().optional(),
  },
  async ({ saveToFile, fileName, ...args }) => {
    const exported = await bridge<{ fileName: string; mimeType: string; base64: string; dataUrl: string }>('exportAllZip', args);
    const outputPath = saveToFile ? await saveBase64Artifact(exported.base64, fileName ?? exported.fileName, exported.mimeType) : undefined;
    return { ...exported, outputPath };
  },
);

registerTool(
  'appscreen_run_cable_launch_recipe',
  'End-to-end sample workflow: create Cable Launch, upload screenshots, configure English/German text, blue-purple gradient, centered rotated phone, and export all languages as ZIP.',
  {
    screenshots: z.array(z.object({
      ...maybeFileImage,
      name: z.string().optional(),
      language: z.string().optional(),
      deviceType: z.string().optional(),
    })).min(1),
    projectName: z.string().default('Cable Launch'),
    languages: z.array(z.string()).default(['en', 'de']),
    headline: z.record(z.string(), z.string()).optional(),
    subheadline: z.record(z.string(), z.string()).optional(),
    saveToFile: z.boolean().default(true),
    fileName: z.string().optional(),
  },
  async ({ screenshots, saveToFile, fileName, ...args }) => {
    const hydratedScreenshots = await Promise.all(screenshots.map(async (s) => ({ ...s, dataUrl: await imageInputToDataUrl(s) })));
    const exported = await bridge<{ fileName: string; mimeType: string; base64: string; dataUrl: string }>('runCableLaunchRecipe', { ...args, screenshots: hydratedScreenshots });
    const outputPath = saveToFile ? await saveBase64Artifact(exported.base64, fileName ?? exported.fileName, exported.mimeType) : undefined;
    return { ...exported, outputPath };
  },
);

registerTool(
  'appscreen_raw_bridge_call',
  'Advanced escape hatch: call any method exposed by window.AppScreenMCP with JSON arguments.',
  {
    method: z.string().min(1),
    args: z.record(z.string(), z.any()).default({}),
  },
  async ({ method, args }) => bridge(method, args),
);

process.on('SIGINT', async () => {
  await browser?.close().catch(() => undefined);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await browser?.close().catch(() => undefined);
  process.exit(0);
});

const transport = new StdioServerTransport();
await server.connect(transport);
