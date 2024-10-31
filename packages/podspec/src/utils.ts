export function deepFreeze<T extends object>(obj: T): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  Object.freeze(obj);

  Object.values(obj).forEach((value) => {
    if (value instanceof Uint8Array) {
      return;
    }
    deepFreeze(value);
  });

  return obj;
}
