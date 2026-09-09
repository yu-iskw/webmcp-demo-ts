import { describe, expect, it } from 'vitest';

import {
  bookSlot,
  confirmVisit,
  createSeedDesk,
  ERROR_PREFIX,
  fileRequest,
  formatAppointmentLine,
  formatOpenSlots,
  formatRequestLine,
  formatVisitLine,
  listSlots,
  SLOT_1000,
  startVisit,
} from './desk';

import type { DeskState } from './desk';

const ADA = {
  details: 'Need a visitor badge',
  name: 'Ada Lovelace',
  topic: 'access',
};

function listedVisit(): DeskState {
  return listSlots(startVisit(createSeedDesk()).state).state;
}

describe('front desk', () => {
  it('lists seeded open slots only after a visit is started', () => {
    const seed = createSeedDesk();
    expect(listSlots(seed).message.startsWith(ERROR_PREFIX)).toBe(true);
    expect(listSlots(seed).state).toBe(seed);

    const listed = listSlots(startVisit(seed).state);
    expect(listed.message).toBe(formatOpenSlots(seed));
    expect(listed.message).toContain(SLOT_1000);
    expect(formatAppointmentLine(seed.slots[0])).toBe('10:00 open');
    expect(formatVisitLine(listed.state)).toBe('visit-1 slots listed');
  });

  it('rejects book_slot until start_visit and list_slots have run', () => {
    const seed = createSeedDesk();
    const tooEarly = bookSlot(seed, SLOT_1000);
    expect(tooEarly.message).toContain('Call start_visit first');
    expect(tooEarly.state).toBe(seed);

    const started = startVisit(seed);
    const beforeList = bookSlot(started.state, SLOT_1000);
    expect(beforeList.message).toContain('Call list_slots first');
    expect(beforeList.state).toBe(started.state);
    expect(formatAppointmentLine(beforeList.state.slots[0])).toBe('10:00 open');
  });

  it('books a listed slot and rejects a second booking without changing state', () => {
    const ready = listedVisit();
    const booked = bookSlot(ready, SLOT_1000);

    expect(booked.message).toBe('Booked 10:00 (slot-1000) for visit-1. Next, call file_request.');
    expect(formatAppointmentLine(booked.state.slots[0])).toBe('10:00 booked');
    expect(formatVisitLine(booked.state)).toBe('visit-1 booked slot-1000');

    const duplicate = bookSlot(booked.state, SLOT_1000);
    expect(duplicate.message.startsWith(ERROR_PREFIX)).toBe(true);
    expect(duplicate.message).toContain('already has a slot');
    expect(duplicate.state).toBe(booked.state);
  });

  it('files a request only after booking, then confirms the visit', () => {
    const booked = bookSlot(listedVisit(), SLOT_1000).state;
    const tooEarly = fileRequest(startVisit(createSeedDesk()).state, ADA);
    expect(tooEarly.message).toContain('Call book_slot first');

    const filed = fileRequest(booked, ADA);
    expect(filed.message).toBe('Filed req-1 for Ada Lovelace (access). Next, call confirm_visit.');
    expect(formatRequestLine(filed.state.requests[0])).toBe(
      'req-1 Ada Lovelace access: Need a visitor badge',
    );

    const beforeRequest = confirmVisit(booked);
    expect(beforeRequest.message).toContain('Call file_request first');
    expect(beforeRequest.state).toBe(booked);

    const confirmed = confirmVisit(filed.state);
    expect(confirmed.message).toBe('Confirmed visit-1 for 10:00 with req-1.');
    expect(formatVisitLine(confirmed.state)).toBe('visit-1 confirmed');
    expect(confirmVisit(confirmed.state).state).toBe(confirmed.state);
  });

  it('rejects blank request details after the booking prerequisite is met', () => {
    const booked = bookSlot(listedVisit(), SLOT_1000).state;
    const blank = fileRequest(booked, { details: '  ', name: 'Ada', topic: 'billing' });
    expect(blank.message).toBe(`${ERROR_PREFIX}Details are required.`);
    expect(blank.state.requests).toHaveLength(0);
  });
});
