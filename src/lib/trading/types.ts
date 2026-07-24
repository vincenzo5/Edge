import { z } from "zod";
import { AccountOrderSchema } from "@/lib/marketData/contracts/brokerage";

export const TradingBrokerSchema = z.enum(["ib", "stub"]);
export type TradingBroker = z.infer<typeof TradingBrokerSchema>;

export const TradingEnvironmentSchema = z.enum(["paper", "live"]);
export type TradingEnvironment = z.infer<typeof TradingEnvironmentSchema>;

export const OrderSideSchema = z.enum(["BUY", "SELL"]);
export type OrderSide = z.infer<typeof OrderSideSchema>;

export const OrderTypeSchema = z.enum([
  "MKT",
  "LMT",
  "STP",
  "STP LMT",
  "TRAIL",
  "TRAIL LIMIT",
]);
export type OrderType = z.infer<typeof OrderTypeSchema>;

export const TimeInForceSchema = z.enum(["DAY", "GTC"]);
export type TimeInForce = z.infer<typeof TimeInForceSchema>;

export const TradingAccountAvailabilitySchema = z.enum(["online", "offline"]);
export type TradingAccountAvailability = z.infer<typeof TradingAccountAvailabilitySchema>;

export const TradingAccountSchema = z.object({
  broker: TradingBrokerSchema,
  connectionId: z.string(),
  accountId: z.string(),
  environment: TradingEnvironmentSchema,
  availability: TradingAccountAvailabilitySchema.optional(),
});

export type TradingAccount = z.infer<typeof TradingAccountSchema>;

export const OrderDraftSchema = z
  .object({
    accountId: z.string().min(1),
    symbol: z.string().min(1),
    side: OrderSideSchema,
    quantity: z.number().positive(),
    orderType: OrderTypeSchema.default("MKT"),
    limitPrice: z.number().positive().optional(),
    stopPrice: z.number().positive().optional(),
    trailPercent: z.number().positive().optional(),
    outsideRth: z.boolean().default(false),
    tif: TimeInForceSchema.default("DAY"),
    orderRef: z.string().optional(),
    environment: TradingEnvironmentSchema,
  })
  .superRefine((value, ctx) => {
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
  });

export type OrderDraft = z.infer<typeof OrderDraftSchema>;

export const OrderPreviewSchema = z.object({
  symbol: z.string(),
  side: OrderSideSchema,
  quantity: z.number(),
  orderType: OrderTypeSchema,
  limitPrice: z.number().nullable().optional(),
  stopPrice: z.number().nullable().optional(),
  initMarginChange: z.number().nullable().optional(),
  maintMarginChange: z.number().nullable().optional(),
  equityWithLoanChange: z.number().nullable().optional(),
  commission: z.number().nullable().optional(),
  minCommission: z.number().nullable().optional(),
  maxCommission: z.number().nullable().optional(),
  warnings: z.array(z.string()).default([]),
  updatedAt: z.number(),
});

export type OrderPreview = z.infer<typeof OrderPreviewSchema>;

export const OrderIntentStatusSchema = z.enum([
  "draft",
  "previewed",
  "submitted",
  "cancelled",
  "failed",
]);

export type OrderIntentStatus = z.infer<typeof OrderIntentStatusSchema>;

export const OrderIntentSchema = z.object({
  intentId: z.string(),
  idempotencyKey: z.string(),
  draft: OrderDraftSchema,
  status: OrderIntentStatusSchema,
  orderRef: z.string(),
  permId: z.number().nullable().optional(),
  orderId: z.number().nullable().optional(),
  bracketStopPrice: z.number().nullable().optional(),
  bracketTakeProfitPrice: z.number().nullable().optional(),
  stopOrderId: z.number().nullable().optional(),
  takeProfitOrderId: z.number().nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type OrderIntent = z.infer<typeof OrderIntentSchema>;

export const SubmitOrderRequestSchema = z.object({
  draft: OrderDraftSchema,
  idempotencyKey: z.string().min(1),
  previewIntentId: z.string().min(1).optional(),
  liveConfirmation: z.string().optional(),
});

export type SubmitOrderRequest = z.infer<typeof SubmitOrderRequestSchema>;

export const PlacedOrderResultSchema = z.object({
  order: AccountOrderSchema,
  orderRef: z.string(),
  intent: OrderIntentSchema,
});

export type PlacedOrderResult = z.infer<typeof PlacedOrderResultSchema>;

export const OrderModifyPatchSchema = z
  .object({
    quantity: z.number().positive().optional(),
    limitPrice: z.number().positive().optional(),
    stopPrice: z.number().positive().optional(),
    tif: TimeInForceSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.quantity == null &&
      value.limitPrice == null &&
      value.stopPrice == null &&
      value.tif == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of quantity, limitPrice, stopPrice, or tif is required",
      });
    }
  });

export type OrderModifyPatch = z.infer<typeof OrderModifyPatchSchema>;

export const StopLegModeSchema = z.enum(["fixed", "trail"]);
export type StopLegMode = z.infer<typeof StopLegModeSchema>;

export const BracketStopLegSchema = z
  .object({
    mode: StopLegModeSchema.default("fixed"),
    stopPrice: z.number().positive().optional(),
    trailAmount: z.number().positive().optional(),
    trailPercent: z.number().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "fixed" && value.stopPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "stopPrice required for fixed stop leg",
        path: ["stopPrice"],
      });
    }
    if (value.mode === "trail" && value.trailAmount == null && value.trailPercent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "trailAmount or trailPercent required for trail stop leg",
      });
    }
  });

export type BracketStopLeg = z.infer<typeof BracketStopLegSchema>;

