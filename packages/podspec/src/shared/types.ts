export type IsLiteral<T> = string extends T
  ? false
  : T extends string
    ? true
    : false;
