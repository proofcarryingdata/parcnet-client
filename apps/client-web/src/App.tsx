import { listen } from "@parcnet-js/client-helpers/connection/iframe";
import type { Zapp } from "@parcnet-js/client-rpc";
import type { EntriesSchema, ProofConfigPODSchema } from "@parcnet-js/podspec";
import { proofRequest } from "@parcnet-js/podspec";
import { gpcProve } from "@pcd/gpc";
import type { POD } from "@pcd/pod";
import { POD_INT_MAX, POD_INT_MIN } from "@pcd/pod";
import type { Dispatch, ReactNode } from "react";
import { Fragment, useEffect, useState } from "react";
import { ParcnetClientProcessor } from "./client/client";
import { getIdentity } from "./client/utils";
import { Layout } from "./components/Layout";
import type { ClientAction, ClientState } from "./state";
import { useAppState } from "./state";

function App() {
  const { state, dispatch } = useAppState();

  useEffect(() => {
    void (async () => {
      const { zapp, advice, origin } = await listen();
      dispatch({ type: "set-zapp", zapp, origin });
      dispatch({ type: "set-advice", advice });
    })();
  }, [dispatch]);

  useEffect(() => {
    if (state.advice && !state.loggedIn && !state.authorized) {
      state.advice.showClient();
    }
  }, [state.advice, state.loggedIn, state.authorized]);

  useEffect(() => {
    if (state.advice && state.authorized && state.zapp) {
      state.advice.hideClient();
      state.advice.ready(
        new ParcnetClientProcessor(
          state.advice,
          state.pods,
          dispatch,
          state.identity,
          state.zapp
        )
      );
    }
  }, [
    state.advice,
    state.authorized,
    state.pods,
    state.identity,
    dispatch,
    state.zapp
  ]);

  return (
    <Layout>
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
      {state.loggedIn &&
        state.authorized &&
        state.zapp &&
        state.proofInProgress && (
          <Prove proveOperation={state.proofInProgress} dispatch={dispatch} />
        )}
    </Layout>
  );
}

function Reveal({ children }: { children: ReactNode }) {
  const [isRevealed, setIsRevealed] = useState(false);
  return (
    <>
      <button onClick={() => setIsRevealed(!isRevealed)}>
        {isRevealed ? "Hide" : "Reveal"}
      </button>
      {isRevealed && <div className="my-1">{children}</div>}
    </>
  );
}

