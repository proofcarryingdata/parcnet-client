export type ClientConnectionInfo = {
  url: string;
  type: "iframe";
};

export enum ClientConnectionErrorType {
  PERMISSION_DENIED = "PERMISSION_DENIED",
}

export type ClientConnectionError = {
  type: ClientConnectionErrorType.PERMISSION_DENIED;
  message: string;
};

export type ClientConnectionState =
  | {
      type: "connecting";
    }
  | {
      type: "connected";
    }
  | {
      type: "disconnected";
      error?: ClientConnectionError;
    };
