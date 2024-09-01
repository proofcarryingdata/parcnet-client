import { listen } from "@parcnet/client-helpers/connection/iframe";
import { Zapp } from "@parcnet/client-rpc";
import { Dispatch, ReactNode, useEffect, useReducer } from "react";
import { ParcnetClientProcessor } from "./client/client";
import { PODCollection } from "./client/pod_collection";
import { loadPODsFromStorage, savePODsToStorage } from "./client/utils";
import { Rabbit } from "./rabbit";
import { ClientAction, clientReducer } from "./state";

function App() {
  const [state, dispatch] = useReducer(clientReducer, {
    loggedIn: false,
    advice: null,
    zapp: null,
    authorized: false
  });

  useEffect(() => {
    (async () => {
      const { zapp, advice } = await listen();
      dispatch({ type: "set-zapp", zapp });
      dispatch({ type: "set-advice", advice });
    })();
  }, []);

  useEffect(() => {
    if (state.advice && !state.loggedIn) {
      state.advice.showClient();
    }
  }, [state.advice, state.loggedIn]);

  useEffect(() => {
    if (state.authorized && state.advice) {
      state.advice.hideClient();
      const pods = new PODCollection(loadPODsFromStorage());
      pods.onUpdate(() => {
        savePODsToStorage(pods.getAll());
      });
      state.advice.ready(new ParcnetClientProcessor(state.advice, pods));
    }
  }, [state.authorized, state.advice]);

  return (
    <main className="mx-auto max-w-md container">
      <div className="font-mono my-4 bg-black text-white p-4 rounded-lg">
        <div className="flex items-center w-full my-4">
          <div className="my-4 w-full">Welcome to PARCNET</div>
          <div className="w-8 h-8">
            <Rabbit />
          </div>
        </div>
        {!state.loggedIn && (
          <button
            className="border-2 font-semibold cursor-pointer border-white py-1 px-2 uppercase active:translate-x-[2px] active:translate-y-[2px]"
            onClick={() => dispatch({ type: "login", loggedIn: true })}
          >
            Connect
          </button>
        )}
        {state.loggedIn && !state.authorized && state.zapp && (
          <Authorize zapp={state.zapp} dispatch={dispatch} />
        )}
      </div>
    </main>
  );
}

function Authorize({
  zapp,
  dispatch
}: {
  zapp: Zapp;
  dispatch: Dispatch<ClientAction>;
}): ReactNode {
  return (
    <div>
      <h2 className="uppercase font-semibold my-6">Authorize connection</h2>
      <table className="table-auto border-2 border-white w-full border-collapse my-6">
        <tbody>
          <tr>
            <th className="border-2 border-white uppercase font-semibold text-left px-2 py-1">
              Name
            </th>
            <td className="border-2 border-white w-full px-2 py-1">
              {zapp.name}
            </td>
          </tr>
          <tr>
            <th className="border-2 border-white uppercase font-semibold text-left px-2 py-1">
              Permissions
            </th>
            <td className="border-2 border-white w-full px-2 py-1">
              {zapp.permissions.join(", ")}
            </td>
          </tr>
        </tbody>
      </table>
      <button
        className="border-2 font-semibold cursor-pointer border-white py-1 px-2 uppercase active:translate-x-[2px] active:translate-y-[2px]"
        onClick={() => dispatch({ type: "authorize", authorized: true })}
      >
        Authorize
      </button>
    </div>
  );
}

export default App;
