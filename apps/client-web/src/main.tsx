import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { HostedZapp } from "./pages/HostedZapp.tsx";
import { StateProvider } from "./state.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />
  },
  {
    path: "zapps/:zappId",
    element: <HostedZapp />
  }
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StateProvider>
      <RouterProvider router={router} />
    </StateProvider>
  </StrictMode>
);
