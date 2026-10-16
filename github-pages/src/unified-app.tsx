import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Ban,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  CircleHelp,
  ContactRound,
  Gift,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  PackageOpen,
  PackageSearch,
  Radio,
  Settings,
  ShieldCheck,
  Tags,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { supabase } from "./supabase";
import { useDashboardStore } from "@/lib/store";
import { defaultExpoId } from "@/lib/utils";
import { Dashboard } from "@/components/dashboard";
import { Appointments } from "@/components/appointments";
import { Customers } from "@/components/customers";
import { Expos } from "@/components/expos";
import { Packages } from "@/components/packages";
import { PaymentMethods } from "@/components/payment-methods";
import { Blacklist } from "@/components/blacklist";
import { UserManagement } from "@/components/user-management";

type Workspace = "drsmile" | "expo";
type DrSmilePage = "home" | "calendar" | "broadcasts" | "products" | "promotions" | "points" | "pharmacies" | "payments" | "faq" | "settings";
type ExpoPage = "dashboard" | "appointments" | "customers" | "expos" | "packages" | "payments" | "blacklist";
type SettingsPage = "users" | "permissions";

const drsmileNav: Array<{ key: DrSmilePage; label: string; icon: React.ReactNode }> = [
  { key: "home", label: "Overview", icon: <LayoutDashboard /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays /> },
  { key: "broadcasts", label: "Broadcast Schedule", icon: <Radio /> },
  { key: "products", label: "Products & Pricing", icon: <PackageSearch /> },
  { key: "promotions", label: "Promotion", icon: <Tags /> },
  { key: "points", label: "Point Redeem", icon: <Gift /> },
  { key: "pharmacies", label: "Pharmacy List", icon: <MapPin /> },
  { key: "payments", label: "Payment Method", icon: <WalletCards /> },
  { key: "faq", label: "FAQ", icon: <CircleHelp /> },
];

const expoNav: Array<{ key: ExpoPage; label: string; icon: React.ReactNode }> = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
  { key: "appointments", label: "Appointments", icon: <UsersRound /> },
  { key: "customers", label: "Leads / Customers", icon: <ContactRound /> },
  { key: "expos", label: "Expos", icon: <CalendarRange /> },
  { key: "packages", label: "Packages", icon: <PackageOpen /> },
  { key: "payments", label: "Payment Method", icon: <WalletCards /> },
  { key: "blacklist", label: "Blacklist", icon: <Ban /> },
];

type Profile = { id: string; name: string; email: string; role: string; initials: string; isAdmin: boolean };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "DS";
}

