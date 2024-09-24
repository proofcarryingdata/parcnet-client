import type { Zapp } from "@parcnet-js/client-rpc";
import { InitializationMessageType } from "@parcnet-js/client-rpc";
import { ParcnetAPI } from "../api_wrapper.js";
import { ParcnetRPCConnector } from "../rpc_client.js";
import type { DialogController } from "./iframe.js";
import { postWindowMessage } from "./iframe.js";

export function isHosted(): boolean {
  return window.parent !== window.self;
}

class HostedDialogController implements DialogController {
  show(): void {
    // For embedded apps, we don't need to do anything because the hosting
    // app will show any dialogs it needs to.
  }
  close(): void {
    // For embedded apps, we don't need to do anything because the hosting
    // app will close any dialogs it needs to.
  }
}

export function connectToHost(zapp: Zapp): Promise<ParcnetAPI> {
  if (!isHosted()) {
    throw new Error("Zapp must be hosted inside an iframe");
  }

  return new Promise<ParcnetAPI>((resolve) => {
    // Create a new MessageChannel to communicate with the parent window
    const chan = new MessageChannel();

    // Create a new RPC client
    const client = new ParcnetRPCConnector(
      chan.port2,
      new HostedDialogController()
    );
    // Tell the RPC client to start. It will call the function we pass in
    // when the connection is ready, at which point we can resolve the
    // promise and return the API wrapper to the caller.
    // See below for how the other port of the message channel is sent to
    // the client.
    client.start(() => {
      resolve(new ParcnetAPI(client));
    });

    // Send the other port of the message channel to the client
    postWindowMessage(
      window.parent,
      {
        type: InitializationMessageType.PARCNET_CLIENT_CONNECT,
        zapp: zapp
      },
      "*",
      // Our RPC client has port2, send port1 to the client
      [chan.port1]
    );
  });
}
