import { chromium, type Page } from 'playwright';

const BASE_URL = process.env.WEBMCP_BASE_URL ?? 'http://127.0.0.1:8080';
const SHOT_DIR = process.env.WEBMCP_DEMO_DIR ?? '/tmp/webmcp-demo';
const NO_OUTPUT = 'no output';
const REQUESTER = 'Ada Lovelace';
const SLOT_1000 = 'slot-1000';
const STARTED = 'visit-1 started';
const VISIT_SUMMARY = '#visit-summary';

type ToolSummary = {
  name: string;
};

type PageModelContext = {
  executeTool: (tool: ToolSummary, input: string) => Promise<string | null>;
  getTools: () => Promise<ToolSummary[]>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function showStep(page: Page, title: string, detail: string): Promise<void> {
  await page.evaluate(
    ({ detail, title: stepTitle }) => {
      let banner = document.querySelector('#webmcp-demo');
      if (!(banner instanceof HTMLElement)) {
        banner = document.createElement('aside');
        banner.id = 'webmcp-demo';
        banner.setAttribute(
          'style',
          [
            'position:fixed',
            'right:16px',
            'bottom:16px',
            'z-index:20',
            'max-width:22rem',
            'padding:12px 14px',
            'background:#1c1917',
            'color:#fafaf9',
            'font:14px/1.4 ui-sans-serif,system-ui,sans-serif',
          ].join(';'),
        );
        document.body.append(banner);
      }
      banner.textContent = `${stepTitle} — ${detail}`;
    },
    { detail, title },
  );
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: true });
}

async function executeTool(
  page: Page,
  name: string,
  args: Record<string, string>,
): Promise<string | null> {
  return page.evaluate(
    async ({ argsJson, name: toolName }) => {
      const context = (document as Document & { modelContext?: PageModelContext }).modelContext;
      if (!context) {
        throw new Error('document.modelContext is missing');
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

async function main(): Promise<void> {
  const browser = await chromium.launchPersistentContext('', {
    args: [
      '--enable-features=WebMCP,WebMCPTesting',
      '--no-default-browser-check',
      '--no-first-run',
      '--window-position=40,40',
      '--window-size=1100,900',
    ],
    channel: 'chrome',
    headless: false,
    slowMo: 250,
    viewport: { height: 1040, width: 1040 },
  });
  const page = await browser.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('body[data-desk-ready="true"]').waitFor();
  await showStep(
    page,
    '1. Ready',
    'Sequential visit. Later tools fail until earlier ones succeed.',
  );
  await sleep(700);
  await shot(page, '01-ready');

  const tooEarly = await executeTool(page, 'book_slot', { slotId: SLOT_1000 });
  await showStep(page, '2. book_slot too early', tooEarly ?? NO_OUTPUT);
  await sleep(1000);
  await shot(page, '02-too-early');

  const started = await executeTool(page, 'start_visit', {});
  await page.locator(VISIT_SUMMARY).getByText(STARTED).waitFor();
  await showStep(page, '3. start_visit', started ?? NO_OUTPUT);
  await sleep(900);
  await shot(page, '03-started');

  const listed = await executeTool(page, 'list_slots', {});
  await page.locator(VISIT_SUMMARY).getByText('slots listed').waitFor();
  await showStep(page, '4. list_slots', listed ?? NO_OUTPUT);
  await sleep(900);
  await shot(page, '04-listed');

  const booked = await executeTool(page, 'book_slot', { slotId: SLOT_1000 });
  await page.getByRole('list', { name: 'Appointments' }).getByText('10:00 booked').waitFor();
  await showStep(page, '5. book_slot', booked ?? NO_OUTPUT);
  await sleep(900);
  await shot(page, '05-booked');

  const confirmEarly = await executeTool(page, 'confirm_visit', {});
  await showStep(page, '6. confirm_visit too early', confirmEarly ?? NO_OUTPUT);
  await sleep(1000);
  await shot(page, '06-confirm-too-early');

  await showStep(page, '7. file_request', 'Filing a support request for Ada Lovelace.');
  const pending = executeTool(page, 'file_request', {
    details: 'Need a visitor badge',
    name: REQUESTER,
    topic: 'access',
  });
  await page.getByRole('list', { name: 'Requests' }).getByText(REQUESTER).waitFor();
  const filed = await pending;
  await showStep(page, '7. file_request', filed ?? NO_OUTPUT);
  await sleep(900);
  await shot(page, '07-filed');

  const confirmed = await executeTool(page, 'confirm_visit', {});
  await page.locator(VISIT_SUMMARY).getByText('visit-1 confirmed').waitFor();
  await showStep(page, '8. confirm_visit', confirmed ?? NO_OUTPUT);
  await sleep(1200);
  await shot(page, '08-confirmed');

  process.stdout.write(
    `${JSON.stringify({ confirmed, filed, listed, ok: true, shots: SHOT_DIR, started, tooEarly }, null, 2)}\n`,
  );
  await sleep(180000);
  await browser.close();
}

void main();
