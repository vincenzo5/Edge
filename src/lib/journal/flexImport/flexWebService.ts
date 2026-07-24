export type FlexWebServiceConfig = {
  token: string;
  queryId: string;
  baseUrl?: string;
};

export type FlexWebServiceResult = {
  csvText: string;
  referenceCode?: string;
};

/** Current IB Client Portal Flex Web Service (v3). */
const DEFAULT_BASE_URL =
  "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";

const FLEX_USER_AGENT = "Edge/1.0";
const GET_STATEMENT_ATTEMPTS = 6;
const GET_STATEMENT_DELAY_MS = 3_000;

function sendRequestUrl(baseUrl: string, token: string, queryId: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const params = `t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`;
  // Legacy servlet used dotted method names; current API uses path segments.
  if (base.includes("FlexStatementService")) {
    return `${base}.SendRequest?${params}`;
  }
  return `${base}/SendRequest?${params}`;
}

function getStatementUrl(baseUrl: string, token: string, referenceCode: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const params = `t=${encodeURIComponent(token)}&q=${encodeURIComponent(referenceCode)}&v=3`;
  if (base.includes("FlexStatementService")) {
    return `${base}.GetStatement?${params}`;
  }
  return `${base}/GetStatement?${params}`;
}

export function parseFlexReferenceCode(sendBody: string): string {
  const xml = sendBody.match(/<ReferenceCode>\s*(\d+)\s*<\/ReferenceCode>/i);
  if (xml?.[1]) return xml[1];

  const legacy = sendBody.match(/ReferenceCode=(\d+)/i);
  if (legacy?.[1]) return legacy[1];

  const errCode = sendBody.match(/<ErrorCode>\s*(\d+)\s*<\/ErrorCode>/i)?.[1];
  const errMsg = sendBody.match(/<ErrorMessage>\s*([^<]+)\s*<\/ErrorMessage>/i)?.[1]?.trim();
  if (errCode || errMsg) {
    throw new Error(`Flex SendRequest failed (${errCode ?? "?"}): ${errMsg ?? "unknown error"}`);
  }

  throw new Error(`Flex SendRequest did not return a reference code: ${sendBody.slice(0, 200)}`);
}

function isFlexErrorXml(body: string): boolean {
  return /<Status>\s*(Fail|Warn)\s*<\/Status>/i.test(body) && /<ErrorCode>/i.test(body);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": FLEX_USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Flex Web Service request failed (${response.status})`);
  }
  return response.text();
}

export async function fetchFlexStatementCsv(
  config: FlexWebServiceConfig,
): Promise<FlexWebServiceResult> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const sendBody = await fetchText(sendRequestUrl(baseUrl, config.token, config.queryId));
  const referenceCode = parseFlexReferenceCode(sendBody);

  let csvText = "";
  for (let attempt = 0; attempt < GET_STATEMENT_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(GET_STATEMENT_DELAY_MS);
    else await sleep(GET_STATEMENT_DELAY_MS);

    csvText = await fetchText(getStatementUrl(baseUrl, config.token, referenceCode));
    if (!isFlexErrorXml(csvText)) break;

    const errCode = csvText.match(/<ErrorCode>\s*(\d+)\s*<\/ErrorCode>/i)?.[1];
    const errMsg = csvText.match(/<ErrorMessage>\s*([^<]+)\s*<\/ErrorMessage>/i)?.[1]?.trim();
    // 1019 = generation in progress — retry. Other errors fail immediately.
    if (errCode !== "1019" && errCode !== "1001" && errCode !== "1004") {
      throw new Error(`Flex GetStatement failed (${errCode ?? "?"}): ${errMsg ?? "unknown error"}`);
    }
    if (attempt === GET_STATEMENT_ATTEMPTS - 1) {
      throw new Error(`Flex GetStatement failed (${errCode ?? "?"}): ${errMsg ?? "not ready"}`);
    }
  }

  if (isFlexErrorXml(csvText) || !csvText.trim()) {
    throw new Error(`Flex GetStatement returned empty or error body: ${csvText.slice(0, 200)}`);
  }

  return { csvText, referenceCode };
}

export function readFlexWebServiceConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): FlexWebServiceConfig | null {
  const token = env.IB_FLEX_TOKEN?.trim();
  const queryId = env.IB_FLEX_QUERY_ID?.trim();
  if (!token || !queryId) return null;
  return { token, queryId };
}
