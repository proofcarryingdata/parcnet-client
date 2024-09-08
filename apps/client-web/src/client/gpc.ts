import { ConnectorAdvice } from "@parcnet/client-helpers";
import {
  ParcnetGPCRPC,
  ParcnetRPCSchema,
  ProveResult
} from "@parcnet/client-rpc";
import { PodspecProofRequest, proofRequest } from "@parcnet/podspec";
import { Dispatch } from "react";
import { ClientAction } from "../state";
import { PODCollection } from "./pod_collection";
import { validateInput } from "./utils";

export class ParcnetGPCProcessor implements ParcnetGPCRPC {
  public constructor(
    private readonly pods: PODCollection,
    private readonly dispatch: Dispatch<ClientAction>,
    private readonly advice: ConnectorAdvice
  ) {}

  @validateInput(ParcnetRPCSchema.shape.gpc.shape.canProve)
  public async canProve(request: PodspecProofRequest): Promise<boolean> {
    const prs = proofRequest(request);

    const inputPods = prs.queryForInputs(this.pods.getAll());
    if (
      Object.values(inputPods).some((candidates) => candidates.length === 0)
    ) {
      return false;
    }

    return true;
  }

  @validateInput(ParcnetRPCSchema.shape.gpc.shape.prove)
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

    const advice = this.advice;

    return new Promise((resolve) => {
      console.log("proving");
      this.advice.showClient();
      this.dispatch({
        type: "set-proof-in-progress",
        proofRequest: request,
        pods: inputPods,
        selectedPods: {},
        proving: false,
        resolve: (result) => {
          advice.hideClient();
          resolve(result);
        }
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async verify(pcd: any): Promise<boolean> {
    console.log(pcd);
    return true;
  }
}
