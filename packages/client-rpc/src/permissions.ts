import * as v from "valibot";
import type { ParcnetRPCMethodName } from "./protocol.js";

export class MissingPermissionError extends Error {
  public constructor(
    public readonly missingPermission: keyof PermissionRequest,
    public readonly method: ParcnetRPCMethodName
  ) {
    super(`Missing permission ${missingPermission} when invoking ${method}`);
  }
}

export const PermissionRequestSchema = v.partial(
  v.object({
    READ_PUBLIC_IDENTIFIERS: v.object({}),
    SIGN_POD: v.object({}),
    REQUEST_PROOF: v.object({ collections: v.array(v.string()) }),
    READ_POD: v.object({ collections: v.array(v.string()) }),
    INSERT_POD: v.object({ collections: v.array(v.string()) }),
    DELETE_POD: v.object({ collections: v.array(v.string()) }),
    SUGGEST_PODS: v.object({ collections: v.array(v.string()) })
  })
);

export type PermissionRequest = v.InferOutput<typeof PermissionRequestSchema>;