function ProvePODInfo({
  name,
  schema,
  pods,
  selectedPOD,
  onChange
}: {
  name: string;
  schema: ProofConfigPODSchema<EntriesSchema>;
  pods: POD[];
  selectedPOD: POD | undefined;
  onChange: (pod: POD | undefined) => void;
}): ReactNode {
  const revealedEntries = Object.entries(schema.pod.entries)
    .map(([name, entry]) => {
      if (entry.type === "optional") {
        entry = entry.innerType;
      }
      return [name, entry] as const;
    })
    .filter(([name, _entry]) => schema.revealed?.[name] ?? false);

  const selectedPODEntries = selectedPOD?.content.asEntries();

  const entriesWithConstraints = Object.entries(schema.pod.entries)
    .map(([name, entry]) => {
      if (entry.type === "optional") {
        entry = entry.innerType;
      }
      return [name, entry] as const;
    })
    .filter(
      ([_, entry]) =>
        !!entry.isMemberOf ||
        !!entry.isNotMemberOf ||
        !!(entry.type === "int" && entry.inRange)
    );

  return (
    <div className="py-2">
      <div className="flex items-center gap-2">
        <div className="font-semibold">{name}</div>
        <select
          className="block w-full rounded-md bg-gray-800 border-transparent focus:border-gray-500 focus:ring-0 p-2 text-sm"
          value={selectedPOD?.signature ?? ""}
          onChange={(ev) => {
            onChange(pods.find((pod) => pod.signature === ev.target.value));
          }}
        >
          <option value="" disabled>
            -- None selected --
          </option>
          {pods.map((pod) => {
            return (
              <option key={pod.signature} value={pod.signature}>
                {schema.pod.meta?.labelEntry
                  ? pod.content
                      .asEntries()
                      [schema.pod.meta.labelEntry].value.toString()
                  : pod.signature.substring(0, 16)}
              </option>
            );
          })}
        </select>
      </div>
      <div className="mt-2 font-semibold">
        {revealedEntries.length > 0 && "Revealed entries:"}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {revealedEntries.map(([entryName, _]) => {
          return (
            <Fragment key={`${name}-${entryName}`}>
              <div>{entryName}</div>
              <div>
                {selectedPODEntries?.[entryName].value.toString() ?? "-"}
              </div>
            </Fragment>
          );
        })}
      </div>
      {entriesWithConstraints.length > 0 && (
        <div className="mt-2">
          <div className="font-semibold">Proven constraints:</div>
          {entriesWithConstraints.map(([entryName, entry]) => {
            return (
              <div key={`${name}-${entryName}-constraints`} className="my-1">
                {entry.isMemberOf && (
                  <div>
                    <span className="font-semibold">{entryName}</span> is member
                    of list:{" "}
                    <Reveal>
                      <div className="p-1 rounded bg-gray-800">
                        {entry.isMemberOf
                          .map((v) => v.value.toString())
                          .join(", ")}
                      </div>
                    </Reveal>
                  </div>
                )}
                {entry.isNotMemberOf && (
                  <div>
                    <span className="font-semibold">{entryName}</span> is not
                    member of list:{" "}
                    <Reveal>
                      <div className="p-1 rounded bg-gray-800">
                        {entry.isNotMemberOf
                          .map((v) => v.value.toString())
                          .join(", ")}
                      </div>
                    </Reveal>
                  </div>
                )}
                {entry.type === "int" && entry.inRange && (
                  <div className="flex gap-1 items-center">
                    <span className="font-semibold">{entryName}</span> is
                    <div className="p-1 rounded bg-gray-800">
                      {entry.inRange.min === POD_INT_MIN &&
                        entry.inRange.max === POD_INT_MAX &&
                        "any number"}
                      {entry.inRange.min !== POD_INT_MIN &&
                        entry.inRange.max === POD_INT_MAX &&
                        `greater than ${entry.inRange.min}`}
                      {entry.inRange.min === POD_INT_MIN &&
                        entry.inRange.max !== POD_INT_MAX &&
                        `less than ${entry.inRange.max}`}
                      {entry.inRange.min !== POD_INT_MIN &&
                        entry.inRange.max !== POD_INT_MAX &&
                        `between ${entry.inRange.min} and ${entry.inRange.max}`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Prove({
  proveOperation,
  dispatch
}: {
  proveOperation: NonNullable<ClientState["proofInProgress"]>;
  dispatch: Dispatch<ClientAction>;
}): ReactNode {
  const canProve =
    Object.keys(proveOperation.selectedPods).length ===
      Object.keys(proveOperation.proofRequest.pods).length &&
    Object.values(proveOperation.selectedPods).every((maybePod) => !!maybePod);

  /**
   * show exactly which fields are revealed and which are not, literally show
   * the whole POD and which entries are revealed
   * could be complicated for tuples?
   */
  return (
    <div>
      <div className="text-sm">
        <p>This proof will reveal the following data from your PODs:</p>
        {Object.entries(proveOperation.proofRequest.pods).map(
          ([name, schema]) => {
            return (
              <ProvePODInfo
                key={name}
                name={name}
                schema={schema}
                pods={proveOperation.pods[name]}
                selectedPOD={proveOperation.selectedPods[name]}
                onChange={(pod) => {
                  dispatch({
                    type: "set-proof-in-progress",
                    ...proveOperation,
                    selectedPods: {
                      ...proveOperation.selectedPods,
                      ...{ [name]: pod }
                    }
                  });
                }}
              />
            );
          }
        )}
        <div className="mt-4">
          <button
            disabled={!canProve}
            className="border-2 text-center font-semibold cursor-pointer border-white py-1 px-2 uppercase active:translate-x-[2px] active:translate-y-[2px] disabled:border-gray-500 disabled:text-gray-500"
            onClick={() => {
              dispatch({
                type: "set-proof-in-progress",
                ...proveOperation,
                proving: true
              });
              const prs = proofRequest(
                proveOperation.proofRequest
              ).getProofRequest();
              gpcProve(
                prs.proofConfig,
                {
                  pods: proveOperation.selectedPods as Record<string, POD>,
                  membershipLists: prs.membershipLists,
                  watermark: prs.watermark,
                  owner: {
                    semaphoreV4: getIdentity(),
                    externalNullifier: prs.externalNullifier
                  }
                },
                new URL("/artifacts", window.location.origin).toString()
              )
                .then((proof) => {
                  proveOperation.resolve?.({
                    success: true,
                    proof: proof.proof,
                    boundConfig: proof.boundConfig,
                    revealedClaims: proof.revealedClaims
                  });
                  dispatch({
                    type: "clear-proof-in-progress"
                  });
                })
                .catch((error) => console.error(error));
            }}
          >
            {proveOperation.proving ? (
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              "Prove"
            )}
          </button>
        </div>
      </div>
    </div>
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
              <ApprovePermissions zapp={zapp} dispatch={dispatch} />
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

function ApprovePermissions({
  zapp,
  dispatch
}: {
  zapp: Zapp;
  dispatch: Dispatch<ClientAction>;
}): ReactNode {
  return (
    <ul className="list-disc pl-4">
      {zapp.permissions.READ_PUBLIC_IDENTIFIERS && (
        <li>Read public identifiers</li>
      )}
      {zapp.permissions.SIGN_POD && <li>Sign POD</li>}
      {zapp.permissions.REQUEST_PROOF && (
        <li>
          Request proof for collections:{" "}
          <strong className="uppercase text-green-300">
            {zapp.permissions.REQUEST_PROOF.collections.join(", ")}
          </strong>
        </li>
      )}
      {zapp.permissions.READ_POD && (
        <li>
          Read POD from collections:{" "}
          <strong className="uppercase text-green-300">
            {zapp.permissions.READ_POD.collections.join(", ")}
          </strong>
        </li>
      )}
      {zapp.permissions.INSERT_POD && (
        <li>
          Insert POD into collections:{" "}
          <strong className="uppercase text-green-300">
            {zapp.permissions.INSERT_POD.collections.join(", ")}
          </strong>
        </li>
      )}
      {zapp.permissions.DELETE_POD && (
        <li>
          Delete POD from collections:{" "}
          <strong className="uppercase text-green-300">
            {zapp.permissions.DELETE_POD.collections.join(", ")}
          </strong>
        </li>
      )}
      {zapp.permissions.SUGGEST_PODS && (
        <li>
          Suggest PODs for collections:{" "}
          <strong className="uppercase text-green-300">
            {zapp.permissions.SUGGEST_PODS.collections.join(", ")}
          </strong>
        </li>
      )}
    </ul>
  );
}

export default App;
