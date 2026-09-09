<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import { bindRequestForm } from './bind-request-form';

import type { DeskState } from './desk';

const props = defineProps<{
  readState: () => DeskState;
  writeState: (state: DeskState, message: string) => void;
}>();

const form = ref<HTMLFormElement | null>(null);
let stop: (() => void) | undefined;

onMounted(() => {
  if (!form.value) {
    return;
  }
  stop = bindRequestForm(form.value, props.readState, props.writeState);
});

onUnmounted(() => {
  stop?.();
  stop = undefined;
});
</script>

<template>
  <form
    id="file-request"
    ref="form"
    method="post"
    action="/file-request"
    toolname="file_request"
    tooldescription="File a support request after book_slot. Requires name, topic, and details."
    toolautosubmit
  >
    <label for="name">Name</label>
    <input id="name" name="name" type="text" required autocomplete="name" />

    <label for="topic">Topic</label>
    <select
      id="topic"
      name="topic"
      required
      toolparamdescription="Request topic: access, billing, or other."
    >
      <option value="access">Access</option>
      <option value="billing">Billing</option>
      <option value="other">Other</option>
    </select>

    <label for="details">Details</label>
    <input
      id="details"
      name="details"
      type="text"
      required
      toolparamdescription="Short description of the request."
    />

    <button type="submit">File request</button>
  </form>
</template>
