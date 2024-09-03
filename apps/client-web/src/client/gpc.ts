import { ConnectorAdvice } from "@parcnet/client-helpers";
import { ParcnetGPCRPC, ProveResult } from "@parcnet/client-rpc";
import { PodspecProofRequest, proofRequest } from "@parcnet/podspec";
import { Dispatch } from "react";
import { ClientAction } from "../state";
import { PODCollection } from "./pod_collection";

export class ParcnetGPCProcessor implements ParcnetGPCRPC {
  public constructor(
    private readonly pods: PODCollection,
    private readonly dispatch: Dispatch<ClientAction>,
    private readonly advice: ConnectorAdvice
  ) {}

  public async prove(request: PodspecProofRequest): Promise<ProveResult> {
    const prs = proofRequest(request);

    const inputPods = prs.queryForInputs(this.pods.getAll());
    if (
      Object.values(inputPods).some((candidates) => candidates.length === 0)
    ) {
      return {
        success: false,
        error: "Not enough PODs"
      };
    }

    return new Promise((resolve) => {
      this.advice.showClient();
      this.dispatch({
        type: "set-proof-in-progress",
        proofRequest: request,
        pods: inputPods,
        selectedPods: {},
        proving: false,
        resolve
      });
    }).then(() => {
      this.advice.hideClient();
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async verify(pcd: any): Promise<boolean> {
    console.log(pcd);
    return true;
  }
}
