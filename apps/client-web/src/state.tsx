import type { ConnectorAdvice } from "@parcnet-js/client-helpers";
import {
  PermissionRequestSchema,
  type ProveResult,
  type Zapp
} from "@parcnet-js/client-rpc";
import type { PodspecProofRequest } from "@parcnet-js/podspec";
import * as p from "@parcnet-js/podspec";
import { $s } from "@parcnet-js/podspec/pod_value_utils";
import { POD, encodePrivateKey, encodePublicKey } from "@pcd/pod";
import type { Identity as IdentityV4 } from "@semaphore-protocol/core";
import isEqual from "lodash/isEqual";
import { createContext, useContext, useReducer } from "react";
import * as v from "valibot";
import { PODCollectionManager } from "./client/pod_collection_manager";
import { getIdentity } from "./client/utils";

export enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
  AUTHORIZED
}

export const StateContext = createContext<
  | {
      state: ClientState;
      dispatch: React.Dispatch<ClientAction>;
    }
  | undefined
>(undefined);

function initializeState(): ClientState {
  return {
    embeddedMode: !!window.parent,
    connectionState: ConnectionState.CONNECTING,
    advice: null,
    zapp: null,
    zappOrigin: null,
    proofInProgress: undefined,
    identity: getIdentity(),
    pods: PODCollectionManager.loadFromStorage(),
    zapps: new Map([["test-zapp", "http://localhost:3200"]])
  } satisfies ClientState;
}

export const StateProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(
    clientReducer,
    undefined,
    initializeState
  );

  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
};

export function useAppState(): {
  state: ClientState;
  dispatch: React.Dispatch<ClientAction>;
} {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error("useState must be used within a StateProvider");
  }
  return context;
}

export type ClientState = {
  embeddedMode: boolean;
  connectionState: ConnectionState;
  advice: ConnectorAdvice | null;
  zapp: Zapp | null;
  zappOrigin: string | null;
  proofInProgress:
    | {
        pods: Record<string, POD[]>;
        selectedPods: Record<string, POD | undefined>;
        proofRequest: PodspecProofRequest;
        proving: boolean;
        resolve?: (result: ProveResult) => void;
      }
    | undefined;
  identity: IdentityV4;
  pods: PODCollectionManager;
  zapps: Map<string, string>;
};

export type ClientAction =
  | {
      type: "login";
      loggedIn: boolean;
    }
  | {
      type: "authorize";
      authorized: boolean;
    }
  | {
      type: "set-zapp";
      zapp: Zapp;
      origin: string;
    }
  | {
      type: "set-advice";
      advice: ConnectorAdvice;
    }
  | {
      type: "set-proof-in-progress";
      pods: Record<string, POD[]>;
      selectedPods: Record<string, POD | undefined>;
      proofRequest: PodspecProofRequest;
      proving: boolean;
      resolve?: (result: ProveResult) => void;
    }
  | {
      type: "clear-proof-in-progress";
    }
  | {
      type: "logout";
    };

export function clientReducer(state: ClientState, action: ClientAction) {
  switch (action.type) {
    case "login":
      return { ...state, loggedIn: action.loggedIn };
    case "authorize":
      if (!state.zapp || !state.zappOrigin) {
        throw new Error("No zapp or zapp origin");
      }
      const existingZapps = state.pods.get("zapps").query({
        entries: {
          name: { type: "string", isMemberOf: [$s(state.zapp.name)] },
          origin: { type: "string", isMemberOf: [$s(state.zappOrigin)] }
        },
        signerPublicKey: {
          isMemberOf: [encodePublicKey(state.identity.publicKey)]
        }
      });
      for (const match of existingZapps) {
        state.pods.get("zapps").delete(match.signature);
      }
      const zappPOD = POD.sign(
        {
          name: { type: "string", value: state.zapp.name },
          origin: {
            type: "string",
            value: state.zappOrigin
          },
          permissions: {
            type: "string",
            value: JSON.stringify(state.zapp.permissions)
          }
        },
        encodePrivateKey(Buffer.from(state.identity.export(), "base64"))
      );
      state.pods.get("zapps").insert(zappPOD);
      return {
        ...state,
        connectionState: ConnectionState.AUTHORIZED
      } satisfies ClientState;
    case "set-zapp":
      let authorized = false;
      const appPodSpec = p.pod({
        entries: {
          origin: {
            type: "string",
            isMemberOf: [$s(action.origin)]
          },
          name: {
            type: "string",
            isMemberOf: [$s(action.zapp.name)]
          },
          permissions: {
            type: "string"
          }
        }
      });

      const existingPODQuery = appPodSpec.query(
        state.pods.get("zapps").getAll()
      );
      if (existingPODQuery.matches.length === 1) {
        try {
          const existingPermissions = v.parse(
            PermissionRequestSchema,
            JSON.parse(
              existingPODQuery.matches[0].content.asEntries().permissions.value
            )
          );
          if (isEqual(existingPermissions, action.zapp.permissions)) {
            authorized = true;
          }
        } catch (e) {
          console.error("Error parsing permissions", e);
        }
      }
      return {
        ...state,
        zapp: action.zapp,
        zappOrigin: action.origin,
        connectionState: authorized
          ? ConnectionState.AUTHORIZED
          : ConnectionState.CONNECTED
      } satisfies ClientState;
    case "set-advice":
      return { ...state, advice: action.advice };
    case "set-proof-in-progress":
      return {
        ...state,
        proofInProgress: {
          pods: action.pods,
          selectedPods: action.selectedPods,
          proofRequest: action.proofRequest,
          proving: action.proving,
          resolve: action.resolve
        }
      };
    case "clear-proof-in-progress":
      return {
        ...state,
        proofInProgress: undefined
      };
    case "logout":
      return initializeState();
  }
}
