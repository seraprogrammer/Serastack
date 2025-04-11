import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { RouterProvider } from "@/Serastack/react-router.tsx";

createRoot(document.getElementById("root")!).render(
  <RouterProvider>
    <StrictMode>
      <App />
    </StrictMode>
  </RouterProvider>
);
