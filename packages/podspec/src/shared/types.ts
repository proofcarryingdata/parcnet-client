type IsSingleLiteralType<P, PCopy = P> = [P] extends [never]
  ? false
  : P extends unknown
    ? [PCopy] extends [P]
      ? true
      : false
    : never;

export type IsSingleLiteralString<T> = IsSingleLiteralType<T> extends true
  ? T extends string
    ? string extends T
      ? false
      : true
    : false
  : false;
