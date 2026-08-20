import { FormEvent, ReactNode, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(() => /type=(recovery|invite)/.test(window.location.hash + window.location.search));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((authEvent, nextSession) => {
      if (authEvent === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(nextSession);
      setLoaded(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setMessage(error ? error.message : "Signed in");
    setBusy(false);
  }

  async function setNewPassword(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setMessage("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setMessage("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : "Password saved. You can now use the Dashboard.");
    if (!error) window.history.replaceState({}, "", window.location.pathname);
    setBusy(false);
  }

  async function resetPassword() {
    if (!email.trim()) return setMessage("Enter your email first.");
    setBusy(true);
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setMessage(error ? error.message : "Password setup link sent. Please check your email.");
    setBusy(false);
  }

  if (!loaded) return <AuthScreen title="Loading your workspace…" />;
  if (session && !recovery) return <div className="supabase-session"><button className="supabase-signout" onClick={() => supabase.auth.signOut()}>Sign out</button>{children}</div>;

  return (
    <div className="supabase-auth-page">
      <div className="supabase-auth-card">
        <img src={`${import.meta.env.BASE_URL}drsmile-logo.png`} alt="DrSmile Whitening" />
        <p className="eyebrow">DrSmile Team Dashboard</p>
        <h1>{recovery ? "Set your password" : "Welcome back"}</h1>
        <p>{recovery ? "Create the password you will use for future logins." : "Use the email registered by Joslyn to sign in."}</p>
        <form onSubmit={recovery ? setNewPassword : signIn}>
          {!recovery && <label><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>}
          <label><span>{recovery ? "New password" : "Password"}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={recovery ? "new-password" : "current-password"} /></label>
          {recovery && <label><span>Confirm password</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} autoComplete="new-password" /></label>}
          <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : recovery ? "Save password" : "Sign in"}</button>
        </form>
        {!recovery && <button className="auth-link" type="button" onClick={resetPassword} disabled={busy}>Set / forgot password</button>}
        {message && <div className="auth-message">{message}</div>}
      </div>
    </div>
  );
}

function AuthScreen({ title }: { title: string }) {
  return <div className="supabase-auth-page"><div className="supabase-auth-card"><img src={`${import.meta.env.BASE_URL}drsmile-logo.png`} alt="DrSmile Whitening" /><h1>{title}</h1></div></div>;
}
