import { POD_INT_MAX, POD_INT_MIN, type PODIntValue } from "@pcd/pod/podTypes";
import type { IntEntrySpec } from "../types/entries.js";
import { checkPODValue } from "@pcd/pod/podChecks";

function validateRange(
  min: bigint,
  max: bigint,
  allowedMin: bigint,
  allowedMax: bigint
) {
  if (min > max) {
    throw new RangeError("Min must be less than or equal to max");
  }
  if (min < allowedMin || max > allowedMax) {
    throw new RangeError("Value out of range");
  }
}

export class IntEntrySpecBuilder<T extends IntEntrySpec> {
  private readonly spec: T;

  constructor(spec: T) {
    this.spec = spec;
  }

  public inRange(min: bigint, max: bigint): IntEntrySpecBuilder<T> {
    validateRange(min, max, POD_INT_MIN, POD_INT_MAX);
    return new IntEntrySpecBuilder({
      ...this.spec,
      inRange: { min, max }
    });
  }

  public isMemberOf(values: PODIntValue[]): IntEntrySpecBuilder<T> {
    for (const value of values) {
      checkPODValue("", value);
    }
    return new IntEntrySpecBuilder({
      ...this.spec,
      isMemberOf: values
    });
  }

  public isNotMemberOf(values: PODIntValue[]): IntEntrySpecBuilder<T> {
    return new IntEntrySpecBuilder({
      ...this.spec,
      isNotMemberOf: values
    });
  }

  public build(): T {
    return this.spec;
  }
}
