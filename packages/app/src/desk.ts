export const ERROR_PREFIX = 'ERROR: ';

export const SLOT_1000 = 'slot-1000';
export const SLOT_1100 = 'slot-1100';
export const SLOT_1400 = 'slot-1400';

export const REQUEST_TOPICS = ['access', 'billing', 'other'] as const;

export type RequestTopic = (typeof REQUEST_TOPICS)[number];

export type Slot = {
  booked: boolean;
  id: string;
  label: string;
};

export type SupportRequest = {
  details: string;
  id: string;
  name: string;
  topic: RequestTopic;
};

export type Visit = {
  confirmed: boolean;
  id: string;
  listed: boolean;
  requestId?: string;
  slotId?: string;
};

export type DeskState = {
  nextRequestNumber: number;
  requests: SupportRequest[];
  slots: Slot[];
  visit?: Visit;
};

export type FileRequestInput = {
  details: string;
  name: string;
  topic: string;
};

const TOPIC_SET: ReadonlySet<string> = new Set(REQUEST_TOPICS);

export function createSeedDesk(): DeskState {
  return {
    nextRequestNumber: 1,
    requests: [],
    slots: [
      { booked: false, id: SLOT_1000, label: '10:00' },
      { booked: false, id: SLOT_1100, label: '11:00' },
      { booked: false, id: SLOT_1400, label: '14:00' },
    ],
  };
}

const START_FIRST = `${ERROR_PREFIX}No visit is started. Call start_visit first.`;
const LIST_FIRST = `${ERROR_PREFIX}Slots have not been listed. Call list_slots first.`;
const BOOK_FIRST = `${ERROR_PREFIX}No slot is booked. Call book_slot first.`;
const REQUEST_FIRST = `${ERROR_PREFIX}No request is filed. Call file_request first.`;

export function startVisit(state: DeskState): { message: string; state: DeskState } {
  if (state.visit) {
    return {
      message: `${ERROR_PREFIX}Visit ${state.visit.id} is already started. Call list_slots next.`,
      state,
    };
  }

  return {
    message: 'Started visit-1. Next, call list_slots.',
    state: {
      ...state,
      visit: { confirmed: false, id: 'visit-1', listed: false },
    },
  };
}

export function listSlots(state: DeskState): { message: string; state: DeskState } {
  if (!state.visit) {
    return { message: START_FIRST, state };
  }
  if (state.visit.listed) {
    return { message: formatOpenSlots(state), state };
  }

  return {
    message: formatOpenSlots(state),
    state: { ...state, visit: { ...state.visit, listed: true } },
  };
}

export function listOpenSlots(state: DeskState): Slot[] {
  return state.slots.filter((slot) => !slot.booked);
}

export function formatOpenSlots(state: DeskState): string {
  const open = listOpenSlots(state).map((slot) => ({ id: slot.id, label: slot.label }));
  return JSON.stringify(open);
}

export function formatAppointmentLine(slot: Slot): string {
  const status = slot.booked ? 'booked' : 'open';
  return `${slot.label} ${status}`;
}

export function formatRequestLine(request: SupportRequest): string {
  return `${request.id} ${request.name} ${request.topic}: ${request.details}`;
}

export function bookSlot(state: DeskState, slotId: string): { message: string; state: DeskState } {
  if (!state.visit) {
    return { message: START_FIRST, state };
  }
  if (!state.visit.listed) {
    return { message: LIST_FIRST, state };
  }
  if (state.visit.slotId) {
    return {
      message: `${ERROR_PREFIX}Visit ${state.visit.id} already has a slot. Do not book again.`,
      state,
    };
  }

  const slot = state.slots.find((item) => item.id === slotId);
  if (!slot) {
    return {
      message: `${ERROR_PREFIX}Unknown slot "${slotId}". Call list_slots and use an open id.`,
      state,
    };
  }
  if (slot.booked) {
    return {
      message: `${ERROR_PREFIX}Slot ${slot.id} is already booked. Choose another open slot.`,
      state,
    };
  }

  return {
    message: `Booked ${slot.label} (${slot.id}) for ${state.visit.id}. Next, call file_request.`,
    state: {
      ...state,
      slots: state.slots.map((item) => (item.id === slot.id ? { ...item, booked: true } : item)),
      visit: { ...state.visit, slotId: slot.id },
    },
  };
}

export function isRequestTopic(value: string): value is RequestTopic {
  return TOPIC_SET.has(value);
}

export function fileRequest(
  state: DeskState,
  input: FileRequestInput,
): { message: string; state: DeskState } {
  if (!state.visit) {
    return { message: START_FIRST, state };
  }
  if (!state.visit.slotId) {
    return { message: BOOK_FIRST, state };
  }
  if (state.visit.requestId) {
    return {
      message: `${ERROR_PREFIX}Visit ${state.visit.id} already has a request.`,
      state,
    };
  }

  const name = input.name.trim();
  const details = input.details.trim();
  const topic = input.topic.trim();

  if (name.length === 0) {
    return { message: `${ERROR_PREFIX}Name is required.`, state };
  }
  if (!isRequestTopic(topic)) {
    return {
      message: `${ERROR_PREFIX}Topic must be access, billing, or other.`,
      state,
    };
  }
  if (details.length === 0) {
    return { message: `${ERROR_PREFIX}Details are required.`, state };
  }

  const request: SupportRequest = {
    details,
    id: `req-${String(state.nextRequestNumber)}`,
    name,
    topic,
  };

  return {
    message: `Filed ${request.id} for ${request.name} (${request.topic}). Next, call confirm_visit.`,
    state: {
      ...state,
      nextRequestNumber: state.nextRequestNumber + 1,
      requests: [...state.requests, request],
      visit: { ...state.visit, requestId: request.id },
    },
  };
}

export function confirmVisit(state: DeskState): { message: string; state: DeskState } {
  if (!state.visit) {
    return { message: START_FIRST, state };
  }
  if (!state.visit.slotId) {
    return { message: BOOK_FIRST, state };
  }
  if (!state.visit.requestId) {
    return { message: REQUEST_FIRST, state };
  }
  if (state.visit.confirmed) {
    return { message: `${ERROR_PREFIX}Visit ${state.visit.id} is already confirmed.`, state };
  }

  const slot = state.slots.find((item) => item.id === state.visit?.slotId);
  const label = slot?.label ?? state.visit.slotId;
  return {
    message: `Confirmed ${state.visit.id} for ${label} with ${state.visit.requestId}.`,
    state: { ...state, visit: { ...state.visit, confirmed: true } },
  };
}

export function formatVisitLine(state: DeskState): string {
  const visit = state.visit;
  if (!visit) {
    return 'No visit yet';
  }
  if (visit.confirmed) {
    return `${visit.id} confirmed`;
  }
  if (visit.requestId) {
    return `${visit.id} request ${visit.requestId}`;
  }
  if (visit.slotId) {
    return `${visit.id} booked ${visit.slotId}`;
  }
  if (visit.listed) {
    return `${visit.id} slots listed`;
  }
  return `${visit.id} started`;
}
