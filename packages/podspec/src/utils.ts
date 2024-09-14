export function deepFreeze<T extends object>(obj: T): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  Object.freeze(obj);

  Object.values(obj).forEach((value) => {
    deepFreeze(value);
  });

  return obj;
}

export function extend<T, R>(
  thing: T,
  updater: (thing: T) => R extends T ? R : never
): R {
  const clone = structuredClone(thing);
  return updater(clone);
}

type DeepMerge<T, U> = T extends object
  ? U extends object
    ? {
        [K in keyof T | keyof U]: K extends keyof T
          ? K extends keyof U
            ? DeepMerge<T[K], U[K]>
            : T[K]
          : K extends keyof U
            ? U[K]
            : never;
      }
    : T
  : U;

export function typedMerge<T extends object, U extends Partial<T>>(
  target: T,
  source: U
): DeepMerge<T, U> {
  return { ...target, ...source } as DeepMerge<T, U>;
}
