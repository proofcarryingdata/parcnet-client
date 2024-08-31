import { z } from "zod";
import { ParcnetRPCSchema } from "./schema.js";
import { ZappSchema } from "./zapp.js";

export enum InitializationMessageType {
  // Update this constant here and in Zupass
  PARCNET_CLIENT_CONNECT = "zupass-client-connect"
}

export enum RPCMessageType {
  // Update these constants here and in Zupass
  PARCNET_CLIENT_INVOKE = "zupass-client-invoke",
  PARCNET_CLIENT_INVOKE_RESULT = "zupass-client-invoke-result",
  PARCNET_CLIENT_INVOKE_ERROR = "zupass-client-invoke-error",
  PARCNET_CLIENT_READY = "zupass-client-ready",
  PARCNET_CLIENT_SHOW = "zupass-client-show",
  PARCNET_CLIENT_HIDE = "zupass-client-hide",
  PARCNET_CLIENT_SUBSCRIPTION_UPDATE = "zupass-client-subscription-update"
}

const ParcnetRPCMethodNameSchema = z
  .string()
  .refine(
    (
      s
    ): s is
      | `gpc.${keyof typeof ParcnetRPCSchema.shape.gpc.shape}`
      | `pod.${keyof typeof ParcnetRPCSchema.shape.pod.shape}`
      | `identity.${keyof typeof ParcnetRPCSchema.shape.identity.shape}` =>
      (s.startsWith("gpc.") &&
        s.slice(4) in ParcnetRPCSchema.shape.gpc.shape) ||
      (s.startsWith("pod.") &&
        s.slice(4) in ParcnetRPCSchema.shape.pod.shape) ||
      (s.startsWith("identity.") &&
        s.slice(9) in ParcnetRPCSchema.shape.identity.shape)
  );

export const RPCMessageSchema = z.discriminatedUnion("type", [
  /**
   * Schema which matches the type of {@link }
   */
  z.object({
    type: z.literal(RPCMessageType.PARCNET_CLIENT_INVOKE),
    serial: z.number(),
    fn: ParcnetRPCMethodNameSchema,
    args: z.array(z.unknown())
  }),
  z.object({
    type: z.literal(RPCMessageType.PARCNET_CLIENT_INVOKE_RESULT),
    result: z.unknown(),
    serial: z.number()
  }),
  z.object({
    type: z.literal(RPCMessageType.PARCNET_CLIENT_INVOKE_ERROR),
    error: z.string(),
    serial: z.number()
  }),
  z.object({
    type: z.literal(RPCMessageType.PARCNET_CLIENT_READY)
  }),
  z.object({
    type: z.literal(RPCMessageType.PARCNET_CLIENT_SHOW)
  }),
  z.object({
    type: z.literal(RPCMessageType.PARCNET_CLIENT_HIDE)
  }),
  z.object({
    type: z.literal(RPCMessageType.PARCNET_CLIENT_SUBSCRIPTION_UPDATE),
    update: z.array(z.string()),
    subscriptionId: z.string(),
    subscriptionSerial: z.number()
  })
]);

export const InitializationMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(InitializationMessageType.PARCNET_CLIENT_CONNECT),
    zapp: ZappSchema
  })
]);

export type InitializationMessage = z.infer<typeof InitializationMessageSchema>;
export type RPCMessage = z.infer<typeof RPCMessageSchema>;
export type ParcnetRPCMethodName = z.infer<typeof ParcnetRPCMethodNameSchema>;
