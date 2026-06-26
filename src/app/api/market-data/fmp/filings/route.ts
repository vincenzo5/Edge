import {
  fmpSecFilingsQuerySchema,
  parseMarketQuery,
} from "@/lib/marketData/schemas";
import { getServerMarketDataService } from "@/lib/marketData/service/server";
import {
  fmpJsonResponse,
  providerErrorResponse,
  validationErrorResponse,
} from "@/lib/marketData/service/fmpRouteHelpers";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseMarketQuery(url.searchParams, fmpSecFilingsQuerySchema);
  if (!parsed.ok) return validationErrorResponse(parsed);

  try {
    const service = getServerMarketDataService();
    const result = await service.getFmpSecFilings(parsed.data);
    return fmpJsonResponse("filings", result);
  } catch (error) {
    return providerErrorResponse(error, "Failed to fetch FMP SEC filings");
  }
}
