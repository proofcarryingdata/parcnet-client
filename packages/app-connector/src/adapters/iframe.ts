import type {
  InitializationMessage,
  RPCMessage,
  Zapp
} from "@parcnet-js/client-rpc";
import { InitializationMessageType } from "@parcnet-js/client-rpc";
import { createNanoEvents } from "nanoevents";
import { ParcnetAPI } from "../api_wrapper.js";
import { UserCancelledConnectionError } from "../errors.js";
import { ParcnetRPCConnector } from "../rpc_client.js";

export type ModalEvents = {
  close: () => void;
};

export type ModalEmitter = ReturnType<typeof createNanoEvents<ModalEvents>>;

class DialogControllerImpl implements DialogController {
  #dialog: HTMLDialogElement;

  constructor(dialog: HTMLDialogElement) {
    this.#dialog = dialog;
  }

  public show(): void {
    this.#dialog.showModal();
  }

  public close(): void {
    this.#dialog.close("REMOTELY_CLOSED");
  }
}

export interface DialogController {
  show(): void;
  close(): void;
}

export type InitContext = {
  iframe: Window;
  emitter: ModalEmitter;
  dialog: HTMLDialogElement;
};

export function init(
  element: HTMLElement,
  clientUrl: string
): Promise<InitContext> {
  // Will throw if the URL is invalid
  const normalizedUrl = new URL(clientUrl);

  const emitter = createNanoEvents<ModalEvents>();

  // Create a dialog to hold the client iframe
  const dialog = document.createElement("dialog");
  dialog.style.borderWidth = "0px";
  dialog.style.borderRadius = "16px";
  dialog.style.padding = "0px";
  dialog.style.backgroundColor = "white";
  dialog.style.overflow = "hidden";
  dialog.style.width = "90vw";
  dialog.style.maxWidth = "600px";
  dialog.style.height = "90vh";
  dialog.classList.add("parcnet-dialog");

  dialog.addEventListener("close", (ev: Event) => {
    if ((ev.target as HTMLDialogElement)?.returnValue !== "REMOTELY_CLOSED") {
      emitter.emit("close");
    }
  });

  // Add a backdrop to the dialog
  const style = document.createElement("style");
  style.textContent = `.parcnet-dialog::backdrop {
 position: fixed;
 top: 0px;
 right: 0px;
 bottom: 0px;
 left: 0px;
 background: rgba(0, 0, 0, 0.3);;
 }`;
  dialog.appendChild(style);

  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";
  dialog.appendChild(container);
  // "Open" shadow DOM allows inspection of the iframe's DOM.
  // At a later date we may want to make this "closed" in order to restrict
  // what the parent page can access.
  const shadow = container.attachShadow({ mode: "open" });

  element.innerHTML = "";
  element.appendChild(dialog);

  // Create the iframe that will host the client
  const iframe = document.createElement("iframe");
  const sandboxAttr = document.createAttribute("sandbox");
  const scrollingAttr = document.createAttribute("scrolling");
  scrollingAttr.value = "no";

  sandboxAttr.value =
    "allow-same-origin allow-scripts allow-popups allow-modals allow-forms allow-storage-access-by-user-activation allow-popups-to-escape-sandbox";
  iframe.attributes.setNamedItem(sandboxAttr);
  iframe.style.borderWidth = "0px";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.src = normalizedUrl.toString();

  return new Promise<InitContext>((resolve, reject) => {
    iframe.addEventListener(
      "load",
      () => {
        const contentWindow = iframe.contentWindow;
        if (contentWindow) {
          // @todo Blink (and maybe Webkit) will discard messages if there's no
          // handler yet, so we need to wait a bit and/or retry until the client is
          // ready
          // The client takes a few seconds to load, so waiting isn't a bad solution
          window.setTimeout(
            () => resolve({ iframe: contentWindow, emitter, dialog }),
            1000
          );
        } else {
          reject(new Error("no iframe content window!"));
          console.error("no iframe content window!");
        }
      },
      { once: true }
    );
    shadow.appendChild(iframe);
  });
}

/**
 * Connects to PARCNET and returns a ParcnetAPI object.
 *
 * @param zapp - The Zapp iniating the connection.
 * @param element - The element to attach the client iframe to.
 * @param clientUrl - The URL of the Parcnet client to connect to.
 * @returns A promise that resolves to a ParcnetAPI object.
 */
export async function connect(
  zapp: Zapp,
  element: HTMLElement,
  clientUrl = "https://zupass.org"
): Promise<ParcnetAPI> {
  const context = await init(element, clientUrl);
  return doConnect(zapp, context);
}

export function doConnect(
  zapp: Zapp,
  { iframe, emitter, dialog }: InitContext
): Promise<ParcnetAPI> {
  return new Promise<ParcnetAPI>((resolve, reject) => {
    const unsubscribeCloseEvent = emitter.on("close", () => {
      reject(new UserCancelledConnectionError());
    });

    // Create a new MessageChannel to communicate with the iframe
    const chan = new MessageChannel();

    // Create a new RPC client
    const client = new ParcnetRPCConnector(
      chan.port2,
      new DialogControllerImpl(dialog)
    );
    // Tell the RPC client to start. It will call the function we pass in
    // when the connection is ready, at which point we can resolve the
    // promise and return the API wrapper to the caller. Alternatively,
    // the user can cancel the connection, in which case we reject the
    // promise.
    // See below for how the other port of the message channel is sent to
    // the client.
    client.start(
      () => {
        unsubscribeCloseEvent();
        resolve(new ParcnetAPI(client, emitter));
      },
      () => {
        unsubscribeCloseEvent();
        reject(new UserCancelledConnectionError());
      }
    );

    postWindowMessage(
      iframe,
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

export function postWindowMessage(
  window: Window,
  message: InitializationMessage,
  targetOrigin: string,
  transfer: Transferable[] = []
): void {
  window.postMessage(message, targetOrigin, transfer);
}

export function postRPCMessage(port: MessagePort, message: RPCMessage): void {
  port.postMessage(message);
}
