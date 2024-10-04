import crypto from "node:crypto";
import { decodePrivateKey, encodePublicKey } from "@pcd/pod";
import { derivePublicKey } from "@zk-kit/eddsa-poseidon";

export function generateRandomHex(byteLength: number): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return randomBytes.toString("hex");
}

export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const privateKey = generateRandomHex(32);
  const publicKey = encodePublicKey(
    derivePublicKey(decodePrivateKey(privateKey))
  );
  console.log("privateKey", privateKey);
  console.log("publicKey", publicKey);
  return { privateKey, publicKey };
}
