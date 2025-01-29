import type {
  EntryTypes,
  EntryKeys,
  PODValueTupleForNamedEntries,
  EntriesOfType,
  VirtualEntries
} from "./entries.js";

/****************************************************************************
 * Statements
 ****************************************************************************/

export type IsMemberOf<
  E extends EntryTypes,
  N extends EntryKeys<E> & string[]
> = {
  entries: N;
  type: "isMemberOf";
  isMemberOf: PODValueTupleForNamedEntries<E, N>[];
};

export type IsNotMemberOf<E extends EntryTypes, N extends EntryKeys<E>> = {
  entries: N;
  type: "isNotMemberOf";
  isNotMemberOf: PODValueTupleForNamedEntries<E & VirtualEntries, N>[];
};

// Which entry types support range checks?
export type SupportsRangeChecks = "int" | "boolean" | "date";

export type InRange<
  E extends EntryTypes,
  N extends keyof EntriesOfType<E & VirtualEntries, SupportsRangeChecks>
> = {
  entry: N;
  type: "inRange";
  inRange: {
    min: E[N] extends "date" ? Date : bigint;
    max: E[N] extends "date" ? Date : bigint;
  };
};

export type NotInRange<
  E extends EntryTypes,
  N extends keyof EntriesOfType<E & VirtualEntries, SupportsRangeChecks>
> = {
  entry: N;
  type: "notInRange";
  notInRange: {
    min: E[N] extends "date" ? Date : bigint;
    max: E[N] extends "date" ? Date : bigint;
  };
};

export type EqualsEntry<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries),
  N2 extends keyof (E & VirtualEntries)
> = E[N2] extends E[N1]
  ? {
      entry: N1;
      type: "equalsEntry";
      equalsEntry: N2;
    }
  : never;

export type NotEqualsEntry<
  E extends EntryTypes,
  N1 extends keyof (E & VirtualEntries),
  N2 extends keyof (E & VirtualEntries)
> = E[N2] extends E[N1]
  ? {
      entry: N1;
      type: "notEqualsEntry";
      notEqualsEntry: N2;
    }
  : never;

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
  | NotEqualsEntry<any, string, string>;

// Base map of named statements
export type StatementMap = Record<string, Statements>;

/****************************************************************************
 * Statement naming
 ****************************************************************************/

// Utility types for statement naming
type JoinWithUnderscore<T extends readonly string[]> = T extends readonly [
  infer F extends string,
  ...infer R extends string[]
]
  ? R["length"] extends 0
    ? F
    : `${F}_${JoinWithUnderscore<R>}`
  : never;

type BaseStatementName<
  N extends readonly string[],
  S extends Statements["type"]
> = `${JoinWithUnderscore<N>}_${S}`;

type NextAvailableSuffix<
  Base extends string,
  S extends StatementMap
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
  Map extends StatementMap
> = NextAvailableSuffix<BaseStatementName<N, S>, Map>;
