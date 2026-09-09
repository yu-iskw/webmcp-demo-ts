import { ERROR_PREFIX, fileRequest } from './desk';

import type { DeskState } from './desk';

const FILE_REQUEST = 'file_request';

type AgentSubmitEvent = SubmitEvent & {
  agentInvoked?: boolean;
  respondWith?: (result: Promise<string>) => void;
};

type ToolLifecycleEvent = Event & {
  toolName?: string;
};

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

export function bindRequestForm(
  form: HTMLFormElement,
  readState: () => DeskState,
  writeState: (state: DeskState, message: string) => void,
): () => void {
  const onToolActivated = (event: Event): void => {
    if ((event as ToolLifecycleEvent).toolName === FILE_REQUEST) {
      form.dataset.toolActive = 'true';
    }
  };

  const onToolCancel = (): void => {
    delete form.dataset.toolActive;
  };

  const onSubmit = (event: Event): void => {
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
  };

  window.addEventListener('toolactivated', onToolActivated);
  window.addEventListener('toolcancel', onToolCancel);
  form.addEventListener('submit', onSubmit);

  return () => {
    window.removeEventListener('toolactivated', onToolActivated);
    window.removeEventListener('toolcancel', onToolCancel);
    form.removeEventListener('submit', onSubmit);
  };
}
