import type { PodspecProofRequest } from "@parcnet-js/podspec";
import type * as v from "valibot";
import { assertType, expectTypeOf, test } from "vitest";
import type { PodspecProofRequestSchema } from "../src/schema_elements.js";

type InferredPodspecProofRequest = v.InferOutput<
  typeof PodspecProofRequestSchema
>;

test("type", () => {
  expectTypeOf<InferredPodspecProofRequest>().toMatchTypeOf<PodspecProofRequest>();
  assertType<InferredPodspecProofRequest>({
    pods: {
      test: {
        pod: {
          entries: {
            name: {
              type: "string"
            }
          }
        }
      }
    }
  });
});
