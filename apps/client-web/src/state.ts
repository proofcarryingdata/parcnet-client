import { ConnectorAdvice } from "@parcnet/client-helpers";
import { Zapp } from "@parcnet/client-rpc";

export type ClientState = {
  loggedIn: boolean;
  authorized: boolean;
  advice: ConnectorAdvice | null;
  zapp: Zapp | null;
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
  }
}
