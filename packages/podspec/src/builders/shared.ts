export function validateRange(
  min: bigint | Date,
  max: bigint | Date,
  allowedMin: bigint | Date,
  allowedMax: bigint | Date
) {
  if (min > max) {
    throw new RangeError("Min must be less than or equal to max");
  }
  if (min < allowedMin || max > allowedMax) {
    throw new RangeError("Value out of range");
  }
}
