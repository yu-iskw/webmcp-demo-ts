import { formatAppointmentLine, formatRequestLine, formatVisitLine, isSlotBooked } from './desk';

import type { DeskState } from './desk';

export const APPOINTMENTS_LABEL = 'Appointments';
export const REQUESTS_LABEL = 'Requests';

type VisitStepState = 'current' | 'done' | 'waiting';

type VisitStepView = {
  id: string;
  label: string;
  state: VisitStepState;
};

type AppointmentView = {
  booked: boolean;
  id: string;
  line: string;
};

type RequestView = {
  id: string;
  line: string;
};

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

export function visitSummary(state: DeskState): string {
  return formatVisitLine(state);
}

export function visitSteps(state: DeskState): VisitStepView[] {
  const current = STEPS.findIndex((step) => !step.done(state));
  return STEPS.map((step, index) => ({
    id: step.id,
    label: step.label,
    state: step.done(state) ? 'done' : index === current ? 'current' : 'waiting',
  }));
}

export function appointmentViews(state: DeskState): AppointmentView[] {
  return state.slots.map((slot) => {
    const booked = isSlotBooked(state, slot.id);
    return {
      booked,
      id: slot.id,
      line: formatAppointmentLine(slot, booked),
    };
  });
}

export function requestViews(state: DeskState): RequestView[] {
  return state.requests.map((request) => ({
    id: request.id,
    line: formatRequestLine(request),
  }));
}
