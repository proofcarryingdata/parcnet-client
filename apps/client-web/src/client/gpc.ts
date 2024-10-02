import type { ConnectorAdvice } from "@parcnet-js/client-helpers";
import {
  MissingPermissionError,
  type ParcnetGPCRPC,
  type ParcnetRPCMethodName,
  type ProveResult,
  type Zapp
} from "@parcnet-js/client-rpc";
import type { PodspecProofRequest } from "@parcnet-js/podspec";
import { proofRequest } from "@parcnet-js/podspec";
import type { GPCBoundConfig, GPCProof, GPCRevealedClaims } from "@pcd/gpc";
import { gpcVerify } from "@pcd/gpc";
import type { Dispatch } from "react";
import type { ClientAction } from "../state";
import type { PODCollectionManager } from "./pod_collection_manager";

export class ParcnetGPCProcessor implements ParcnetGPCRPC {
  public constructor(
    private readonly pods: PODCollectionManager,
    private readonly dispatch: Dispatch<ClientAction>,
    private readonly advice: ConnectorAdvice,
    private readonly zapp: Zapp
  ) {}

  private getPODsIfPermitted(
    collectionIds: string[] | undefined,
    method: ParcnetRPCMethodName
  ) {
    const permission = this.zapp.permissions.REQUEST_PROOF;
    if (!permission) {
      throw new MissingPermissionError("REQUEST_PROOF", method);
    }

    const requestedCollectionIds = collectionIds ?? permission.collections;

    if (
      requestedCollectionIds.some(
        (collectionId) => !permission.collections.includes(collectionId)
      )
    ) {
      throw new MissingPermissionError("REQUEST_PROOF", method);
    }

    return requestedCollectionIds.flatMap((collectionId) =>
      this.pods.get(collectionId).getAll()
    );
  }

  public async canProve({
    request,
    collectionIds
  }: {
    request: PodspecProofRequest;
    collectionIds?: string[];
  }): Promise<boolean> {
    const pods = this.getPODsIfPermitted(collectionIds, "gpc.canProve");
    const prs = proofRequest(request);

    const inputPods = prs.queryForInputs(pods);
    if (
      Object.values(inputPods).some((candidates) => candidates.length === 0)
    ) {
      return false;
    }

    return true;
  }

  public async prove({
    request,
    collectionIds
  }: {
    request: PodspecProofRequest;
    collectionIds?: string[];
  }): Promise<ProveResult> {
    const pods = this.getPODsIfPermitted(collectionIds, "gpc.prove");
    const prs = proofRequest(request);
    const inputPods = prs.queryForInputs(pods);
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
