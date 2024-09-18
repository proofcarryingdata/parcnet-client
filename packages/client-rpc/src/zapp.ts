import * as v from "valibot";

export const ZappSchema = v.object({
  name: v.string(),
  permissions: v.optional(v.array(v.string()))
});

export type Zapp = v.InferOutput<typeof ZappSchema>;