export function UnifiedAuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [accessChecking, setAccessChecking] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const sessionUserId = session?.user.id ?? null;
  const sessionUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const applySession = (nextSession: Session | null) => {
      const nextUserId = nextSession?.user.id ?? null;
      const userChanged = sessionUserIdRef.current !== nextUserId;
      sessionUserIdRef.current = nextUserId;
      setSession(nextSession);
      if (userChanged) {
        setAccessChecking(Boolean(nextSession));
        if (!nextSession) setHasAccess(false);
      }
      setChecking(false);
    };
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => applySession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userEmail = session?.user.email?.toLowerCase();
    if (!sessionUserId || !userEmail) return;
    let active = true;
    void Promise.all([
      supabase.rpc("expo_has_access"),
      supabase.from("members").select("id").eq("email", userEmail).eq("active", true).maybeSingle(),
    ]).then(([expoAccess, teamAccess]) => {
      if (!active) return;
      setHasAccess((!expoAccess.error && expoAccess.data === true) || (!teamAccess.error && !!teamAccess.data));
      setAccessChecking(false);
    });
    return () => { active = false; };
  }, [session?.user.email, sessionUserId]);

  async function submit() {
    if (!email.trim() || password.length < 8) {
      setMessage("Enter your email and a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    setMessage("");
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
  }

  if (checking || accessChecking) return <div className="auth-loading">Opening your secure workspace…</div>;
  if (session && hasAccess) return <UnifiedShell userId={session.user.id} userEmail={session.user.email ?? "Team member"} />;
  if (session) return <main className="auth-screen"><section className="auth-card"><img src="/drsmile-expo-logo.jpeg" alt="DRSMILE" /><span className="auth-kicker"><ShieldCheck /> Team access required</span><h1>Account not approved</h1><p>{session.user.email} is signed in, but it is not on the active DRSMILE team list.</p><button className="button primary auth-primary" onClick={() => void supabase.auth.signOut()}>Use another account</button><small>Ask the dashboard owner to add this email before signing in again.</small></section></main>;

  return <main className="auth-screen"><section className="auth-card"><img src="/drsmile-expo-logo.jpeg" alt="DRSMILE" /><span className="auth-kicker"><ShieldCheck /> Secure team workspace</span><h1>DrSmile Dashboard</h1><p>One login for the DrSmile and Expo workspaces.</p><label><span>Email</span><div><Mail /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@drsmile.com" autoComplete="email" /></div></label><label><span>Password</span><div><LockKeyhole /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="current-password" onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} /></div></label>{message && <div className="auth-message">{message}</div>}<button className="button primary auth-primary" disabled={busy} onClick={() => void submit()}>{busy ? "Please wait…" : "Sign in"}</button><p className="auth-help">Use the same login details as the Expo Dashboard.</p><small>Both workspaces use one secure Supabase session.</small></section></main>;
}

function UnifiedShell({ userId, userEmail }: { userId: string; userEmail: string }) {
  const fallbackName = userEmail.split("@")[0] || "Team member";
  const [profile, setProfile] = useState<Profile>({ id: userId, name: fallbackName, email: userEmail, role: "Team member", initials: initials(fallbackName), isAdmin: userEmail.toLowerCase() === "joslyn.drsmile@gmail.com" });
  const store = useDashboardStore({ id: profile.id, name: profile.name, email: profile.email });
  const [workspace, setWorkspace] = useState<Workspace>(() => (sessionStorage.getItem("unified-workspace") as Workspace) || "drsmile");
  const [drsmilePage, setDrsmilePage] = useState<DrSmilePage>(() => (sessionStorage.getItem("unified-drsmile-page") as DrSmilePage) || "home");
  const [expoPage, setExpoPage] = useState<ExpoPage>(() => (sessionStorage.getItem("unified-expo-page") as ExpoPage) || "dashboard");
  const [settingsPage, setSettingsPage] = useState<SettingsPage>("users");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expoId, setExpoId] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const activeExpoId = store.data.expos.some((expo) => expo.id === expoId) ? expoId : defaultExpoId(store.data.expos);

  useEffect(() => {
    let active = true;
    void supabase.from("expo_allowed_users").select("display_name, role").eq("email", userEmail.toLowerCase()).maybeSingle().then(({ data }) => {
      if (!active) return;
      const name = data?.display_name?.trim() || fallbackName;
      const role = String(data?.role || "Team member").replaceAll("_", " ");
      setProfile({ id: userId, name, email: userEmail.toLowerCase(), role, initials: initials(name), isAdmin: data?.role === "admin" || userEmail.toLowerCase() === "joslyn.drsmile@gmail.com" });
    });
    return () => { active = false; };
  }, [fallbackName, userEmail, userId]);

  function chooseWorkspace(next: Workspace) {
    setWorkspace(next);
    setSettingsOpen(false);
    sessionStorage.setItem("unified-workspace", next);
  }

  function chooseDrSmilePage(next: DrSmilePage) {
    setDrsmilePage(next);
    setSettingsOpen(false);
    sessionStorage.setItem("unified-drsmile-page", next);
  }

  function chooseExpoPage(next: ExpoPage) {
    setExpoPage(next);
    setSettingsOpen(false);
    sessionStorage.setItem("unified-expo-page", next);
  }

  if (!store.hydrated) return <div className="loading-screen"><img className="loading-logo" src="/drsmile-expo-logo.jpeg" alt="DRSMILE" /><span>Loading shared workspace…</span></div>;

  const activeNav = workspace === "drsmile" ? drsmileNav : expoNav;
  const activePage = workspace === "drsmile" ? drsmilePage : expoPage;
  const pageLabel = settingsOpen ? "Settings" : activeNav.find((item) => item.key === activePage)?.label || "Dashboard";
  const appointmentCount = store.data.appointments.filter((row) => row.expoId === activeExpoId && row.state === "Booked").length;

  return <div className="app-shell unified-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><img className="brand-logo" src="/drsmile-expo-logo.jpeg" alt="DRSMILE — From Yellow to Hello" /></div>
      <p className="workspace-label">Workspace</p>
      <div className="workspace-toggle" role="group" aria-label="Choose workspace"><button className={workspace === "drsmile" ? "active" : ""} onClick={() => chooseWorkspace("drsmile")}>DrSmile</button><button className={workspace === "expo" ? "active" : ""} onClick={() => chooseWorkspace("expo")}>Expo</button></div>
      <nav>{activeNav.map((item) => <button key={item.key} className={!settingsOpen && activePage === item.key ? "active" : ""} onClick={() => workspace === "drsmile" ? chooseDrSmilePage(item.key as DrSmilePage) : chooseExpoPage(item.key as ExpoPage)}>{item.icon}<span>{item.label}</span>{workspace === "expo" && item.key === "appointments" && <i>{appointmentCount}</i>}</button>)}</nav>
      <div className="shared-sidebar-actions"><button className={settingsOpen ? "active" : ""} onClick={() => setSettingsOpen(true)}><Settings /><span>Settings</span></button><button onClick={() => void supabase.auth.signOut({ scope: "local" })}><LogOut /><span>Log out</span></button></div>
    </aside>
    <main className="main-area">
      <div className="topbar"><div className="breadcrumbs"><span>{workspace === "drsmile" ? "DRSMILE" : "EXPO"}</span><b>/</b><strong>{pageLabel}</strong></div><div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen((current) => !current)}><span>{profile.initials}</span><div><strong>{profile.name}</strong><small>{profile.role}</small></div><ChevronDown /></button>{profileOpen && <div className="profile-menu unified-profile-menu"><strong>Signed in</strong><p>{profile.email}</p></div>}</div></div>
      <div className={`page-content ${workspace === "drsmile" || (settingsOpen && settingsPage === "permissions") ? "workspace-embed" : ""}`}>
        {settingsOpen ? <SettingsHub isAdmin={profile.isAdmin} page={settingsPage} setPage={setSettingsPage} /> : workspace === "drsmile" ? <DrSmileWorkspace page={drsmilePage} /> : <ExpoWorkspace page={expoPage} store={store} expoId={activeExpoId} setExpoId={setExpoId} setExpoPage={chooseExpoPage} />}
      </div>
    </main>
  </div>;
}

