import { ParcnetClientProcessor } from "@/client/client.ts";
import { listen } from "@parcnet-js/client-helpers/connection/iframe";
import { type ReactNode, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Prove } from "../App.tsx";
import { Layout } from "../components/Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../components/ui/dialog";
import { useAppState } from "../state";

export function HostedZapp(): ReactNode {
  const { zappId } = useParams();
  const { state, dispatch } = useAppState();
  const zappUrl = state.zapps.get(zappId ?? "");

  useEffect(() => {
    void (async () => {
      if (window.parent) {
        const { zapp, advice, origin } = await listen();
        dispatch({ type: "set-zapp", zapp, origin });
        dispatch({ type: "set-advice", advice });
      }
    })();
  }, [dispatch]);

  useEffect(() => {
    if (state.advice && state.zapp) {
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

  const modalVisible = useMemo(() => {
    return state.proofInProgress !== undefined;
  }, [state.proofInProgress]);

  if (!zappUrl) {
    return <div>Unknown zapp!</div>;
  }

  return (
    <Layout>
      <Dialog open={modalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proof in progress</DialogTitle>
          </DialogHeader>
          {state.proofInProgress && (
            <Prove proveOperation={state.proofInProgress} dispatch={dispatch} />
          )}
        </DialogContent>
      </Dialog>
      <div className="h-[calc(100vh-128px)]">
        <iframe
          style={{ width: "100%", height: "100%", borderRadius: "10px" }}
          // onLoad={(ev) => {
          //   connectToZapp(
          //     (ev.target as HTMLIFrameElement).contentWindow as Window,
          //     context,
          //     url
          //   );
          // }}
          src={zappUrl}
          sandbox="allow-downloads allow-same-origin allow-scripts allow-popups allow-modals allow-forms allow-storage-access-by-user-activation allow-popups-to-escape-sandbox"
        />
      </div>
    </Layout>
  );
}
