# Podspec

> **specific** | spɪˈsɪfɪk |
> _adjective_
>
> - clearly defined or identified
>
> ORIGIN mid 17th century (originally in the sense 'having a special determining quality'): from late Latin **_specificus_**, from Latin **_species_**

A library for validating the structure of [POD](https://pod.org)s in TypeScript, providing static types and runtime validation.

## Usage

Install the package:

```bash
npm install @pcd/podspec
```

Create a POD spec:

```ts
import { p } from "@pcd/podspec";

const spec = p.entries({
  name: { type: "string" },
  email: { type: "string" },
  high_score: { type: "int" }
});
```

Then use the spec to validate POD entries:

```ts
const entries = {
  name: { type: "string", value: "Bob Dugnutt" },
  email: { type: "string", value: "bob@dugnutt.com" },
  high_score: { type: "int", value: 999999 }
};

const result = spec.parse(entries);
if (result.isValid) {
  // Ready to use the POD
  result.value; // Contains the POD entries
} else {
  // Handle the error
  result.errors; // Contains information about the errors
}
```

If the entries are valid, `result.value` will be a `PODEntries` object, with static types for the entries which are part of the spec. Otherwise, `result.errors` will contain information about the errors encountered during parsing.

## Use cases

### Validating PODEntries before signing a POD

When signing a POD, we want to make sure that the POD's entries meet our expectations. This means not just that the POD is well-formed, but that it also has the right structure and types.

For example, if we have a POD that represents a weapon in a game, we might have a spec that looks like this:

```ts
const weaponSpec = p.entries({
  name: { type: "string" },
  damage: { type: "int" },
  durability: { type: "int" },
  price: { type: "int" }
});
```

Now we can use the spec to validate POD entries before signing a POD:

```ts
const entries = {
  name: { type: "string", value: "Narsil" },
  damage: { type: "int", value: 10n },
  durability: { type: "int", value: 100n },
  price: { type: "int", value: 100n }
};

const result = weaponSpec.parse(entries);
if (result.isValid) {
  // Ready to sign the POD
} else {
  // Handle the error
  result.errors; // Contains information about the errors
}
```

### Turning JavaScript objects into PODEntries

In the above example, we assumed that already had POD entries to validate. However, we might have a JavaScript object that we want to turn into POD entries. `podspec` can do some simple transformations to turn JavaScript objects into POD entries.

To coerce JavaScript objects into POD entries, set the `coerce` option to `true`:

```ts
const javascriptObject = {
  name: "Narsil",
  damage: 10,
  durability: 100,
  price: 100
};

const result = weaponSpec.parse(javascriptObject, { coerce: true });
if (result.isValid) {
  // Ready to sign the POD
} else {
  // Handle the error
  result.errors; // Contains information about the errors
}
```

Here, regular JavaScript objects are turned into POD entries. In particular, numbers are turned into `int`s, and strings are turned into `string`s.

### Validating an existing POD

If you have a POD that is already signed, you can use `podspec` to validate the POD, including both the entries and the signer public key.

```ts
const pod = getPodFromSomewhere();
const pubKey = "expected_public_key";
const entriesSpec = p.entries({
  eventId: { type: "string" },
  productId: { type: "string" }
});
const podSpec = p.pod({ 
  entries: entriesSpec.schema,
  signerPublicKey: { isMemberOf: [pubKey] }
});

const result = podSpec.parse(pod);
if (result.isValid) {
  // Ready to use the POD
} else {
  // Handle the error
  result.errors; // Contains information about the errors
}
```

This will check that the POD has the right structure and types, and that the signer is the expected signer.

### Querying a collection of PODs for matches

If you have a collection of PODs, you can use the spec to query the collection for PODs that match the spec:

```ts
const pods = [pod1, pod2, pod3];
const entriesSpec = p.entries({
  eventId: p.string(),
  productId: p.string()
});
const podSpec = p.pod({ entries: entriesSpec.schema });
const result = podSpec.query(pods);
result.matches; // Contains the PODs that match the spec
result.matchingIndexes; // Contains the array indexes of the PODs that match the spec
```

## Other constraints

### Range checks

As well as ensuring the existence and type of POD entries, `podspec` also provides some additional constraints, such as range and list checks.

```ts
const rangeSpec = p.entries({
  value: { type: "int", inRange: { min: 0n, max: 50n }}
});

const entries = {
  value: { type: "int", value: 50n }
};

const result = rangeSpec.parse(entries);
```

This will parse successfully. This will not:

```ts
const entries = {
  value: { type: "int", value: 200n }
};

const result = rangeSpec.parse(entries);
```

### List checks

Entries can be checked against a list of values:

```ts
const listSpec = p.entries({
  value: { type: "int", isMemberOf: [
    { type: "int", value: 1n },
    { type: "int", value: 2n },
    { type: "int", value: 3n },
  ]}
});

const entries = {
  value: { type: "int", value: 2n }
};

const result = listSpec.parse(entries);
```

This will parse successfully because the value `2n` in the list.

Lists can also be used to specify invalid values which should not be allowed:

```ts
const listSpec = p.entries({
  value: { type: "int", isNotMemberOf: [
    { type: "int", value: 1n },
    { type: "int", value: 2n },
    { type: "int", value: 3n },
  ]}
});

const entries = {
  value: { type: "int", value: 2n }
};

const result = listSpec.parse(entries);
```

This will not parse successfully because the value `2n` is in the list of excluded values.

### Tuple checks

Multiple entries can be checked against a list of valid tuples.

```ts
const entriesSpec = p
  .entries({
    foo: { type: "string" },
    bar: { type: "int" }
  });

const podSpec = p.pod({
  entries: entriesSpec.schema,
  tuples: [{
    entries: ["foo", "bar"],
    isMemberOf: [
      [
        { type: "string", value: "test" },
        { type: "int", value: 5n }
      ],
      [
        { type: "string", value: "test2" },
        { type: "int", value: 10n }
      ]
    ]
  }]
});
```

In this example, we will accept any set of POD entries which has either `a foo entry with value "test" and a bar entry with value 5n` or `a foo entry with value "test2" and a bar entry with value 10n`.

```ts
const entries = {
  foo: { type: "string", value: "test" },
  bar: { type: "int", value: 5n }
};

const result = tupleSpec.parse(entries);
```

This matches the first tuple in the list, so the result will be valid.

```ts
const entries = {
  foo: { type: "string", value: "test2" },
  bar: { type: "int", value: 10n }
};

const result = tupleSpec.parse(entries);
```

This matches the second tuple in the list, so the result will be valid.

```ts
const entries = {
  foo: { type: "string", value: "test" },
  bar: { type: "int", value: 10n }
};

const result = tupleSpec.parse(entries);
```

This has a `foo` entry which matches the first tuple, and a `bar` entry which matches the second tuple, but does not match either tuple as a whole. Therefore, the result will be invalid.
