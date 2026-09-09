import { type Page } from 'playwright';

import { baseUrl, executeTool, launchWebmcpChrome, waitForDesk } from './webmcp-browser.ts';

const APPOINTMENTS = 'Appointments';
const REQUESTS = 'Requests';
const REQUESTER = 'Ada Lovelace';
const REQUEST_DETAILS = 'Need a visitor badge';
const BOOK_SLOT = 'book_slot';
const CONFIRM_VISIT = 'confirm_visit';
const FILE_REQUEST = 'file_request';
const LIST_SLOTS = 'list_slots';
const START_VISIT = 'start_visit';
const ERROR_PREFIX = 'ERROR: ';

type ToolSummary = {
  annotations?: {
    consequentialHint?: boolean;
    readOnlyHint?: boolean;
  };
  inputSchema?: unknown;
  name: string;
};

type CheckReport = {
  baseUrl: string;
  failedCheck?: string;
  lastOutput?: string | null;
  message?: string;
  ok: boolean;
  tools: string[];
};

type PageModelContext = {
  executeTool: (tool: ToolSummary, input: string) => Promise<string | null>;
  getTools: () => Promise<ToolSummary[]>;
};

function reportFailure(
  tools: string[],
  failedCheck: string,
  message: string,
  lastOutput?: string | null,
): CheckReport {
  return {
    baseUrl: baseUrl(),
    failedCheck,
    lastOutput,
    message,
    ok: false,
    tools,
  };
}

async function hasModelContext(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const context = (document as Document & { modelContext?: PageModelContext }).modelContext;
    return typeof context?.getTools === 'function' && typeof context.executeTool === 'function';
  });
}

async function listTools(page: Page): Promise<ToolSummary[]> {
  return page.evaluate(async () => {
    const context = (document as Document & { modelContext?: PageModelContext }).modelContext;
    if (!context?.getTools) {
      throw new Error('document.modelContext.getTools is missing');
    }
    const tools = await context.getTools();
    return tools.map((tool) => ({
      annotations: tool.annotations,
      inputSchema: tool.inputSchema,
      name: tool.name,
    }));
  });
}

async function waitForTools(page: Page, names: string[]): Promise<ToolSummary[]> {
  const deadline = Date.now() + 8000;
  let latest: ToolSummary[] = [];
  while (Date.now() < deadline) {
    latest = await listTools(page);
    if (names.every((name) => latest.some((tool) => tool.name === name))) {
      return latest;
    }
    await page.waitForTimeout(100);
  }
  return latest;
}

