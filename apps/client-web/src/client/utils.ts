import { POD } from "@pcd/pod";
import { z } from "zod";

export function validateInput<This, Args extends unknown[], Return>(
  parser: z.ZodSchema<Args>
) {
  return function actualDecorator(
    originalMethod: (this: This, ...args: Args) => Return,
    context: ClassMethodDecoratorContext
  ): (this: This, ...args: Args) => Return {
    function replacementMethod(this: This, ...args: Args): Return {
      const input = parser.safeParse(args);
      if (!input.success) {
        throw new Error(`Invalid arguments for ${context.name.toString()}`);
      }
      return originalMethod.call(this, ...input.data);
    }

    return replacementMethod;
  };
}

export function loadPODsFromStorage(): POD[] {
  let pods: POD[] = [];
  const storedSerializedPODs = localStorage.getItem("pod_collection");
  if (!storedSerializedPODs) {
    return pods;
  }
  try {
    const serializedPODs = JSON.parse(storedSerializedPODs);
    pods = serializedPODs.map(POD.deserialize);
  } catch (e) {
    // JSON parsing failed or POD deserialization failed
    console.error(e);
  }

  return pods;
}

export function savePODsToStorage(pods: POD[]): void {
  const serializedPODs = pods.map((pod) => pod.serialize());
  localStorage.setItem("pod_collection", JSON.stringify(serializedPODs));
}
