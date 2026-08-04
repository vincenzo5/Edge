import { z } from "zod";

/** Native bracket parent types — expand only after paper evidence. */
export const OrderTypeSchema = z.enum([
  "MKT",
  "LMT",
  "STP",
  "STP LMT",
  "TRAIL",
  "TRAIL LIMIT",
  "MOC",
  "LOC",
]);
export type OrderType = z.infer<typeof OrderTypeSchema>;

export const TimeInForceSchema = z.enum(["DAY", "GTC", "IOC", "OPG"]);
export type TimeInForce = z.infer<typeof TimeInForceSchema>;

export const BRACKET_PARENT_ORDER_TYPES = [
  "MKT",
  "LMT",
  "STP",
  "STP LMT",
] as const satisfies readonly OrderType[];

export const BRACKET_PARENT_TIF_OPTIONS: TimeInForce[] = ["DAY", "GTC"];

function tifOptionsForOrderType(orderType: OrderType): TimeInForce[] {
  switch (orderType) {
    case "MOC":
    case "LOC":
      return ["DAY"];
    case "STP":
    case "STP LMT":
    case "TRAIL":
    case "TRAIL LIMIT":
      return ["DAY", "GTC"];
    case "MKT":
    case "LMT":
    default:
      return ["DAY", "GTC", "IOC", "OPG"];
  }
}

function supportsPriceMgmtAlgo(orderType: OrderType): boolean {
  return orderType === "LMT" || orderType === "STP LMT" || orderType === "TRAIL LIMIT" || orderType === "LOC";
}

export function isTifValidForOrderType(orderType: OrderType, tif: TimeInForce): boolean {
  return tifOptionsForOrderType(orderType).includes(tif);
}

export function supportsBracketAttach(orderType: OrderType): boolean {
  return (BRACKET_PARENT_ORDER_TYPES as readonly string[]).includes(orderType);
}

export function tifOptionsForBracketParent(orderType: OrderType): TimeInForce[] {
  return BRACKET_PARENT_TIF_OPTIONS.filter((tif) => isTifValidForOrderType(orderType, tif));
}

export function isTifValidForBracketParent(orderType: OrderType, tif: TimeInForce): boolean {
  return tifOptionsForBracketParent(orderType).includes(tif);
}

export function bracketEntryRejectReason(args: {
  orderType: OrderType;
  protectRequested: boolean;
}): string | null {
  if (!args.protectRequested) return null;
  if (supportsBracketAttach(args.orderType)) return null;
  return `Protect requires a native bracket entry; ${args.orderType} is not supported yet. Use MKT, LMT, STP, or STP LMT, or remove Protect.`;
}

function refineOrderExecutionRecipe(
  value: {
    orderType: OrderType;
    limitPrice?: number;
    stopPrice?: number;
    trailPercent?: number;
    tif: TimeInForce;
    usePriceMgmtAlgo: boolean;
  },
  ctx: z.RefinementCtx,
): void {
  if (value.orderType === "LMT" && value.limitPrice == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "limitPrice required for LMT orders",
      path: ["limitPrice"],
    });
  }
  if (value.orderType === "STP" && value.stopPrice == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "stopPrice required for STP orders",
      path: ["stopPrice"],
    });
  }
  if (value.orderType === "STP LMT") {
    if (value.stopPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "stopPrice required for STP LMT orders",
        path: ["stopPrice"],
      });
    }
    if (value.limitPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "limitPrice required for STP LMT orders",
        path: ["limitPrice"],
      });
    }
  }
  if (value.orderType === "TRAIL" && value.stopPrice == null && value.trailPercent == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "stopPrice (trail amount) or trailPercent required for TRAIL orders",
      path: ["stopPrice"],
    });
  }
  if (value.orderType === "TRAIL LIMIT") {
    if (value.stopPrice == null && value.trailPercent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "stopPrice (trail amount) or trailPercent required for TRAIL LIMIT orders",
        path: ["stopPrice"],
      });
    }
    if (value.limitPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "limitPrice required for TRAIL LIMIT orders",
        path: ["limitPrice"],
      });
    }
  }
  if (value.orderType === "LOC" && value.limitPrice == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "limitPrice required for LOC orders",
      path: ["limitPrice"],
    });
  }
  if (value.orderType === "MOC") {
    if (value.limitPrice != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "limitPrice must not be set for MOC orders",
        path: ["limitPrice"],
      });
    }
    if (value.stopPrice != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "stopPrice must not be set for MOC orders",
        path: ["stopPrice"],
      });
    }
  }
  if (!isTifValidForOrderType(value.orderType, value.tif)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `tif ${value.tif} is not valid for ${value.orderType} orders`,
      path: ["tif"],
    });
  }
  if (value.usePriceMgmtAlgo && !supportsPriceMgmtAlgo(value.orderType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "usePriceMgmtAlgo is only supported for LMT, STP LMT, TRAIL LIMIT, and LOC orders",
      path: ["usePriceMgmtAlgo"],
    });
  }
}

