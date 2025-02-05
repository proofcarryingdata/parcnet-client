import type { PODValue } from "@pcd/pod";
import { assert, describe, expect, it } from "vitest";
import { PODSpecBuilder } from "../src/index.js";
import { podValidator } from "../src/processors/validate/podValidator.js";
import { signPOD, signerKeyPair } from "./fixtures.js";

describe("endToEnd", () => {
  it("should be able to use specs to do various things", () => {
    // First of all, we want to be able to describe a POD in the abstract.
    {
      // Here is a PODSpecBuilder:
      const builder = PODSpecBuilder.create()
        .entry("name", "string")
        .entry("date_of_birth", "date")
        .entry("email", "string");

      // Calling the spec() method on the builder outputs a Spec.
      const spec = builder.spec();

      // A Spec is just some JSON-compatible data:
      expect(spec).toEqual({
        entries: {
          name: "string",
          date_of_birth: "date",
          email: "string",
        },
        statements: {},
      });

      // We can extend our builder to add more entries.
      // Each builder instance is immutable, so adding an entry returns a new
      // builder.
      const builder2 = builder.entry("phone", "string");

      // builder2 outputs a different spec, which includes the new entry:
      const spec2 = builder2.spec();
      expect(spec2.entries).toMatchObject({
        phone: "string",
      });

      // We can also add "statements" to the spec.
      // Let's add an "inRange" statement, constraining the date_of_birth
      // entry.
      const builder3 = builder2.inRange(
        "date_of_birth",
        {
          min: new Date("1990-01-01"),
          max: new Date("1999-12-31"),
        },
        // We can optionally give our statements names, otherwise they'll be
        // given a default name based on the statement type and the entries
        // it operates on. Memorable names can convey intent.
        "bornInThe90s"
      );

      // The new spec includes our statement:
      const spec3 = builder3.spec();
      expect(spec3.statements).toEqual({
        bornInThe90s: {
          type: "inRange",
          entries: ["date_of_birth"],
          inRange: {
            // For JSON-compatibility, complex values are serialized to strings.
            min: new Date("1990-01-01").getTime().toString(),
            max: new Date("1999-12-31").getTime().toString(),
          },
        },
      });

      // From the top, our spec looks like this:
      expect(spec3).toEqual({
        entries: {
          name: "string",
          date_of_birth: "date",
          email: "string",
          phone: "string",
        },
        statements: {
          bornInThe90s: {
            type: "inRange",
            entries: ["date_of_birth"],
            inRange: {
              min: new Date("1990-01-01").getTime().toString(),
              max: new Date("1999-12-31").getTime().toString(),
            },
          },
        },
      });

      // What can we do with this?

      // We can use it to validate a POD
      const pod = signPOD({
        name: {
          type: "string",
          value: "John Doe",
        },
        date_of_birth: {
          type: "date",
          value: new Date("1995-01-01"),
        },
        email: {
          type: "string",
          value: "john.doe@example.com",
        },
        phone: {
          type: "string",
          value: "1234567890",
        },
      });

      const result = podValidator(spec3).validate(pod);
      // This POD has all of the expect entries, and the statements are true,
      // so it passes validation.
      assert(result.isValid === true);

      // The result gives us our POD back, but now it's strongly-typed:
      const validatedPod = result.value;
      // Here's some TypeScript to prove it:
      validatedPod.content.asEntries().date_of_birth.value satisfies Date;
      validatedPod.content.asEntries().name.value satisfies string;
      validatedPod.content.asEntries().email.value satisfies string;
      validatedPod.content.asEntries().phone.value satisfies string;
      // It's still a regular POD, and might have other entries our spec
      // doesn't cover, and these have their original types:
      validatedPod.content.asEntries().somethingElse satisfies
        | PODValue
        | undefined;

      // Let's try a bad POD, where the statements are false.
      const badPod = signPOD({
        name: {
          type: "string",
          value: "Jim Bob",
        },
        date_of_birth: {
          type: "date",
          // Such a near miss!
          value: new Date("1989-12-31"),
        },
        email: {
          type: "string",
          value: "john.doe@example.com",
        },
        phone: {
          type: "string",
          value: "1234567890",
        },
      });

      const result2 = podValidator(spec3).validate(badPod);
      // Jim's POD is not valid
      assert(!result2.isValid);
      // We got a negative result from a statement
      assert(result2.issues[0]?.code === "statement_negative_result");
      // Jim wasn't born in the 90s, so this statement is false
      assert(result2.issues[0]?.statementName === "bornInThe90s");
      assert(result2.issues[0]?.statementType === "inRange");
      expect(result2.issues[0]?.entries).toEqual(["date_of_birth"]);

      // We can also create a new spec with some statements removed.
      const builder4 = builder3.omitStatements(["bornInThe90s"]);
      const spec4 = builder4.spec();
      expect(spec4.statements).toEqual({});

      // Since we're not longer checking the "bornInThe90s" statement, this POD
      // should now be valid.
      const result3 = podValidator(spec4).validate(pod);
      assert(result3.isValid === true);

      // We can reference virtual entries in statements:
      const builder5 = builder4.isMemberOf(
        ["$signerPublicKey"],
        [signerKeyPair.publicKey]
      );
      const spec5 = builder5.spec();

      // We didn't give that statement a name, so it's given a default name
      // based on the statement type and the entries it operates on, which in
      // this case is "$signerPublicKey_isMemberOf".
      expect(spec5.statements).toEqual({
        $signerPublicKey_isMemberOf: {
          type: "isMemberOf",
          entries: ["$signerPublicKey"],
          isMemberOf: [[signerKeyPair.publicKey]],
        },
      });

      // Since the statement is true, the POD is valid.
      const result4 = podValidator(spec5).validate(pod);
      assert(result4.isValid === true);

      // We can also perform membership checks on tuples of entries, including
      // a mix of regular and virtual entries:
      const builder6 = builder5.isMemberOf(
        ["$signerPublicKey", "date_of_birth", "$contentID"],
        [
          [
            // Obviously these will match!
            pod.signerPublicKey,
            // Tuples are strongly-typed based on the entry types, so we need
            // to provide inputs of the correct types, e.g. dates
            new Date("1995-01-01"),
            pod.contentID,
          ],
        ]
      );
      const spec6 = builder6.spec();

      // Since all of these entries match values in the POD, the statement is
      // true, and the POD is valid.
      const result5 = podValidator(spec6).validate(pod);
      assert(result5.isValid === true);
    }
  });
});
