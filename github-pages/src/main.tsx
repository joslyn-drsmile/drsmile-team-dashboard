import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "../../app/page";
import "../../app/globals.css";
import "./pages.css";
import { installSupabaseApiAdapter } from "./supabase-api";
import { AuthGate } from "./auth-gate";

installSupabaseApiAdapter();

const dashboard = <Dashboard />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate>{dashboard}</AuthGate>
  </StrictMode>,
);
