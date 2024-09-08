import { z } from "zod";
import { ParcnetRPC } from "./rpc_interfaces.js";

export const ParcnetRPCSchema = z.object({
  _version: z.literal("1"),
  gpc: z.object({
    prove: z.function().args(z.any()).returns(z.promise(z.any())),
    canProve: z.function().args(z.any()).returns(z.promise(z.boolean())),
    verify: z
      .function()
      .args(z.any(), z.any(), z.any())
      .returns(z.promise(z.boolean()))
  }),
  identity: z.object({
    getSemaphoreV3Commitment: z.function().returns(z.promise(z.bigint()))
  }),
  pod: z.object({
    query: z
      .function()
      .args(z.any())
      .returns(z.promise(z.array(z.string()))),
    insert: z.function().args(z.string()).returns(z.promise(z.void())),
    delete: z.function().args(z.string()).returns(z.promise(z.void())),
    subscribe: z.function().args(z.any()).returns(z.promise(z.string())),
    unsubscribe: z.function().args(z.string()).returns(z.promise(z.void()))
  })
}) satisfies z.ZodSchema<ParcnetRPC>;
