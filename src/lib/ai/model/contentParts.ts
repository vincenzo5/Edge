export type TextContentPart = {
  type: "text";
  text: string;
};

export type ImageUrlContentPart = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

export type ModelContentPart = TextContentPart | ImageUrlContentPart;

export type ModelMessageContent = string | ModelContentPart[];

export function isContentPartArray(content: ModelMessageContent): content is ModelContentPart[] {
  return Array.isArray(content);
}

export function buildMultimodalContent(
  text: string,
  imageDataUrls: string[],
): ModelMessageContent {
  const parts: ModelContentPart[] = [];
  const trimmed = text.trim();
  if (trimmed) {
    parts.push({ type: "text", text: trimmed });
  }
  for (const url of imageDataUrls) {
    if (url.trim()) {
      parts.push({ type: "image_url", image_url: { url } });
    }
  }
  if (parts.length === 0) return "";
  if (parts.length === 1 && parts[0]?.type === "text") {
    return parts[0].text;
  }
  return parts;
}
