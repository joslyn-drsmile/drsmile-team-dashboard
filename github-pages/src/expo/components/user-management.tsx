"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Mail, PencilLine, Plus, RefreshCw, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "./dashboard";

type TeamRole = "admin" | "customer_service" | "after_sales" | "marketer" | "staff";
type TeamUser = { id: string | null; email: string; displayName: string; role: TeamRole; active: boolean; accountCreated: boolean; lastSignInAt: string | null; isCurrentUser: boolean };
type UserDraft = { user: TeamUser; displayName: string; role: TeamRole; password: string };

const roleLabels: Record<TeamRole, string> = {
  admin: "Admin", customer_service: "Customer Service", after_sales: "After Sales", marketer: "Marketer", staff: "Staff",
};

export function UserManagement() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<TeamRole>("customer_service");
  const [editing, setEditing] = useState<UserDraft | null>(null);
  const [deleting, setDeleting] = useState<TeamUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const { data, error: requestError } = await supabase.functions.invoke("expo-admin-users", { body });
    if (requestError || data?.error) throw new Error(data?.error ?? requestError?.message ?? "Unable to complete this request.");
    return data;
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await invoke({ action: "list" }); setUsers(data.users ?? []); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load users."); }
    finally { setLoading(false); }
  }, [invoke]);

  useEffect(() => { const timer = window.setTimeout(() => void loadUsers(), 0); return () => window.clearTimeout(timer); }, [loadUsers]);
  const activeCount = useMemo(() => users.filter((user) => user.active).length, [users]);

  async function createUser() {
    setError(""); setMessage("");
    if (!displayName.trim() || !email.trim() || password.length < 8) { setError("Name, email and a password with at least 8 characters are required."); return; }
    setSaving(true);
    try {
      await invoke({ action: "create", displayName: displayName.trim(), email: email.trim().toLowerCase(), password, role });
      setDisplayName(""); setEmail(""); setPassword(""); setRole("customer_service");
      setMessage("User created. They can sign in immediately with the email and password you set.");
      await loadUsers();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to create this user."); }
    finally { setSaving(false); }
  }

  function openEdit(user: TeamUser) { setModalError(""); setEditing({ user, displayName: user.displayName, role: user.role, password: "" }); }

  async function saveUser() {
    if (!editing) return;
    setModalError("");
    if (!editing.displayName.trim() || (editing.password && editing.password.length < 8)) { setModalError("Name is required. A new password must have at least 8 characters."); return; }
    setSaving(true);
    try {
      await invoke({ action: "update", userId: editing.user.id, email: editing.user.email, displayName: editing.displayName.trim(), role: editing.role, password: editing.password });
      const resetPassword = Boolean(editing.password);
      setEditing(null); setMessage(resetPassword ? "User details and password updated." : "User details updated.");
      await loadUsers();
    } catch (requestError) { setModalError(requestError instanceof Error ? requestError.message : "Unable to update this user."); }
    finally { setSaving(false); }
  }

  async function deleteUser() {
    if (!deleting) return;
    setModalError(""); setSaving(true);
    try {
      await invoke({ action: "delete", userId: deleting.id, email: deleting.email });
      setDeleting(null); setMessage("User deleted and their Dashboard access was removed.");
      await loadUsers();
    } catch (requestError) { setModalError(requestError instanceof Error ? requestError.message : "Unable to delete this user."); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeader eyebrow="Admin control" title="Users" subtitle="Create, edit and securely manage access to both DrSmile and Expo from one place." actions={<button className="button secondary" onClick={() => void loadUsers()} disabled={loading}><RefreshCw /> Refresh</button>} />
    <section className="user-summary">
      <article><div className="summary-icon blue"><UserRound /></div><div><strong>{users.length}</strong><span>Team accounts</span></div></article>
      <article><div className="summary-icon green"><ShieldCheck /></div><div><strong>{activeCount}</strong><span>Active access</span></div></article>
      <p><KeyRound /> Admins can change a name or role, set a new password when someone forgets theirs, and remove access. Passwords are never displayed or stored in this Dashboard.</p>
    </section>
    {message && <div className="form-success user-page-message"><CheckCircle2 /> {message}</div>}
    {error && <div className="form-error user-page-message">{error}</div>}
    <div className="user-layout">
      <section className="panel user-create-card">
        <div className="panel-heading"><div><h2>Create user</h2><p>Set the employee&apos;s first login details.</p></div><Plus /></div>
        <div className="form-stack">
          <label className="field"><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="e.g. Corrine" /></label>
          <label className="field"><span>Email</span><div className="input-with-icon"><Mail /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" /></div></label>
          <label className="field"><span>Password <small>Minimum 8 characters</small></span><div className="input-with-icon"><KeyRound /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Create a secure password" /></div></label>
          <label className="field"><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value as TeamRole)}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button className="button primary full-button" disabled={saving} onClick={() => void createUser()}>{saving ? "Creating…" : "Create user & password"}</button>
        </div>
      </section>
      <section className="panel user-list-card">
        <div className="panel-heading"><div><h2>Team access</h2><p>Edit a user to change their details or reset their password.</p></div></div>
        {loading ? <div className="empty-state"><RefreshCw /><h3>Loading users…</h3></div> : <div className="user-list">{users.map((user) => <article key={user.email}>
          <div className="avatar user-avatar">{user.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("") || "U"}</div>
          <div><strong>{user.displayName || user.email}{user.isCurrentUser && <em className="current-user-label">You</em>}</strong><span>{user.email}</span></div>
          <div><span className="role-pill">{roleLabels[user.role] ?? user.role}</span><small>{user.accountCreated ? "Login ready" : "Pending account"}</small></div>
          <span className={`status-badge ${user.active ? "ongoing" : "inactive"}`}>{user.active ? "Active" : "Inactive"}</span>
          <div className="user-row-actions"><button className="table-edit" onClick={() => openEdit(user)} aria-label={`Edit ${user.displayName}`}><PencilLine /></button><button className="icon-button danger" onClick={() => { setModalError(""); setDeleting(user); }} disabled={user.isCurrentUser} aria-label={`Delete ${user.displayName}`} title={user.isCurrentUser ? "You cannot delete your own account" : "Delete user"}><Trash2 /></button></div>
        </article>)}{!users.length && <div className="empty-state"><UserRound /><h3>No users found</h3></div>}</div>}
      </section>
    </div>

    {editing && <div className="modal-backdrop" onMouseDown={(event) => event.currentTarget === event.target && !saving && setEditing(null)}><div className="modal-card user-edit-modal"><div className="modal-head"><div><span className="eyebrow">User access</span><h2>Edit {editing.user.displayName}</h2><p>{editing.user.email}</p></div><button className="icon-button" disabled={saving} onClick={() => setEditing(null)}><X /></button></div><div className="modal-body form-stack">
      <label className="field"><span>Display name</span><input value={editing.displayName} onChange={(event) => setEditing({ ...editing, displayName: event.target.value })} /></label>
      <label className="field"><span>Role {editing.user.isCurrentUser && <small>Your own role cannot be changed</small>}</span><select value={editing.role} disabled={editing.user.isCurrentUser} onChange={(event) => setEditing({ ...editing, role: event.target.value as TeamRole })}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field"><span>New password <small>Optional · minimum 8 characters</small></span><div className="input-with-icon"><KeyRound /><input type="password" value={editing.password} onChange={(event) => setEditing({ ...editing, password: event.target.value })} autoComplete="new-password" placeholder="Leave blank to keep current password" disabled={!editing.user.accountCreated} /></div></label>
      <p className="form-info">For a forgotten password, enter a temporary new password here and share it with the employee securely. The same login opens both workspaces.</p>
      {modalError && <div className="form-error">{modalError}</div>}
    </div><div className="modal-footer"><button className="button ghost" disabled={saving} onClick={() => setEditing(null)}>Cancel</button><button className="button primary" disabled={saving} onClick={() => void saveUser()}>{saving ? "Saving…" : "Save changes"}</button></div></div></div>}

    {deleting && <div className="modal-backdrop" onMouseDown={(event) => event.currentTarget === event.target && !saving && setDeleting(null)}><div className="modal-card user-delete-modal"><div className="modal-head"><div><span className="eyebrow danger-eyebrow">Remove access</span><h2>Delete {deleting.displayName}?</h2><p>{deleting.email}</p></div><button className="icon-button" disabled={saving} onClick={() => setDeleting(null)}><X /></button></div><div className="modal-body"><div className="user-delete-warning"><AlertTriangle /><div><strong>This permanently removes their login.</strong><p>They will no longer be able to sign in to either workspace. Existing DrSmile, Expo and appointment records stay unchanged.</p></div></div>{modalError && <div className="form-error">{modalError}</div>}</div><div className="modal-footer"><button className="button ghost" disabled={saving} onClick={() => setDeleting(null)}>Cancel</button><button className="button danger-button" disabled={saving} onClick={() => void deleteUser()}>{saving ? "Deleting…" : "Delete user"}</button></div></div></div>}
  </>;
}
