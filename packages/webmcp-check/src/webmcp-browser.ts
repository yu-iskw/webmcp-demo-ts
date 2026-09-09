import { chromium, type BrowserContext, type Page } from 'playwright';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8080';

type ToolSummary = {
  name: string;
};

type PageModelContext = {
  executeTool: (tool: ToolSummary, input: string) => Promise<string | null>;
  getTools: () => Promise<ToolSummary[]>;
};

export function baseUrl(): string {
  return process.env.WEBMCP_BASE_URL ?? DEFAULT_BASE_URL;
}

export async function launchWebmcpChrome(): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
    args: [
      '--enable-features=WebMCP,WebMCPTesting',
      '--no-default-browser-check',
      '--no-first-run',
    ],
    channel: 'chrome',
    headless: false,
  });
}

export async function waitForDesk(page: Page): Promise<void> {
  const deadline = Date.now() + 30000;
  let lastError = 'web app did not become reachable';
  while (Date.now() < deadline) {
    try {
      await page.goto(baseUrl(), { waitUntil: 'domcontentloaded' });
      await page.locator('body[data-desk-ready="true"]').waitFor({ timeout: 5000 });
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await page.waitForTimeout(500);
    }
  }
  throw new Error(lastError);
}

export async function executeTool(
  page: Page,
  name: string,
  args: Record<string, string>,
): Promise<string | null> {
  return page.evaluate(
    async ({ argsJson, name: toolName }) => {
      const context = (document as Document & { modelContext?: PageModelContext }).modelContext;
      if (!context) {
        throw new Error('document.modelContext.executeTool is missing');
      }
      const tools = await context.getTools();
      const tool = tools.find((item) => item.name === toolName);
      if (!tool) {
        throw new Error(`tool ${toolName} is not registered`);
      }
      return context.executeTool(tool, argsJson);
    },
    { argsJson: JSON.stringify(args), name },
  );
}
