<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { createSeedDesk } from '../desk/desk';
import {
  APPOINTMENTS_LABEL,
  appointmentViews,
  REQUESTS_LABEL,
  requestViews,
  visitSteps,
  visitSummary,
} from '../desk/desk-view';
import { registerDeskTools } from '../webmcp/register-tools';

import RequestForm from './request-form.vue';

import type { DeskState } from '../desk/desk';

const READY = 'true';
const MISSING = 'missing';
const REGISTERED = 'registered';
const UNAVAILABLE = 'WebMCP is not available in this browser.';

const state = ref<DeskState>(createSeedDesk());
const status = ref('Loading front desk.');
const registration = new AbortController();

const appointments = computed(() => appointmentViews(state.value));
const requests = computed(() => requestViews(state.value));
const steps = computed(() => visitSteps(state.value));
const summary = computed(() => visitSummary(state.value));

function readState(): DeskState {
  return state.value;
}

function writeState(next: DeskState, message: string): void {
  state.value = next;
  status.value = message;
}

onMounted(() => {
  void startDesk();
});

onUnmounted(() => {
  registration.abort();
});

async function startDesk(): Promise<void> {
  status.value = 'Front desk ready.';
  const modelContext = document.modelContext;
  if (!modelContext) {
    document.body.dataset.webmcp = MISSING;
    document.body.dataset.deskReady = READY;
    status.value = UNAVAILABLE;
    return;
  }

  try {
    await registerDeskTools(modelContext, readState, writeState, { signal: registration.signal });
  } catch (error) {
    if (registration.signal.aborted) {
      return;
    }
    throw error;
  }
  if (registration.signal.aborted) {
    return;
  }
  document.body.dataset.webmcp = REGISTERED;
  document.body.dataset.deskReady = READY;
}
</script>

<template>
  <main>
    <h1>Front desk</h1>
    <p id="status" role="status" aria-live="polite">{{ status }}</p>

    <section id="visit" aria-labelledby="visit-heading">
      <h2 id="visit-heading">Visit</h2>
      <p id="visit-summary">{{ summary }}</p>
      <ol id="visit-steps" aria-label="Visit steps">
        <li v-for="step in steps" :key="step.id" :data-state="step.state">{{ step.label }}</li>
      </ol>
    </section>

    <section aria-labelledby="appointments-heading">
      <h2 id="appointments-heading">Appointments</h2>
      <ul id="appointments" role="list" :aria-label="APPOINTMENTS_LABEL">
        <li
          v-for="slot in appointments"
          :key="slot.id"
          :data-state="slot.booked ? 'booked' : 'open'"
        >
          {{ slot.line }}
        </li>
      </ul>
    </section>

    <section aria-labelledby="request-heading">
      <h2 id="request-heading">Support request</h2>
      <RequestForm :read-state="readState" :write-state="writeState" />
      <ul id="requests" role="list" :aria-label="REQUESTS_LABEL">
        <li v-if="requests.length === 0" data-state="empty">No requests yet</li>
        <template v-else>
          <li v-for="request in requests" :key="request.id" data-state="filed">
            {{ request.line }}
          </li>
        </template>
      </ul>
    </section>
  </main>
</template>
