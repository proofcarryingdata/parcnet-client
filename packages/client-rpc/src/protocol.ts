import * as v from "valibot";
import { PODDataSchema, ParcnetRPCSchema } from "./schema.js";
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

const ParcnetRPCMethodNameSchema = v.pipe(
  v.string(),
  v.check((s): s is ParcnetRPCMethodName => {
    return (
      typeof s === "string" &&
      ((s.startsWith("gpc.") && s.slice(4) in ParcnetRPCSchema.gpc) ||
        (s.startsWith("pod.") && s.slice(4) in ParcnetRPCSchema.pod) ||
        (s.startsWith("identity.") && s.slice(9) in ParcnetRPCSchema.identity))
    );
  }, "Invalid RPC method name"),
  v.transform<string, ParcnetRPCMethodName>((s) => s as ParcnetRPCMethodName)
);

export type ParcnetRPCMethodName =
  | `gpc.${keyof typeof ParcnetRPCSchema.gpc}`
  | `pod.${keyof typeof ParcnetRPCSchema.pod}`
  | `identity.${keyof typeof ParcnetRPCSchema.identity}`;

export const RPCMessageSchema = v.variant("type", [
  v.object({
    type: v.literal(RPCMessageType.PARCNET_CLIENT_INVOKE),
    serial: v.number(),
    fn: ParcnetRPCMethodNameSchema,
    args: v.array(v.unknown())
  }),
  v.object({
    type: v.literal(RPCMessageType.PARCNET_CLIENT_INVOKE_RESULT),
    result: v.unknown(),
    serial: v.number()
  }),
  v.object({
    type: v.literal(RPCMessageType.PARCNET_CLIENT_INVOKE_ERROR),
    error: v.string(),
    serial: v.number()
  }),
  v.object({
    type: v.literal(RPCMessageType.PARCNET_CLIENT_READY)
  }),
  v.object({
    type: v.literal(RPCMessageType.PARCNET_CLIENT_SHOW)
  }),
  v.object({
    type: v.literal(RPCMessageType.PARCNET_CLIENT_HIDE)
  }),
  v.object({
    type: v.literal(RPCMessageType.PARCNET_CLIENT_SUBSCRIPTION_UPDATE),
    update: v.array(PODDataSchema),
    subscriptionId: v.string(),
    subscriptionSerial: v.number()
  })
]);

export const InitializationMessageSchema = v.variant("type", [
  v.object({
    type: v.literal(InitializationMessageType.PARCNET_CLIENT_CONNECT),
    zapp: ZappSchema
  })
]);

export type InitializationMessage = v.InferOutput<
  typeof InitializationMessageSchema
>;
export type RPCMessage = v.InferOutput<typeof RPCMessageSchema>;
