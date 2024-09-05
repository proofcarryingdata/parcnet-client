import { RPCMessageType } from "@parcnet/client-rpc";
import { expect } from "chai";
import { DialogController, postRPCMessage } from "../src";
import { ParcnetRPCConnector } from "../src/rpc_client";

export const mockDialog: DialogController = {
  show: () => {},
  close: () => {}
};

export async function connectedClient(): Promise<{
  chan: MessageChannel;
  client: ParcnetRPCConnector;
}> {
  const chan = new MessageChannel();
  const client = new ParcnetRPCConnector(chan.port2, mockDialog);
  client.start(() => {
    // This is called when the connection is established
    expect(client.isConnected()).to.be.true;
  });

  postRPCMessage(chan.port1, {
    type: RPCMessageType.PARCNET_CLIENT_READY
  });

  // Waiting gives the client time to process the READY
  await new Promise((resolve) => setTimeout(resolve, 100));

  return { chan, client };
}
