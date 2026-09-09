import { createSeedDesk, type DeskState, ERROR_PREFIX, fileRequest } from './desk';
import { registerDeskTools } from './register-tools';
import { renderDesk, setStatus } from './render-desk';

const READY = 'true';
const MISSING = 'missing';
const REGISTERED = 'registered';

type AgentSubmitEvent = SubmitEvent & {
  agentInvoked?: boolean;
  respondWith?: (result: Promise<string>) => void;
};

type ToolLifecycleEvent = Event & {
  toolName?: string;
};

function requireElement<T extends HTMLElement>(id: string, ctor: new () => T): T {
  const element = document.querySelector(`#${id}`);
  if (!(element instanceof ctor)) {
    throw new Error(`Missing #${id}`);
  }
  return element;
}

function readField(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
    return field.value;
  }
  return '';
}

function respond(event: AgentSubmitEvent, message: string): void {
  if (typeof event.respondWith === 'function') {
    event.respondWith(Promise.resolve(message));
  }
}

function clearTextFields(form: HTMLFormElement): void {
  for (const field of form.elements) {
    if (field instanceof HTMLInputElement && field.type !== 'submit') {
      field.value = '';
    }
  }
}

function bindRequestForm(
  form: HTMLFormElement,
  readState: () => DeskState,
  writeState: (state: DeskState, message: string) => void,
): void {
  window.addEventListener('toolactivated', (event) => {
    if ((event as ToolLifecycleEvent).toolName === 'file_request') {
      form.dataset.toolActive = 'true';
    }
  });
  window.addEventListener('toolcancel', () => {
    delete form.dataset.toolActive;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const agentEvent = event as AgentSubmitEvent;
    const result = fileRequest(readState(), {
      details: readField(form, 'details'),
      name: readField(form, 'name'),
      topic: readField(form, 'topic'),
    });
    writeState(result.state, result.message);
    if (agentEvent.agentInvoked === true) {
      respond(agentEvent, result.message);
      delete form.dataset.toolActive;
      if (!result.message.startsWith(ERROR_PREFIX)) {
        clearTextFields(form);
      }
      return;
    }
    if (!result.message.startsWith(ERROR_PREFIX)) {
      form.reset();
    }
  });
}

async function start(): Promise<void> {
  const appointments = requireElement('appointments', HTMLUListElement);
  const requests = requireElement('requests', HTMLUListElement);
  const visit = requireElement('visit', HTMLElement);
  const steps = requireElement('visit-steps', HTMLOListElement);
  const status = requireElement('status', HTMLElement);
  const form = requireElement('file-request', HTMLFormElement);

  let state = createSeedDesk();

  const paint = (message: string): void => {
    renderDesk(state, appointments, requests, visit, steps);
    setStatus(status, message);
  };

  const writeState = (next: DeskState, message: string): void => {
    state = next;
    paint(message);
  };

  paint('Front desk ready.');
  bindRequestForm(form, () => state, writeState);

  const modelContext = document.modelContext;
  if (!modelContext) {
    document.body.dataset.webmcp = MISSING;
    document.body.dataset.deskReady = READY;
    setStatus(status, 'WebMCP is not available in this browser.');
    return;
  }

  await registerDeskTools(modelContext, () => state, writeState);

  document.body.dataset.webmcp = REGISTERED;
  document.body.dataset.deskReady = READY;
}

void start();
