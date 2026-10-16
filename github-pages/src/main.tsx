import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installSupabaseApiAdapter } from "./supabase-api";

installSupabaseApiAdapter();

async function start() {
  const embedded = new URLSearchParams(window.location.search).get("embed") === "drsmile";
  if (embedded) {
    await import("../../app/globals.css");
    const { default: Dashboard } = await import("../../app/page");
    createRoot(document.getElementById("root")!).render(<StrictMode><Dashboard embedded /></StrictMode>);
    return;
  }
  await Promise.all([import("./expo/expo.css"), import("./unified.css")]);
  const { UnifiedAuthGate } = await import("./unified-app");
  createRoot(document.getElementById("root")!).render(<StrictMode><UnifiedAuthGate /></StrictMode>);
}

void start();
