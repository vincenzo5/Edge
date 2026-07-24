import type { AlertTriggerEventResponse } from "@/lib/persistence/schemas/alerts";
import type { AlertDefinitionResponse } from "@/lib/persistence/schemas/alerts";
import {
  createAlert,
  fetchAlertById,
  fetchAlertEvents,
  fetchAlerts,
  patchAlert,
  removeAlert,
  type CreateAlertInput,
} from "@/lib/alerts/alertClient";

export type AlertPatchInput = Parameters<typeof patchAlert>[1];

export type AlertsPort = {
  listAlerts: () => Promise<AlertDefinitionResponse[]>;
  getAlert: (id: string) => Promise<AlertDefinitionResponse | null>;
  createAlert: (input: CreateAlertInput) => Promise<AlertDefinitionResponse>;
  patchAlert: (
    id: string,
    patch: AlertPatchInput,
  ) => Promise<AlertDefinitionResponse | null>;
  removeAlert: (id: string) => Promise<boolean>;
  listEvents: (alertId?: string) => Promise<AlertTriggerEventResponse[]>;
};

export function createFetchAlertsPort(): AlertsPort {
  return {
    listAlerts: () => fetchAlerts(),
    getAlert: (id) => fetchAlertById(id),
    createAlert: (input) => createAlert(input),
    patchAlert: (id, patch) => patchAlert(id, patch),
    removeAlert: (id) => removeAlert(id),
    listEvents: (alertId) => fetchAlertEvents(alertId),
  };
}
