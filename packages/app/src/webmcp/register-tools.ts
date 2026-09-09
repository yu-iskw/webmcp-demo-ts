import { bookSlot, confirmVisit, ERROR_PREFIX, listSlots, startVisit } from '../desk/desk';

import type { ModelContext, ToolExecuteOptions } from './webmcp';
import type { DeskState } from '../desk/desk';

const START_VISIT = 'start_visit';
const LIST_SLOTS = 'list_slots';
const BOOK_SLOT = 'book_slot';
const CONFIRM_VISIT = 'confirm_visit';

const emptyInputSchema = {
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

function isCancelled(options: ToolExecuteOptions | undefined): boolean {
  return options?.signal?.aborted === true;
}

function runTransition(
  readState: () => DeskState,
  writeState: (state: DeskState, message: string) => void,
  options: ToolExecuteOptions | undefined,
  transition: (state: DeskState) => { message: string; state: DeskState },
): string {
  if (isCancelled(options)) {
    return `${ERROR_PREFIX}Tool execution was cancelled.`;
  }
  const result = transition(readState());
  writeState(result.state, result.message);
  return result.message;
}

function readSlotId(args: Record<string, unknown>): string | undefined {
  const slotId = args.slotId;
  return typeof slotId === 'string' ? slotId : undefined;
}

export async function registerDeskTools(
  modelContext: ModelContext,
  readState: () => DeskState,
  writeState: (state: DeskState, message: string) => void,
  registration?: { signal?: AbortSignal },
): Promise<void> {
  const registerOptions = registration?.signal ? { signal: registration.signal } : undefined;

  await modelContext.registerTool(
    {
      annotations: { consequentialHint: false, readOnlyHint: false },
      description: 'Start a desk visit. Required before list_slots. Returns visit-1.',
      execute: (_args, options) => runTransition(readState, writeState, options, startVisit),
      inputSchema: emptyInputSchema,
      name: START_VISIT,
    },
    registerOptions,
  );

  await modelContext.registerTool(
    {
      annotations: { readOnlyHint: false },
      description: 'List open appointment slots for the started visit. Call start_visit first.',
      execute: (_args, options) => runTransition(readState, writeState, options, listSlots),
      inputSchema: emptyInputSchema,
      name: LIST_SLOTS,
    },
    registerOptions,
  );

  await modelContext.registerTool(
    {
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
        return runTransition(readState, writeState, options, (state) => bookSlot(state, slotId));
      },
      inputSchema: bookSlotSchema,
      name: BOOK_SLOT,
    },
    registerOptions,
  );

  await modelContext.registerTool(
    {
      annotations: { consequentialHint: true },
      description: 'Confirm the visit after book_slot and file_request. Does not book or file.',
      execute: (_args, options) => runTransition(readState, writeState, options, confirmVisit),
      inputSchema: emptyInputSchema,
      name: CONFIRM_VISIT,
    },
    registerOptions,
  );
}