export const BracketPlanSchema = z
  .object({
    entry: OrderDraftSchema,
    stopLeg: BracketStopLegSchema,
    takeProfitPrice: z.number().positive(),
  })
  .superRefine((value, ctx) => {
    const entry = value.entry;
    const stopPrice = value.stopLeg.stopPrice;
    if (stopPrice == null) return;
    if (entry.side === "BUY") {
      if (entry.orderType === "LMT" && entry.limitPrice != null && stopPrice >= entry.limitPrice) {
        // allow stop below entry for long
      }
      if (stopPrice >= (entry.limitPrice ?? Number.POSITIVE_INFINITY)) {
        // for MKT long, stop must be below a reasonable entry - validated loosely
      }
      if (value.takeProfitPrice <= stopPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "takeProfitPrice must be above stop for long bracket",
          path: ["takeProfitPrice"],
        });
      }
    } else if (entry.side === "SELL") {
      if (value.takeProfitPrice >= stopPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "takeProfitPrice must be below stop for short bracket",
          path: ["takeProfitPrice"],
        });
      }
    }
  });

export type BracketPlan = z.infer<typeof BracketPlanSchema>;

export const ProtectiveOcoPlanSchema = z.object({
  accountId: z.string().min(1),
  symbol: z.string().min(1),
  quantity: z.number().positive(),
  side: OrderSideSchema,
  stopLeg: BracketStopLegSchema,
  takeProfitPrice: z.number().positive(),
  outsideRth: z.boolean().default(false),
  tif: TimeInForceSchema.default("DAY"),
  environment: TradingEnvironmentSchema,
  orderRef: z.string().optional(),
});

export type ProtectiveOcoPlan = z.infer<typeof ProtectiveOcoPlanSchema>;

export const SubmitBracketRequestSchema = z
  .object({
    plan: BracketPlanSchema,
    idempotencyKey: z.string().min(1),
    previewIntentId: z.string().min(1).optional(),
    liveConfirmation: z.string().optional(),
    playbookTemplateId: z.string().min(1).optional(),
    playbookEntryPrice: z.number().positive().optional(),
    playbookInitialStop: z.number().positive().optional(),
    playbookNotifyAtManageLevels: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.playbookTemplateId) return;
    if (value.playbookEntryPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "playbookEntryPrice required when playbookTemplateId is set",
        path: ["playbookEntryPrice"],
      });
    }
    if (value.playbookInitialStop == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "playbookInitialStop required when playbookTemplateId is set",
        path: ["playbookInitialStop"],
      });
    }
  });

export type SubmitBracketRequest = z.infer<typeof SubmitBracketRequestSchema>;

export const BracketPlacedResultSchema = z.object({
  entryOrder: AccountOrderSchema,
  stopOrder: AccountOrderSchema,
  takeProfitOrder: AccountOrderSchema,
  orderRef: z.string(),
  intent: OrderIntentSchema,
  playbookInstance: z.unknown().optional(),
  playbookAttachError: z.string().optional(),
});

export type BracketPlacedResult = z.infer<typeof BracketPlacedResultSchema> & {
  playbookInstance?: import("./playbook/types").PlaybookInstance;
};

export const SubmitProtectiveOcoRequestSchema = z
  .object({
    plan: ProtectiveOcoPlanSchema,
    idempotencyKey: z.string().min(1),
    liveConfirmation: z.string().optional(),
    playbookTemplateId: z.string().min(1).optional(),
    playbookEntryPrice: z.number().positive().optional(),
    playbookInitialStop: z.number().positive().optional(),
    playbookNotifyAtManageLevels: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.playbookTemplateId) return;
    if (value.playbookEntryPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "playbookEntryPrice required when playbookTemplateId is set",
        path: ["playbookEntryPrice"],
      });
    }
    if (value.playbookInitialStop == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "playbookInitialStop required when playbookTemplateId is set",
        path: ["playbookInitialStop"],
      });
    }
  });

export type SubmitProtectiveOcoRequest = z.infer<typeof SubmitProtectiveOcoRequestSchema>;

export const ProtectiveOcoPlacedResultSchema = z.object({
  stopOrder: AccountOrderSchema,
  takeProfitOrder: AccountOrderSchema,
  orderRef: z.string(),
  playbookInstance: z.unknown().optional(),
  playbookAttachError: z.string().optional(),
});

export type ProtectiveOcoPlacedResult = z.infer<typeof ProtectiveOcoPlacedResultSchema> & {
  playbookInstance?: import("./playbook/types").PlaybookInstance;
};

export const PreviewPlaybookRequestSchema = z.object({
  templateId: z.string().min(1),
  accountId: z.string().min(1),
  symbol: z.string().min(1),
  side: OrderSideSchema,
  entry: z.number().positive(),
  initialStop: z.number().positive(),
  qty: z.number().positive(),
  environment: TradingEnvironmentSchema.default("paper"),
});

export type PreviewPlaybookRequest = z.infer<typeof PreviewPlaybookRequestSchema>;

export const AttachManagementPlaybookRequestSchema = z.object({
  templateId: z.string().min(1),
  accountId: z.string().min(1),
  symbol: z.string().min(1),
  side: OrderSideSchema,
  entryPrice: z.number().positive(),
  initialStop: z.number().positive(),
  qty: z.number().positive(),
  environment: TradingEnvironmentSchema.default("paper"),
  orderRef: z.string().optional(),
  status: z.enum(["pending_fill", "armed"]).optional(),
  orderIntentId: z.string().min(1).optional(),
  stopOrderId: z.number().int().positive().optional(),
  filledQty: z.number().positive().optional(),
  notifyAtManageLevels: z.boolean().optional(),
  liveConfirmation: z.string().optional(),
});

export type AttachManagementPlaybookRequest = z.infer<
  typeof AttachManagementPlaybookRequestSchema
>;
