import type {
  EntryTypes,
  EntryKeys,
  PODValueTupleForNamedEntries,
  EntriesOfType,
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

export type IsNotMemberOf<
  E extends EntryTypes,
  N extends EntryKeys<E> & string[],
> = {
  entries: N;
  type: "isNotMemberOf";
  isNotMemberOf: Concrete<MembershipListPersistent<E, N>>;
};

// Which entry types support range checks?
export type SupportsRangeChecks = "int" | "boolean" | "date";

export type RangeInput<
  E extends EntryTypes,
  N extends keyof EntriesOfType<E & VirtualEntries, SupportsRangeChecks> &
    string,
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
  N extends keyof EntriesOfType<E & VirtualEntries, SupportsRangeChecks> &
    string,
> = {
  entry: N;
  type: "inRange";
  inRange: RangePersistent;
};

export type NotInRange<
  E extends EntryTypes,
  N extends keyof EntriesOfType<E & VirtualEntries, SupportsRangeChecks> &
    string,
> = {
  entry: N;
  type: "notInRange";
  notInRange: RangePersistent;
};

export type EqualsEntry<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entry: N1;
  type: "equalsEntry";
  otherEntry: N2;
};

export type NotEqualsEntry<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entry: N1;
  type: "notEqualsEntry";
  otherEntry: N2;
};

export type GreaterThan<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entry: N1;
  type: "greaterThan";
  otherEntry: N2;
};

export type GreaterThanEq<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entry: N1;
  type: "greaterThanEq";
  otherEntry: N2;
};

export type LessThan<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entry: N1;
  type: "lessThan";
  otherEntry: N2;
};

export type LessThanEq<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries) & string,
  N2 extends keyof (E & VirtualEntries) & string,
> = {
  entry: N1;
  type: "lessThanEq";
  otherEntry: N2;
};

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
