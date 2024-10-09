import { createComponent } from "@lit/react";
import { ParcnetToolbar } from "@parcnet-js/app-connector/components/parcnet-toolbar";
import React from "react";

export const ParcnetToolbarComponent = createComponent({
  tagName: "parcnet-toolbar",
  elementClass: ParcnetToolbar,
  react: React,
  events: {}
});
