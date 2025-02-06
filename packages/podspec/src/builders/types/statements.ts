import type {
  EntriesOfType,
  EntryKeys,
  EntryTypes,
  PODValueTupleForNamedEntries,
  VirtualEntries,
} from "./entries.js";

/****************************************************************************
 * Statements
 ****************************************************************************/

export type MembershipListInput<
  E extends EntryTypes,
  N extends EntryKeys<E>,
> = PODValueTupleForNamedEntries<E, N>[];

export type MembershipListPersistent<
  E extends EntryTypes,
  N extends EntryKeys<E>,
> = { [K in keyof N]: string }[];

type Concrete<T> = T extends object ? { [K in keyof T]: T[K] } : T;

export type IsMemberOf<
  E extends EntryTypes,
  N extends EntryKeys<E> & string[],
> = {
  entries: N;
  type: "isMemberOf";
  isMemberOf: Concrete<MembershipListPersistent<E, N>>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyIsMemberOf = IsMemberOf<any, any>;

export type IsNotMemberOf<
  E extends EntryTypes,
  N extends EntryKeys<E> & string[],
> = {
  entries: N;
  type: "isNotMemberOf";
  isNotMemberOf: Concrete<MembershipListPersistent<E, N>>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyIsNotMemberOf = IsNotMemberOf<any, any>;

// Which entry types support range checks?
export type SupportsRangeChecks = "int" | "boolean" | "date";
export type EntriesWithRangeChecks<E extends EntryTypes> = EntriesOfType<
  E,
  SupportsRangeChecks
>;

export type RangeInput<
  E extends EntryTypes,
  N extends keyof EntriesWithRangeChecks<E> & string,
> = {
  min: E[N] extends "date" ? Date : bigint;
  max: E[N] extends "date" ? Date : bigint;
};

export type RangePersistent = {
  min: string;
  max: string;
};

export type InRange<
  E extends EntryTypes,
  N extends keyof EntriesWithRangeChecks<E> & string,
> = {
  entries: [entry: N];
  type: "inRange";
  inRange: RangePersistent;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyInRange = InRange<any, any>;

export type NotInRange<
  E extends EntryTypes,
  N extends keyof EntriesWithRangeChecks<E> & string,
> = {
  entries: [entry: N];
  type: "notInRange";
  notInRange: RangePersistent;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyNotInRange = NotInRange<any, any>;

export type EqualsEntry<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entries: [entry: N1, otherEntry: N2];
  type: "equalsEntry";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEqualsEntry = EqualsEntry<any, any, any>;

export type NotEqualsEntry<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entries: [entry: N1, otherEntry: N2];
  type: "notEqualsEntry";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyNotEqualsEntry = NotEqualsEntry<any, any, any>;

export type GreaterThan<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entries: [entry: N1, otherEntry: N2];
  type: "greaterThan";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGreaterThan = GreaterThan<any, any, any>;

export type GreaterThanEq<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entries: [entry: N1, otherEntry: N2];
  type: "greaterThanEq";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGreaterThanEq = GreaterThanEq<any, any, any>;

export type LessThan<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entries: [entry: N1, otherEntry: N2];
  type: "lessThan";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLessThan = LessThan<any, any, any>;

export type LessThanEq<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entries: [entry: N1, otherEntry: N2];
  type: "lessThanEq";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLessThanEq = LessThanEq<any, any, any>;

export type Statements =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | IsMemberOf<any, string[]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | IsNotMemberOf<any, string[]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | InRange<any, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | NotInRange<any, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | EqualsEntry<any, string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | NotEqualsEntry<any, string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | GreaterThan<any, string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | GreaterThanEq<any, string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | LessThan<any, string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | LessThanEq<any, string, string>;

export type StatementMap = Record<string, Statements>;

/****************************************************************************
 * Statement naming
 ****************************************************************************/

// Utility types for statement naming
type JoinWithUnderscore<T extends readonly string[]> = T extends readonly [
  infer F extends string,
  ...infer R extends string[],
]
  ? R["length"] extends 0
    ? F
    : `${F}_${JoinWithUnderscore<R>}`
  : never;

type BaseStatementName<
  N extends readonly string[],
  S extends Statements["type"],
> = `${JoinWithUnderscore<N>}_${S}`;

type NextAvailableSuffix<
  Base extends string,
  S extends StatementMap,
> = Base extends keyof S
  ? `${Base}_1` extends keyof S
    ? `${Base}_2` extends keyof S
      ? `${Base}_3`
      : `${Base}_2`
    : `${Base}_1`
  : Base;

export type StatementName<
  N extends readonly string[],
  S extends Statements["type"],
  Map extends StatementMap,
> = NextAvailableSuffix<BaseStatementName<N, S>, Map>;
