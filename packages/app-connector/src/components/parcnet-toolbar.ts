import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("parcnet-toolbar")
export class ParcnetToolbar extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 40px;
      background-color: #000;
      color: #fff;
      z-index: 1000;
    }
    .toolbar-content {
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      font-size: 1.25em;
    }
    .logo {
      padding: 0px 10px;
      font-weight: bold;
    }
    .spacer {
      flex: 1;
    }
    .actions {
      padding: 0px 10px;
      display: flex;
      align-items: center;
      height: 100%;
    }
    .lightning {
      height: 20px;
      width: 20px;
    }
  `;

  static lightning = html`<svg
    class="lightning"
    stroke="currentColor"
    fill="currentColor"
    stroke-width="0"
    viewBox="0 0 20 20"
    aria-hidden="true"
    height="200px"
    width="200px"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill-rule="evenodd"
      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
      clip-rule="evenodd"
    ></path>
  </svg>`;

  override render() {
    return html`<div class="toolbar-content">
      <div class="logo">Welcome to Parcnet</div>
      <div class="spacer"></div>
      <div class="actions">${ParcnetToolbar.lightning}</div>
    </div>`;
  }
}
