import type { ConnectorAdvice } from "@parcnet-js/client-helpers";
import type { ParcnetGPCRPC, ProveResult } from "@parcnet-js/client-rpc";
import type { PodspecProofRequest } from "@parcnet-js/podspec";
import { proofRequest } from "@parcnet-js/podspec";
import type { GPCBoundConfig, GPCProof, GPCRevealedClaims } from "@pcd/gpc";
import { gpcVerify } from "@pcd/gpc";
import type { Dispatch } from "react";
import type { ClientAction } from "../state";
import type { PODCollection } from "./pod_collection";
import { podToPODData } from "./utils";

export class ParcnetGPCProcessor implements ParcnetGPCRPC {
  public constructor(
    private readonly pods: PODCollection,
    private readonly dispatch: Dispatch<ClientAction>,
    private readonly advice: ConnectorAdvice
  ) {}

  public async canProve(request: PodspecProofRequest): Promise<boolean> {
    const prs = proofRequest(request);

    const inputPods = prs.queryForInputs(this.pods.getAll().map(podToPODData));
    if (
      Object.values(inputPods).some((candidates) => candidates.length === 0)
    ) {
      return false;
    }

    return true;
  }

  public async prove(request: PodspecProofRequest): Promise<ProveResult> {
    const prs = proofRequest(request);
    const inputPods = prs.queryForInputs(this.pods.getAll().map(podToPODData));
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

  public async verify(
    proof: GPCProof,
    boundConfig: GPCBoundConfig,
    revealedClaims: GPCRevealedClaims,
    pr: PodspecProofRequest
  ): Promise<boolean> {
    const config = proofRequest(pr).getProofRequest().proofConfig;
    config.circuitIdentifier = boundConfig.circuitIdentifier;

    return gpcVerify(
      proof,
      config as GPCBoundConfig,
      revealedClaims,
      new URL("/artifacts", window.location.origin).toString()
    );
  }
}
