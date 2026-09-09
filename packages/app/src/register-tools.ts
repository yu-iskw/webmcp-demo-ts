import { bookSlot, confirmVisit, ERROR_PREFIX, listSlots, startVisit } from './desk';

import type { DeskState } from './desk';
import type { ModelContext } from './webmcp';

const START_VISIT = 'start_visit';
const LIST_SLOTS = 'list_slots';
const BOOK_SLOT = 'book_slot';
const CONFIRM_VISIT = 'confirm_visit';

const openSlotSchema = {
  additionalProperties: false,
  properties: {},
  type: 'object',
} as const;

const bookSlotSchema = {
  additionalProperties: false,
  properties: {
    slotId: {
      description: 'Open slot id from list_slots, such as slot-1000.',
      type: 'string',
    },
  },
  required: ['slotId'],
  type: 'object',
} as const;

function isCancelled(options: { signal?: AbortSignal } | undefined): boolean {
  return options?.signal?.aborted === true;
}

function readSlotId(args: Record<string, unknown>): string | undefined {
  const slotId = args.slotId;
  return typeof slotId === 'string' ? slotId : undefined;
}

export async function registerDeskTools(
  modelContext: ModelContext,
  readState: () => DeskState,
  writeState: (state: DeskState, message: string) => void,
): Promise<void> {
  await modelContext.registerTool({
    annotations: { consequentialHint: false, readOnlyHint: false },
    description: 'Start a desk visit. Required before list_slots. Returns visit-1.',
    execute: (_args, options) => {
      if (isCancelled(options)) {
        return `${ERROR_PREFIX}Tool execution was cancelled.`;
      }
      const result = startVisit(readState());
      writeState(result.state, result.message);
      return result.message;
    },
    inputSchema: openSlotSchema,
    name: START_VISIT,
  });

  await modelContext.registerTool({
    annotations: { readOnlyHint: false },
    description: 'List open appointment slots for the started visit. Call start_visit first.',
    execute: (_args, options) => {
      if (isCancelled(options)) {
        return `${ERROR_PREFIX}Tool execution was cancelled.`;
      }
      const result = listSlots(readState());
      writeState(result.state, result.message);
      return result.message;
    },
    inputSchema: openSlotSchema,
    name: LIST_SLOTS,
  });

  await modelContext.registerTool({
    annotations: { consequentialHint: true },
    description: 'Book one open slot onto the visit. Call start_visit, then list_slots, first.',
    execute: (args, options) => {
      if (isCancelled(options)) {
        return `${ERROR_PREFIX}Tool execution was cancelled.`;
      }
      const slotId = readSlotId(args);
      if (!slotId) {
        return `${ERROR_PREFIX}slotId is required. Call list_slots and pass an open id.`;
      }
      const result = bookSlot(readState(), slotId);
      writeState(result.state, result.message);
      return result.message;
    },
    inputSchema: bookSlotSchema,
    name: BOOK_SLOT,
  });

  await modelContext.registerTool({
    annotations: { consequentialHint: true },
    description: 'Confirm the visit after book_slot and file_request. Does not book or file.',
    execute: (_args, options) => {
      if (isCancelled(options)) {
        return `${ERROR_PREFIX}Tool execution was cancelled.`;
      }
      const result = confirmVisit(readState());
      writeState(result.state, result.message);
      return result.message;
    },
    inputSchema: openSlotSchema,
    name: CONFIRM_VISIT,
  });
}
