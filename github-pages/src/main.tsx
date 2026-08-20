import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "../../app/page";
import "../../app/globals.css";
import "./pages.css";
import { installSupabaseApiAdapter } from "./supabase-api";
import { AuthGate } from "./auth-gate";

installSupabaseApiAdapter();

const previewMode = import.meta.env.VITE_PREVIEW_MODE === "true";
const dashboard = <Dashboard />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {previewMode ? <><div className="preview-badge">Shared mode · login temporarily disabled</div>{dashboard}</> : <AuthGate>{dashboard}</AuthGate>}
  </StrictMode>,
);
