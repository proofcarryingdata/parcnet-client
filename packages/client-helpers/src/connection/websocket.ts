// pass in a websocket
// set up event handlers??
// wait til we get a connect
// return advice channel and zapp

import {
  ParcnetRPC,
  RPCMessage,
  RPCMessageType,
  SubscriptionResult
} from "@parcnet/client-rpc";
import JSONBig from "json-bigint";
import type { WebSocket } from "ws";
import { ConnectorAdvice } from "./advice.js";

export class WebsocketAdviceChannel implements ConnectorAdvice {
  private socket: WebSocket;
  private onReady: (rpc: ParcnetRPC) => void;

  constructor({
    socket,
    onReady
  }: {
    socket: WebSocket;
    onReady: (rpc: ParcnetRPC) => void;
  }) {
    this.socket = socket;
    this.onReady = onReady;
  }

  private send(message: RPCMessage): void {
    this.socket.send(JSONBig.stringify(message));
  }

  public showClient(): void {
    this.send({
      type: RPCMessageType.PARCNET_CLIENT_SHOW
    });
  }

  public hideClient(): void {
    this.send({
      type: RPCMessageType.PARCNET_CLIENT_HIDE
    });
  }

  public ready(rpc: ParcnetRPC): void {
    this.onReady(rpc);
    this.send({
      type: RPCMessageType.PARCNET_CLIENT_READY
    });
  }

  public subscriptionUpdate(
    { update, subscriptionId }: SubscriptionResult,
    subscriptionSerial: number
  ): void {
    this.send({
      type: RPCMessageType.PARCNET_CLIENT_SUBSCRIPTION_UPDATE,
      update,
      subscriptionId,
      subscriptionSerial
    });
  }
}
