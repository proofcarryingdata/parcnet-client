import "./style.css";
import { connect } from "@parcnet-js/app-connector";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>Minimal Zapp</h1>
    <div id="app-connector-container"></div>
    <div id="result"></div>
  </div>
`;

async function main() {
  const api = await connect(
    { name: "minimal-app", permissions: [] },
    document.querySelector<HTMLDivElement>("#app-connector-container")!,
    "http://localhost:5173"
  );

  const result = await api.pod.sign({ foo: { type: "string", value: "bar" } });
  const stringResult = JSON.stringify(result, (_k, v) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    typeof v === "bigint" ? v.toString() : v
  );
  document.querySelector<HTMLDivElement>("#result")!.innerHTML = `
    <p>Result: ${stringResult}</p>
  `;
}

void main();
