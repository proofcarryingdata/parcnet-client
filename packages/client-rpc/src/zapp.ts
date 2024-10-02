import * as v from "valibot";
import { PermissionRequestSchema } from "./permissions.js";

export const ZappSchema = v.object({
  name: v.string(),
  permissions: PermissionRequestSchema
});

export type Zapp = v.InferOutput<typeof ZappSchema>;
