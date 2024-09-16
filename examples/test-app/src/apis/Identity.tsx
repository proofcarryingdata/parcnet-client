import type { ReactNode } from "react";
import { useState } from "react";
import { TryIt } from "../components/TryIt";
import { useParcnetClient } from "../hooks/useParcnetClient";

export function Identity(): ReactNode {
  const { z, connected } = useParcnetClient();
  const [commitment, setCommitment] = useState<bigint | undefined>(undefined);

  return !connected ? null : (
    <div>
      <h1 className="text-xl font-bold mb-2">Identity</h1>
      <div className="prose">
        <div>
          <p>
            Getting the identity commitment is done like this:
            <code className="block text-xs font-base rounded-md p-2">
              await z.identity.getSemaphoreV3Commitment();
            </code>
          </p>
          <TryIt
            onClick={async () => {
              try {
                const commitment = await z.identity.getSemaphoreV3Commitment();
                setCommitment(commitment);
              } catch (e) {
                console.log(e);
              }
            }}
            label="Get identity commitment"
          />
          {commitment !== undefined && (
            <p>Commitment: {commitment.toString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
