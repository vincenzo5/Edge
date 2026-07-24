import { describe, expect, it, vi } from "vitest";

import {
  attachmentDataUrlsForMessage,
  resolveChatAttachmentDataUrls,
} from "./resolveChatAttachments";

vi.mock("@/lib/persistence/repositories/copilotAttachmentRepository", () => ({
  readCopilotAttachmentBytes: vi.fn(),
}));

import { readCopilotAttachmentBytes } from "@/lib/persistence/repositories/copilotAttachmentRepository";

const mockedRead = vi.mocked(readCopilotAttachmentBytes);

describe("resolveChatAttachmentDataUrls", () => {
  it("uses ephemeral dataUrl without hitting persistence", async () => {
    const resolved = await resolveChatAttachmentDataUrls(null, [
      {
        role: "user",
        content: "see this",
        attachments: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            mimeType: "image/png",
            dataUrl: "data:image/png;base64,abc",
          },
        ],
      },
    ]);

    expect(resolved.get("11111111-1111-4111-8111-111111111111")).toBe(
      "data:image/png;base64,abc",
    );
    expect(mockedRead).not.toHaveBeenCalled();
  });

  it("loads attachment bytes for authenticated users", async () => {
    mockedRead.mockResolvedValueOnce({
      bytes: Buffer.from("png"),
      mimeType: "image/png",
    });

    const id = "22222222-2222-4222-8222-222222222222";
    const resolved = await resolveChatAttachmentDataUrls("user-1", [
      {
        role: "user",
        content: "chart",
        attachments: [{ id, mimeType: "image/png" }],
      },
    ]);

    expect(mockedRead).toHaveBeenCalledWith("user-1", id);
    expect(resolved.get(id)).toBe(`data:image/png;base64,${Buffer.from("png").toString("base64")}`);
  });
});

describe("attachmentDataUrlsForMessage", () => {
  it("returns resolved urls in attachment order", () => {
    const idA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const idB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const resolved = new Map<string, string>([
      [idA, "data:image/png;base64,a"],
      [idB, "data:image/jpeg;base64,b"],
    ]);

    expect(
      attachmentDataUrlsForMessage(
        {
          role: "user",
          content: "",
          attachments: [
            { id: idA, mimeType: "image/png" },
            { id: idB, mimeType: "image/jpeg" },
          ],
        },
        resolved,
      ),
    ).toEqual(["data:image/png;base64,a", "data:image/jpeg;base64,b"]);
  });
});
