import { handleRuntimeWorkerMessage, markRuntimeRequestCancelled } from '@edge/indicator-runtime';

type WorkerRequest = Parameters<typeof handleRuntimeWorkerMessage>[0];
type WorkerCancel = { type: 'cancel'; requestId: string };

self.onmessage = async (event: MessageEvent<WorkerRequest | WorkerCancel>) => {
  if (event.data.type === 'cancel') {
    markRuntimeRequestCancelled(event.data.requestId);
    return;
  }
  const response = await handleRuntimeWorkerMessage(event.data);
  self.postMessage(response);
};

export {};