function ExpoWorkspace({ page, store, expoId, setExpoId, setExpoPage }: { page: ExpoPage; store: ReturnType<typeof useDashboardStore>; expoId: string; setExpoId: (id: string) => void; setExpoPage: (page: ExpoPage) => void }) {
  if (page === "dashboard") return <Dashboard data={store.data} expoId={expoId} onExpoChange={setExpoId} onOpenAppointments={(id) => { setExpoId(id); setExpoPage("appointments"); }} onSaveMarketing={store.saveMarketing} />;
  if (page === "appointments") return <Appointments data={store.data} expoId={expoId} onExpoChange={setExpoId} onToggle={store.toggleAppointment} onUpdate={store.updateAppointment} onUpdateDetails={store.updateAppointmentDetails} onDelete={store.deleteAppointment} onCreate={store.createAppointment} onAddSource={store.addSource} onAddBlacklist={store.addBlacklist} onToggleBlacklist={store.toggleBlacklist} />;
  if (page === "customers") return <Customers data={store.data} />;
  if (page === "expos") return <Expos data={store.data} onSave={store.saveExpo} onApplyTemplate={store.applySlotTemplate} onAddSlot={store.addTimeSlot} onDeleteSlot={store.deleteTimeSlot} onViewPackages={(id) => { setExpoId(id); setExpoPage("packages"); }} />;
  if (page === "packages") return <Packages data={store.data} expoId={expoId} onExpoChange={setExpoId} onCreate={store.createPackage} onUpdate={store.updatePackage} onDuplicate={store.duplicatePackage} onSetActive={store.setPackageActive} onReorder={store.reorderPackages} />;
  if (page === "payments") return <PaymentMethods />;
  return <Blacklist data={store.data} onAdd={store.addBlacklist} onToggle={store.toggleBlacklist} />;
}

function DrSmileWorkspace({ page }: { page: DrSmilePage }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const sendPage = () => frame.current?.contentWindow?.postMessage({ type: "drsmile:navigate", page }, window.location.origin);
  useEffect(sendPage, [page]);
  return <iframe ref={frame} className="drsmile-workspace-frame" src="/?embed=drsmile" title="DrSmile workspace" onLoad={sendPage} />;
}

function SettingsHub({ isAdmin, page, setPage }: { isAdmin: boolean; page: SettingsPage; setPage: (page: SettingsPage) => void }) {
  if (!isAdmin) return <section className="settings-access-note"><Settings /><h1>Settings</h1><p>Only dashboard administrators can manage team users and menu permissions.</p></section>;
  return <div className={page === "permissions" ? "shared-settings permissions-frame" : "shared-settings"}><div className="settings-tabs" role="tablist" aria-label="Settings sections"><button className={page === "users" ? "active" : ""} onClick={() => setPage("users")}><UsersRound /> Team users</button><button className={page === "permissions" ? "active" : ""} onClick={() => setPage("permissions")}><ShieldCheck /> DrSmile permissions</button></div>{page === "users" ? <UserManagement /> : <DrSmileWorkspace page="settings" />}</div>;
}
