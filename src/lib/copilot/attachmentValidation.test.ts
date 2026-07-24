import { describe, expect, it } from "vitest";

import {
  COPILOT_ATTACHMENT_MAX_BYTES,
  COPILOT_ATTACHMENT_MAX_PER_MESSAGE,
  validateCopilotAttachmentUpload,
} from "./attachmentValidation";

describe("validateCopilotAttachmentUpload", () => {
  it("accepts allowed image types within limits", () => {
    expect(validateCopilotAttachmentUpload("image/png", 1024, 0)).toEqual({
      ok: true,
      mimeType: "image/png",
    });
  });

  it("rejects unsupported mime types", () => {
    expect(validateCopilotAttachmentUpload("application/pdf", 1024, 0)).toEqual({
      ok: false,
      error: "Unsupported image type. Use PNG, JPEG, or WebP.",
    });
  });

  it("rejects empty files", () => {
    expect(validateCopilotAttachmentUpload("image/png", 0, 0)).toEqual({
      ok: false,
      error: "Attachment file is empty.",
    });
  });

  it("rejects files over the byte limit", () => {
    expect(
      validateCopilotAttachmentUpload("image/jpeg", COPILOT_ATTACHMENT_MAX_BYTES + 1, 0),
    ).toMatchObject({ ok: false });
  });

  it("rejects when max attachments per message reached", () => {
    expect(
      validateCopilotAttachmentUpload(
        "image/webp",
        1024,
        COPILOT_ATTACHMENT_MAX_PER_MESSAGE,
      ),
    ).toEqual({
      ok: false,
      error: `Maximum ${COPILOT_ATTACHMENT_MAX_PER_MESSAGE} attachments per message.`,
    });
  });
});
