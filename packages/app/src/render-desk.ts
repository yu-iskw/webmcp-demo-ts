import {
  type DeskState,
  formatAppointmentLine,
  formatRequestLine,
  formatVisitLine,
  isSlotBooked,
} from './desk';

const APPOINTMENTS_LABEL = 'Appointments';
const REQUESTS_LABEL = 'Requests';

function clear(node: HTMLElement): void {
  while (node.firstChild) {
    node.firstChild.remove();
  }
}

function appendSlot(list: HTMLElement, line: string, booked: boolean): void {
  const item = document.createElement('li');
  item.dataset.state = booked ? 'booked' : 'open';
  item.textContent = line;
  list.append(item);
}

function appendRequest(list: HTMLElement, line: string): void {
  const item = document.createElement('li');
  item.dataset.state = 'filed';
  item.textContent = line;
  list.append(item);
}

const STEPS = [
  { done: (state: DeskState) => state.visit !== undefined, id: 'start', label: 'Start visit' },
  { done: (state: DeskState) => state.visit?.listed === true, id: 'list', label: 'List slots' },
  { done: (state: DeskState) => state.visit?.slotId !== undefined, id: 'book', label: 'Book slot' },
  {
    done: (state: DeskState) => state.visit?.requestId !== undefined,
    id: 'request',
    label: 'File request',
  },
  {
    done: (state: DeskState) => state.visit?.confirmed === true,
    id: 'confirm',
    label: 'Confirm visit',
  },
] as const;

function appendStep(
  list: HTMLOListElement,
  label: string,
  state: 'done' | 'current' | 'waiting',
): void {
  const item = document.createElement('li');
  item.dataset.state = state;
  item.textContent = label;
  list.append(item);
}

function renderVisit(state: DeskState, visit: HTMLElement, steps: HTMLOListElement): void {
  const summary = visit.querySelector('#visit-summary');
  if (summary instanceof HTMLElement) {
    summary.textContent = formatVisitLine(state);
  }
  clear(steps);
  const current = STEPS.findIndex((step) => !step.done(state));
  STEPS.forEach((step, index) => {
    const stepState = step.done(state) ? 'done' : index === current ? 'current' : 'waiting';
    appendStep(steps, step.label, stepState);
  });
}

export function renderDesk(
  state: DeskState,
  appointments: HTMLElement,
  requests: HTMLElement,
  visit: HTMLElement,
  steps: HTMLOListElement,
): void {
  appointments.ariaLabel = APPOINTMENTS_LABEL;
  requests.ariaLabel = REQUESTS_LABEL;
  renderVisit(state, visit, steps);
  clear(appointments);
  clear(requests);
  for (const slot of state.slots) {
    const booked = isSlotBooked(state, slot.id);
    appendSlot(appointments, formatAppointmentLine(slot, booked), booked);
  }
  if (state.requests.length === 0) {
    const empty = document.createElement('li');
    empty.dataset.state = 'empty';
    empty.textContent = 'No requests yet';
    requests.append(empty);
    return;
  }
  for (const request of state.requests) {
    appendRequest(requests, formatRequestLine(request));
  }
}

export function setStatus(status: HTMLElement, message: string): void {
  status.textContent = message;
}
