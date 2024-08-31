import { ReactNode } from "react";

export function TryIt({
  onClick,
  label
}: {
  onClick: () => void;
  label: string;
}): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Try it:</span>
      <button className="btn btn-primary" onClick={onClick}>
        {label}
      </button>
    </div>
  );
}