export type FlexWebServiceConfig = {
  token: string;
  queryId: string;
  baseUrl?: string;
};

export type FlexWebServiceResult = {
  csvText: string;
  referenceCode?: string;
};

const DEFAULT_BASE_URL = "https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService";

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Flex Web Service request failed (${response.status})`);
  }
  return response.text();
}

export async function fetchFlexStatementCsv(
  config: FlexWebServiceConfig,
): Promise<FlexWebServiceResult> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const sendUrl = `${baseUrl}.SendRequest?t=${encodeURIComponent(config.token)}&q=${encodeURIComponent(config.queryId)}&v=3`;
  const sendBody = await fetchText(sendUrl);
  const referenceMatch = sendBody.match(/ReferenceCode=(\d+)/i);
  if (!referenceMatch) {
    throw new Error(`Flex SendRequest did not return a reference code: ${sendBody.slice(0, 200)}`);
  }
  const referenceCode = referenceMatch[1];
  const getUrl = `${baseUrl}.GetStatement?q=${encodeURIComponent(referenceCode)}&t=${encodeURIComponent(config.token)}&v=3`;
  const csvText = await fetchText(getUrl);
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