async function appointmentText(page: Page): Promise<string> {
  return page.getByRole('list', { name: APPOINTMENTS }).innerText();
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function fileSupportRequest(page: Page): Promise<string | null> {
  let failure: unknown;
  const pending = executeTool(page, FILE_REQUEST, {
    details: REQUEST_DETAILS,
    name: REQUESTER,
    topic: 'access',
  }).then(
    (value) => value,
    (error: unknown) => {
      failure = error;
      return null;
    },
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('file_request did not finish within 8s'));
    }, 8000);
  });

  try {
    const value = await Promise.race([pending, timedOut]);
    if (failure !== undefined) {
      throw asError(failure);
    }
    const requests = await page.getByRole('list', { name: REQUESTS }).innerText();
    if (!requests.includes(REQUESTER)) {
      throw new Error('file_request finished without a visible request');
    }
    return value;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function firstOpenSlotId(output: string): string | undefined {
  const parsed: unknown = JSON.parse(output);
  if (!Array.isArray(parsed)) {
    return undefined;
  }
  const first: unknown = parsed[0];
  if (typeof first !== 'object' || first === null || !('id' in first)) {
    return undefined;
  }
  const id = first.id;
  return typeof id === 'string' ? id : undefined;
}

async function checkBooking(
  page: Page,
  names: string[],
  listed: string,
): Promise<CheckReport | undefined> {
  const before = await appointmentText(page);
  const slotId = firstOpenSlotId(listed);
  if (!slotId) {
    return reportFailure(
      names,
      'list-slots',
      'list_slots output did not include a slot id.',
      listed,
    );
  }

  const booked = await executeTool(page, BOOK_SLOT, { slotId });
  const afterBook = await appointmentText(page);
  if (
    !booked ||
    booked.startsWith(ERROR_PREFIX) ||
    afterBook === before ||
    !afterBook.includes('booked')
  ) {
    return reportFailure(
      names,
      'book-slot',
      'book_slot did not book a slot or update the appointment list.',
      booked,
    );
  }

  const duplicate = await executeTool(page, BOOK_SLOT, { slotId });
  const afterDuplicate = await appointmentText(page);
  if (!duplicate?.startsWith(ERROR_PREFIX) || afterDuplicate !== afterBook) {
    return reportFailure(
      names,
      'duplicate-book',
      'A second book_slot call must return an actionable error and leave the list unchanged.',
      duplicate,
    );
  }

  return undefined;
}

async function checkFileRequest(page: Page, names: string[]): Promise<CheckReport> {
  const filed = await fileSupportRequest(page);
  const requests = await page.getByRole('list', { name: REQUESTS }).innerText();
  if (!filed || filed.startsWith(ERROR_PREFIX) || !requests.includes(REQUESTER)) {
    return reportFailure(
      names,
      'file-request',
      'file_request did not return a string and add a visible request.',
      filed,
    );
  }

  return {
    baseUrl: baseUrl(),
    lastOutput: filed,
    ok: true,
    tools: names,
  };
}

async function checkConfirm(page: Page, names: string[], filed: CheckReport): Promise<CheckReport> {
  const confirmed = await executeTool(page, CONFIRM_VISIT, {});
  const visit = await page.locator('#visit-summary').innerText();
  if (!confirmed?.startsWith('Confirmed visit-1') || visit !== 'visit-1 confirmed') {
    return reportFailure(
      names,
      'confirm-visit',
      'confirm_visit did not confirm the visit after the request.',
      confirmed,
    );
  }

  return { ...filed, lastOutput: confirmed };
}

async function checkSequence(page: Page, names: string[]): Promise<CheckReport | undefined> {
  const tooEarly = await executeTool(page, BOOK_SLOT, { slotId: 'slot-1000' });
  const stillIdle = await page.locator('#visit-summary').innerText();
  if (!tooEarly?.startsWith(ERROR_PREFIX) || stillIdle !== 'No visit yet') {
    return reportFailure(
      names,
      'sequence-book',
      'book_slot before start_visit must fail without changing the visit.',
      tooEarly,
    );
  }

  const started = await executeTool(page, START_VISIT, {});
  if (!started?.includes('visit-1') || started.startsWith(ERROR_PREFIX)) {
    return reportFailure(names, 'start-visit', 'start_visit did not start visit-1.', started);
  }

  return undefined;
}

async function checkDesk(page: Page): Promise<CheckReport> {
  await waitForDesk(page);

  const available = await hasModelContext(page);
  if (!available) {
    return reportFailure(
      [],
      'model-context',
      'document.modelContext is missing. Launch headed Chrome with --enable-features=WebMCP,WebMCPTesting.',
    );
  }

  const required = [START_VISIT, LIST_SLOTS, BOOK_SLOT, FILE_REQUEST, CONFIRM_VISIT];
  const tools = await waitForTools(page, required);
  const names = tools.map((tool) => tool.name).sort((left, right) => left.localeCompare(right));
  for (const name of required) {
    if (!names.includes(name)) {
      return reportFailure(names, 'tool-discovery', `Missing tool ${name}.`);
    }
  }

  const sequence = await checkSequence(page, names);
  if (sequence) {
    return sequence;
  }

  const listed = await executeTool(page, LIST_SLOTS, {});
  if (!listed?.includes('slot-1000')) {
    return reportFailure(
      names,
      'list-slots',
      'list_slots did not return the seeded open slot.',
      listed,
    );
  }

  const booking = await checkBooking(page, names, listed);
  if (booking) {
    return booking;
  }

  const beforeRequest = await executeTool(page, CONFIRM_VISIT, {});
  const requestsBefore = await page.getByRole('list', { name: REQUESTS }).innerText();
  if (!beforeRequest?.includes('file_request') || requestsBefore.includes(REQUESTER)) {
    return reportFailure(
      names,
      'sequence-confirm',
      'confirm_visit before file_request must fail.',
      beforeRequest,
    );
  }

  const filed = await checkFileRequest(page, names);
  if (!filed.ok) {
    return filed;
  }

  return checkConfirm(page, names, filed);
}

async function main(): Promise<void> {
  const browser = await launchWebmcpChrome();
  const page = await browser.newPage();
  try {
    const report = await checkDesk(page);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${JSON.stringify(reportFailure([], 'checker', message), null, 2)}\n`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

void main();
