import { z } from "zod";
import { AccountOrderSchema } from "@/lib/marketData/contracts/brokerage";

export const TradingBrokerSchema = z.enum(["ib", "stub"]);
export type TradingBroker = z.infer<typeof TradingBrokerSchema>;

export const TradingEnvironmentSchema = z.enum(["paper", "live"]);
export type TradingEnvironment = z.infer<typeof TradingEnvironmentSchema>;

export const OrderSideSchema = z.enum(["BUY", "SELL"]);
export type OrderSide = z.infer<typeof OrderSideSchema>;

export const OrderTypeSchema = z.enum(["MKT", "LMT", "STP", "STP LMT"]);
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
