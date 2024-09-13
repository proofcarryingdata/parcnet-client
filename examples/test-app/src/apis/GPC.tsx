import { PodspecProofRequest } from "@parcnet/podspec";
import JSONBig from "json-bigint";
import { ReactNode, useState } from "react";
import { ProveResult } from "../../../../packages/client-rpc/src";
import { TryIt } from "../components/TryIt";
import { useParcnetClient } from "../hooks/useParcnetClient";

const request: PodspecProofRequest = {
  pods: {
    pod1: {
      entries: {
        wis: {
          type: "int",
          inRange: { min: BigInt(5), max: BigInt(1000) },
          isRevealed: true
        },
        str: { type: "int", inRange: { min: BigInt(5), max: BigInt(1000) } }
      }
    },
    pod2: {
      entries: {
        test: {
          type: "string",
          isMemberOf: [{ type: "string", value: "secret" }],
          isRevealed: true
        }
      }
    }
  }
};

export function GPC(): ReactNode {
  const { z, connected } = useParcnetClient();
  const [proof, setProof] = useState<ProveResult>();
  const [verified, _setVerified] = useState<boolean | undefined>();

  return !connected ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">GPC</h1>
      <div className="prose">
        <div>
          <p>
            Generating a GPC proof is done like this:
            <code className="block text-xs font-base rounded-md p-2 whitespace-pre-wrap">
              {`
const request: PodspecProofRequest = {
  pods: {
    pod1: {
      entries: {
        wis: {
          type: "int",
          inRange: { min: BigInt(5), max: BigInt(1000) },
          isRevealed: true
        },
        str: { type: "int", inRange: { min: BigInt(5), max: BigInt(1000) } }
      }
    },
    pod2: {
      entries: {
        test: {
          type: "string",
          isMemberOf: [{ type: "string", value: "secret" }],
          isRevealed: true
        }
      }
    }
  }
};

const gpcProof = await z.gpc.prove(request);

`}
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                setProof(await z.gpc.prove(request));
              } catch (e) {
                console.log(e);
              }
            }}
            label="Get GPC Proof"
          />
          {proof && (
            <pre className="whitespace-pre-wrap">
              {JSONBig.stringify(proof, null, 2)}
            </pre>
          )}
        </div>
        <div>
          <p>
            Verify a GPC proof like this:
            <code className="block text-xs font-base rounded-md p-2 whitespace-pre-wrap">
              {`
const verified = await z.gpc.verify(proof);
            `}
            </code>
          </p>
          {!proof && (
            <span>Generate a proof above, then we can verify it.</span>
          )}
          {proof && (
            <TryIt
              onClick={() => {
                try {
                  // setVerified(await z.gpc.verify(proof));
                } catch (e) {
                  console.log(e);
                }
              }}
              label="Verify GPC Proof"
            />
          )}
          {verified !== undefined && (
            <pre className="whitespace-pre-wrap">
              Verified: {verified.toString()}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
