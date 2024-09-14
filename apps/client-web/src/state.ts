import { ConnectorAdvice } from "@parcnet/client-helpers";
import { ProveResult, Zapp } from "@parcnet/client-rpc";
import { PodspecProofRequest } from "@parcnet/podspec";
import { POD } from "@pcd/pod";

export type ClientState = {
  loggedIn: boolean;
  authorized: boolean;
  advice: ConnectorAdvice | null;
  zapp: Zapp | null;
  proofInProgress:
    | {
        pods: Record<string, POD[]>;
        selectedPods: Record<string, POD | undefined>;
        proofRequest: PodspecProofRequest;
        proving: boolean;
        resolve?: (result: ProveResult) => void;
      }
    | undefined;
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
      pods: Record<string, POD[]>;
      selectedPods: Record<string, POD | undefined>;
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