export const OrderExecutionRecipeSchema = z
  .object({
    orderType: OrderTypeSchema.default("MKT"),
    limitPrice: z.number().positive().optional(),
    stopPrice: z.number().positive().optional(),
    trailPercent: z.number().positive().optional(),
    outsideRth: z.boolean().default(false),
    tif: TimeInForceSchema.default("DAY"),
    allOrNone: z.boolean().default(false),
    usePriceMgmtAlgo: z.boolean().default(false),
  })
  .superRefine((value, ctx) => refineOrderExecutionRecipe(value, ctx));

export type OrderExecutionRecipe = z.infer<typeof OrderExecutionRecipeSchema>;

const LegacyEntryOrderSchema = z.object({
  type: z.enum(["MKT", "LMT", "STP", "STP_LMT"]),
  limitPrice: z.number().positive().optional(),
});

function legacyToRecipe(raw: z.infer<typeof LegacyEntryOrderSchema>): EntryOrder {
  const orderType = raw.type === "STP_LMT" ? "STP LMT" : raw.type;
  return {
    orderType,
    limitPrice: raw.limitPrice,
    outsideRth: false,
    tif: "DAY",
    allOrNone: false,
    usePriceMgmtAlgo: false,
  };
}

/** Policy entry order — accepts legacy `{ type }` or full recipe (lenient until prices are seeded). */
export const EntryOrderSchema = z.preprocess((raw) => {
  if (raw == null || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;
  if ("type" in record && !("orderType" in record)) {
    const parsed = LegacyEntryOrderSchema.safeParse(record);
    if (parsed.success) return legacyToRecipe(parsed.data);
  }
  return raw;
}, z.object({
  orderType: OrderTypeSchema.default("MKT"),
  limitPrice: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  trailPercent: z.number().positive().optional(),
  outsideRth: z.boolean().default(false),
  tif: TimeInForceSchema.default("DAY"),
  allOrNone: z.boolean().default(false),
  usePriceMgmtAlgo: z.boolean().default(false),
}));

export type EntryOrder = z.infer<typeof EntryOrderSchema>;

export function validateStrictEntryOrder(recipe: EntryOrder): OrderExecutionRecipe {
  return OrderExecutionRecipeSchema.parse(recipe);
}

export function defaultEntryOrder(): EntryOrder {
  return { orderType: "MKT", outsideRth: false, tif: "DAY", allOrNone: false, usePriceMgmtAlgo: false };
}

export function defaultManagePlacementRecipe(): OrderExecutionRecipe {
  return { orderType: "MKT", outsideRth: false, tif: "DAY", allOrNone: false, usePriceMgmtAlgo: false };
}

export function clampRecipeTifForBracket(recipe: OrderExecutionRecipe): OrderExecutionRecipe {
  if (isTifValidForBracketParent(recipe.orderType, recipe.tif)) return recipe;
  const fallback = tifOptionsForBracketParent(recipe.orderType)[0] ?? "DAY";
  return { ...recipe, tif: fallback };
}

export function seedEntryOrderPrices(
  recipe: EntryOrder,
  args: { planEntry?: number | null; planStop?: number | null },
): EntryOrder {
  const orderType = recipe.orderType;
  const limitPrice =
    recipe.limitPrice ??
    (orderType === "LMT" || orderType === "STP LMT" || orderType === "TRAIL LIMIT" || orderType === "LOC"
      ? args.planEntry ?? undefined
      : undefined);
  const stopPrice =
    recipe.stopPrice ??
    (orderType === "STP" || orderType === "STP LMT" || orderType === "TRAIL" || orderType === "TRAIL LIMIT"
      ? args.planStop ?? undefined
      : undefined);
  const parsed = EntryOrderSchema.safeParse({ ...recipe, limitPrice, stopPrice });
  if (parsed.success) return parsed.data;
  return { ...recipe, limitPrice, stopPrice };
}

export function entryOrderToDraftFields(recipe: EntryOrder): Pick<
  OrderExecutionRecipe,
  "orderType" | "limitPrice" | "stopPrice" | "trailPercent" | "outsideRth" | "tif" | "allOrNone" | "usePriceMgmtAlgo"
> {
  return {
    orderType: recipe.orderType,
    limitPrice: recipe.limitPrice,
    stopPrice: recipe.stopPrice,
    trailPercent: recipe.trailPercent,
    outsideRth: recipe.outsideRth ?? false,
    tif: recipe.tif ?? "DAY",
    allOrNone: recipe.allOrNone ?? false,
    usePriceMgmtAlgo: recipe.usePriceMgmtAlgo ?? false,
  };
}
