import type { ConnectorAdvice } from "@parcnet-js/client-helpers";
import type { PODData, ProveResult, Zapp } from "@parcnet-js/client-rpc";
import type { PodspecProofRequest } from "@parcnet-js/podspec";
import type { Identity as IdentityV4 } from "@semaphore-protocol/core";
import { createContext, useContext, useReducer } from "react";
import { PODCollection } from "./client/pod_collection";
import { getIdentity, loadPODsFromStorage } from "./client/utils";

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
    loggedIn: false,
    advice: null,
    zapp: null,
    authorized: false,
    proofInProgress: undefined,
    identity: getIdentity(),
    pods: new PODCollection(loadPODsFromStorage()),
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
  loggedIn: boolean;
  authorized: boolean;
  advice: ConnectorAdvice | null;
  zapp: Zapp | null;
  proofInProgress:
    | {
        pods: Record<string, PODData[]>;
        selectedPods: Record<string, PODData | undefined>;
        proofRequest: PodspecProofRequest;
        proving: boolean;
        resolve?: (result: ProveResult) => void;
      }
    | undefined;
  identity: IdentityV4;
  pods: PODCollection;
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
    }
  | {
      type: "set-advice";
      advice: ConnectorAdvice;
    }
  | {
      type: "set-proof-in-progress";
      pods: Record<string, PODData[]>;
      selectedPods: Record<string, PODData | undefined>;
      proofRequest: PodspecProofRequest;
      proving: boolean;
      resolve?: (result: ProveResult) => void;
    }
  | {
      type: "clear-proof-in-progress";
    };

export function clientReducer(state: ClientState, action: ClientAction) {
  switch (action.type) {
    case "login":
      return { ...state, loggedIn: action.loggedIn };
    case "authorize":
      return { ...state, authorized: action.authorized };
    case "set-zapp":
      return { ...state, zapp: action.zapp };
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
  }
}
