import { getPlaybookPreset } from "./presets";
import type { PlaybookInstance, PlaybookTemplate } from "./types";

export function resolvePlaybookTemplateFromInstance(
  instance: PlaybookInstance,
): PlaybookTemplate | null {
  if (instance.templateSnapshot) {
    return instance.templateSnapshot;
  }
  return getPlaybookPreset(instance.templateId);
}

export function resolvePlaybookTemplateSync(
  templateId: string,
  options?: {
    snapshot?: PlaybookTemplate;
    userTemplates?: PlaybookTemplate[];
  },
): PlaybookTemplate | null {
  if (options?.snapshot) {
    return options.snapshot;
  }
  const preset = getPlaybookPreset(templateId);
  if (preset) {
    return preset;
  }
  return options?.userTemplates?.find((item) => item.id === templateId) ?? null;
}

export async function resolvePlaybookTemplate(
  templateId: string,
  options?: {
    snapshot?: PlaybookTemplate;
    listUserTemplates?: () => Promise<PlaybookTemplate[]>;
  },
): Promise<PlaybookTemplate | null> {
  if (options?.snapshot) {
    return options.snapshot;
  }
  const preset = getPlaybookPreset(templateId);
  if (preset) {
    return preset;
  }
  if (options?.listUserTemplates) {
    const userTemplates = await options.listUserTemplates();
    return userTemplates.find((item) => item.id === templateId) ?? null;
  }
  return null;
}

export function isUserPlaybookTemplateId(id: string): boolean {
  return id.startsWith("user_");
}

export function createUserPlaybookTemplateId(): string {
  return `user_${crypto.randomUUID()}`;
}
