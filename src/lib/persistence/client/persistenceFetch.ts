export async function persistenceFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  if (typeof window === "undefined") {
    return new Response(null, { status: 503 });
  }

  const origin = window.location.origin;
  if (!origin || origin === "null" || origin === "about:blank") {
    return new Response(null, { status: 503 });
  }

  try {
    return await fetch(`${origin}${path}`, {
      credentials: "same-origin",
      ...init,
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
