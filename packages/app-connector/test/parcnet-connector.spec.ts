import crypto from "crypto";
import type {
  RPCMessage,
  SubscriptionUpdateResult
} from "@parcnet-js/client-rpc";
import { RPCMessageSchema, RPCMessageType } from "@parcnet-js/client-rpc";
import * as p from "@parcnet-js/podspec";
import { POD } from "@pcd/pod";
import * as v from "valibot";
import { assert, describe, expect, it } from "vitest";
import { postRPCMessage } from "../src/adapters/iframe.js";
import { ParcnetRPCConnector } from "../src/rpc_client.js";
import { connectedClient, mockDialog } from "./utils.js";

function generateRandomHex(byteLength: number): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return randomBytes.toString("hex");
}

describe("parcnet-client should work", function () {
  it("parcnet-client should throw when not connected", async function () {
    const chan = new MessageChannel();

    const client = new ParcnetRPCConnector(chan.port2, mockDialog);

    await expect(async () => {
      await client.identity.getSemaphoreV3Commitment();
    }).rejects.toThrow("Client is not connected");
  });

  it("parcnet-client should connect", async function () {
    const chan = new MessageChannel();

    const client = new ParcnetRPCConnector(chan.port2, mockDialog);
    expect(client.isConnected()).to.be.false;

    client.start(() => {
      // This is called when the connection is established
      expect(client.isConnected()).to.be.true;
    });

    postRPCMessage(chan.port1, {
      type: RPCMessageType.PARCNET_CLIENT_READY
    });

    // Waiting gives the client time to process the READY
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(client.isConnected()).to.be.true;
  });

  it("zupass-client should send requests and receive responses", async function () {
    const { chan, client } = await connectedClient();

    chan.port1.onmessage = (event): void => {
      const message = v.parse(RPCMessageSchema, event.data);
      assert(message.type === RPCMessageType.PARCNET_CLIENT_INVOKE);
      assert(message.fn === "identity.getSemaphoreV3Commitment");
      assert(message.args.length === 0);
      assert(message.serial === 1);
    };

    const promise = client.identity.getSemaphoreV3Commitment();

    postRPCMessage(chan.port1, {
      type: RPCMessageType.PARCNET_CLIENT_INVOKE_RESULT,
      serial: 1,
      result: BigInt("1")
    });

    await expect(promise).resolves.toBe(BigInt("1"));
  });

  it("zupass-client should throw an exception if an incorrect response is received", async function () {
    const { chan, client } = await connectedClient();

    chan.port1.onmessage = (event): void => {
      const message = v.parse(RPCMessageSchema, event.data);
      assert(message.type === RPCMessageType.PARCNET_CLIENT_INVOKE);
      assert(message.fn === "identity.getSemaphoreV3Commitment");
      assert(message.args.length === 0);
      assert(message.serial === 1);
    };

    const promise = client.identity.getSemaphoreV3Commitment();

    postRPCMessage(chan.port1, {
      type: RPCMessageType.PARCNET_CLIENT_INVOKE_RESULT,
      serial: 1,
      result: "INCORRECT" // Not a BigInt
    });

    await expect(promise).rejects.toThrow(
      `Failed to parse result for identity.getSemaphoreV3Commitment: Invalid type: Expected bigint but received "INCORRECT"`
    );
  });

  it("should notify when a subscription is updated", async function () {
    const { chan, client } = await connectedClient();

    const pod = POD.sign(
      {
        testEntry: { type: "string", value: "test" }
      },
      generateRandomHex(32)
    );
    const serializedPod = pod.serialize();

    const query = p.pod({
      entries: {
        testEntry: { type: "string" }
      }
    });

    const subscriptionPromise = client.pod.subscribe(
      "collection",
      query.schema
    );

    postRPCMessage(chan.port1, {
      type: RPCMessageType.PARCNET_CLIENT_INVOKE_RESULT,
      serial: 1,
      result: "test" // Subscription ID is "test"
    } satisfies RPCMessage);

    // Wait for the RPC call creating the subscription to complete
    await expect(subscriptionPromise).resolves.toBe("test");

    const waitForUpdatePromise = new Promise((resolve) => {
      client.on("subscription-update", (result: SubscriptionUpdateResult) => {
        resolve(result);
      });
    });

    postRPCMessage(chan.port1, {
      type: RPCMessageType.PARCNET_CLIENT_SUBSCRIPTION_UPDATE,
      subscriptionSerial: 1,
      subscriptionId: "test",
      update: [serializedPod]
    } satisfies RPCMessage);

    // Wait for the subscription update to be received
    await expect(waitForUpdatePromise).resolves.toMatchObject({
      subscriptionId: "test",
      update: [serializedPod]
    });
  });
});
