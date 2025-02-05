import { POD, type PODEntries } from "@pcd/pod";
import { generateKeyPair } from "./utils.js";

export const signerKeyPair = generateKeyPair();

const serializedFrogPOD = {
  entries: {
    beauty: 4,
    biome: 3,
    description:
      'The Blue Poison Dart Frog\'s vivid blue skin contains potent alkaloid toxins, which are derived from the insects they consume in the wild and serve as a defense mechanism against predators. Indigenous people of Central and South America have utilized these toxins to poison the tips of blowdarts, a traditional method of hunting small game, giving the frog its "dart frog" name.',
    frogId: 24,
    imageUrl:
      "https://api.zupass.org/frogcrypto/images/84155a67-7004-45a6-b4b4-88ecf82aa685",
    intelligence: 6,
    jump: 2,
    name: "Blue Poison Dart Frog",
    owner: {
      cryptographic:
        "0x16949a3e1331b41d4e3c75897e131659c0fee2645246409c31e8736cf3fef2ad",
    },
    ownerPubKey: {
      eddsa_pubkey: "iidEhpJV0+1wbABFyXAZaI0xPBTAzfj37s27yIIzeKs",
    },
    pod_type: "frogcrypto.frog",
    rarity: 1,
    speed: 7,
    temperament: 16,
    timestampSigned: 1736429797878,
  },
  signature:
    "4BXTY+DwMGR74ftdQ6MgVldOoM0alWn6WPgI2bLxeoPWYMOOMK8bJHpJkV0rbvXlKyjKw9nkK6eJ5UOby5pOBA",
  signerPublicKey: "4sGycsjU8rG8FzKyvZd9h9632oR0qhs6DoNk4YTkHSE",
};

const frogPODEntries = POD.fromJSON(serializedFrogPOD).content.asEntries();

export function signPOD(entries: PODEntries): POD {
  return POD.sign(entries, signerKeyPair.privateKey);
}

export function newFrogPOD({
  owner = signerKeyPair.publicKey,
  beauty = Math.round(Math.random() * 10),
  intelligence = Math.round(Math.random() * 10),
  jump = Math.round(Math.random() * 10),
  speed = Math.round(Math.random() * 10),
}: {
  owner?: string;
  beauty?: number;
  intelligence?: number;
  jump?: number;
  speed?: number;
} = {}): POD {
  const entries: PODEntries = {
    ...frogPODEntries,
    beauty: { value: BigInt(beauty), type: "int" },
    intelligence: { value: BigInt(intelligence), type: "int" },
    jump: { value: BigInt(jump), type: "int" },
    speed: { value: BigInt(speed), type: "int" },
    ownerPubKey: { type: "eddsa_pubkey", value: owner },
  };
  return POD.sign(entries, signerKeyPair.privateKey);
}

export function newTicketPOD({
  owner = signerKeyPair.publicKey,
  eventId = "event",
  productId = "product",
  ticketId = "ticket",
}: {
  owner?: string;
  eventId?: string;
  productId?: string;
  ticketId?: string;
} = {}): POD {
  const entries: PODEntries = {
    attendeeEmail: { value: "user@test.com", type: "string" },
    attendeeName: { value: "test name", type: "string" },
    attendeeSemaphoreId: { value: 12345n, type: "cryptographic" },
    checkerEmail: { value: "checker@test.com", type: "string" },
    eventId: { value: eventId, type: "string" },
    eventName: { value: "event", type: "string" },
    isConsumed: { value: 0n, type: "int" },
    isRevoked: { value: 0n, type: "int" },
    owner: {
      value: owner,
      type: "eddsa_pubkey",
    },
    pod_type: { value: "zupass.ticket", type: "string" },
    productId: {
      value: productId,
      type: "string",
    },
    ticketCategory: { value: 1n, type: "int" },
    ticketId: { value: ticketId, type: "string" },
    ticketName: { value: "ticket", type: "string" },
    timestampConsumed: { value: 1731888000000n, type: "int" },
    timestampSigned: { value: 1731283200000n, type: "int" },
  };
  return POD.sign(entries, signerKeyPair.privateKey);
}
