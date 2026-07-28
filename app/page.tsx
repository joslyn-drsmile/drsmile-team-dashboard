"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Section = "products" | "points" | "pharmacies" | "payments" | "faq";
type RecordItem = {
  id: number;
  section: Section;
  title: string;
  subtitle: string;
  data: Record<string, string>;
};

const menus: { id: "home" | Section; label: string; short: string }[] = [
  { id: "home", label: "Overview", short: "OV" },
  { id: "products", label: "Products & Pricing", short: "PR" },
  { id: "points", label: "Point Redeem", short: "PT" },
  { id: "pharmacies", label: "Pharmacy List", short: "PH" },
  { id: "payments", label: "Payment Method", short: "PY" },
  { id: "faq", label: "FAQ", short: "FQ" },
];

const channelFields = [
  ["pharmacy", "Pharmacy"],
  ["shopee", "Shopee"],
  ["website", "Website"],
  ["facebook", "Facebook"],
] as const;

const initialRecords: RecordItem[] = [
  {
    id: 1,
    section: "products",
    title: "DrSmile Oral Care Product",
    subtitle: "Website catalogue",
    data: { sku: "DRS-001", alacart: "RM 0.00", pwp: "RM 0.00", pharmacy: "—", shopee: "—", website: "—", facebook: "—", status: "Verify from website" },
  },
  {
    id: 2,
    section: "points",
    title: "Welcome Reward",
    subtitle: "Customer redemption",
    data: { points: "100 pts", value: "RM 5", terms: "One redemption per receipt", status: "Active" },
  },
  {
    id: 3,
    section: "pharmacies",
    title: "Add your first pharmacy",
    subtitle: "Malaysia",
    data: { phone: "—", address: "Edit this item with the full shop address", state: "—" },
  },
  {
    id: 4,
    section: "payments",
    title: "Bank Transfer",
    subtitle: "Manual payment",
    data: { details: "Add bank name and account number", link: "", qrUrl: "", status: "Available" },
  },
  {
    id: 5,
    section: "payments",
    title: "Touch ’n Go",
    subtitle: "QR payment",
    data: { details: "Upload TNG QR", link: "", qrUrl: "", status: "Available" },
  },
  {
    id: 6,
    section: "payments",
    title: "Credit Card",
    subtitle: "Payex",
    data: { details: "Create a secure card payment link in Payex", link: "", qrUrl: "", portal: "https://portal.payex.io/AutoPayments", status: "Available" },
  },
  {
    id: 7,
    section: "payments",
    title: "Atome Pay",
    subtitle: "Buy now, pay later",
    data: { details: "Create an Atome payment link", link: "", qrUrl: "", portal: "https://portal.atome.my/main/dashboard", status: "Available" },
  },
  {
    id: 8,
    section: "payments",
    title: "Shopee Pay",
    subtitle: "QR payment",
    data: { details: "Upload ShopeePay QR", link: "", qrUrl: "", status: "Available" },
  },
  {
    id: 9,
    section: "payments",
    title: "Cash on Delivery",
    subtitle: "COD",
    data: { details: "Confirm delivery area and fee before order", link: "", qrUrl: "", status: "Available" },
  },
  {
    id: 10,
    section: "faq",
    title: "How do I update an answer?",
    subtitle: "Dashboard",
    data: { answer: "Open this item, choose Edit, update the answer and save. Your team will see the latest version.", category: "General", source: "Google Sheet" },
  },
];

const blankBySection: Record<Section, RecordItem> = {
  products: { id: 0, section: "products", title: "", subtitle: "", data: { sku: "", alacart: "", pwp: "", pharmacy: "", shopee: "", website: "", facebook: "", status: "Active" } },
  points: { id: 0, section: "points", title: "", subtitle: "", data: { points: "", value: "", terms: "", status: "Active" } },
  pharmacies: { id: 0, section: "pharmacies", title: "", subtitle: "", data: { phone: "", address: "", state: "" } },
  payments: { id: 0, section: "payments", title: "", subtitle: "", data: { details: "", link: "", qrUrl: "", portal: "", status: "Available" } },
  faq: { id: 0, section: "faq", title: "", subtitle: "", data: { answer: "", category: "", source: "Google Sheet" } },
};

const pageCopy: Record<Section, { eyebrow: string; title: string; description: string }> = {
  products: { eyebrow: "Commercial catalogue", title: "Products & pricing", description: "Ala carte, PWP and monthly promotion pricing across every sales channel." },
  points: { eyebrow: "Customer loyalty", title: "Point redeem", description: "Keep redemption rewards, point values and terms easy for the whole team to reference." },
  pharmacies: { eyebrow: "Retail network", title: "Pharmacy list", description: "Search every stockist and copy phone numbers or full addresses in one click." },
  payments: { eyebrow: "Order collection", title: "Payment methods", description: "Keep QR codes, payment instructions and gateway links ready for every order." },
  faq: { eyebrow: "Team knowledge", title: "Frequently asked questions", description: "A shared answer bank for fast, consistent customer replies." },
};

function copyText(value: string, label: string, setToast: (value: string) => void) {
  if (!value || value === "—") return;
  navigator.clipboard.writeText(value);
  setToast(`${label} copied`);
}

export default function Home() {
  const [active, setActive] = useState<"home" | Section>("home");
  const [records, setRecords] = useState<RecordItem[]>(initialRecords);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    fetch("/api/records")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => payload.records?.length && setRecords(payload.records))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visible = useMemo(() => {
    const needle = query.toLowerCase().trim();
    const inSection = active === "home" ? records : records.filter((record) => record.section === active);
    if (!needle) return inSection;
    return inSection.filter((record) =>
      `${record.title} ${record.subtitle} ${Object.values(record.data).join(" ")}`.toLowerCase().includes(needle),
    );
  }, [active, query, records]);

  function navigate(next: "home" | Section) {
    setActive(next);
    setQuery("");
    setMobileMenu(false);
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const optimistic = editing.id
      ? records.map((record) => (record.id === editing.id ? editing : record))
      : [...records, { ...editing, id: Date.now() }];
    setRecords(optimistic);
    setEditing(null);
    try {
      const response = await fetch("/api/records", {
        method: editing.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (response.ok) {
        const payload = await response.json();
        setRecords((current) =>
          editing.id
            ? current.map((record) => (record.id === editing.id ? payload.record : record))
            : current.map((record) => (record.id === optimistic[optimistic.length - 1].id ? payload.record : record)),
        );
      }
      setToast("Shared changes saved");
    } catch {
      setToast("Saved in this preview");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item: RecordItem) {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    setRecords((current) => current.filter((record) => record.id !== item.id));
    await fetch(`/api/records?id=${item.id}`, { method: "DELETE" }).catch(() => undefined);
    setToast("Item deleted");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <button className="brand" onClick={() => navigate("home")} aria-label="DrSmile dashboard home">
          <img src="/drsmile-logo.png" alt="DrSmile Whitening" />
        </button>
        <div className="workspace-pill">
          <span>DS</span>
          <div><strong>DrSmile Team</strong><small>Shared workspace</small></div>
        </div>
        <nav aria-label="Dashboard menu">
          <p className="nav-label">Workspace</p>
          {menus.map((menu) => (
            <button key={menu.id} className={active === menu.id ? "active" : ""} onClick={() => navigate(menu.id)}>
              <span className="nav-icon">{menu.short}</span>
              <span>{menu.label}</span>
              {menu.id !== "home" && <em>{records.filter((record) => record.section === menu.id).length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="https://drsmile.my/" target="_blank" rel="noreferrer"><span>↗</span> View DrSmile website</a>
          <p><span className="status-dot" />Team data synced</p>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMobileMenu((value) => !value)} aria-label="Toggle menu">☰</button>
          <label className="search">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${active === "home" ? "the workspace" : pageCopy[active].title.toLowerCase()}…`} />
            <kbd>⌘ K</kbd>
          </label>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">◎</button>
            <div className="avatar">DS</div>
            <div className="profile"><strong>DrSmile Team</strong><small>Shared access</small></div>
          </div>
        </header>

        {active === "home" ? (
          <Overview records={records} navigate={navigate} setToast={setToast} />
        ) : (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">{pageCopy[active].eyebrow}</p>
                <h1>{pageCopy[active].title}</h1>
                <p>{pageCopy[active].description}</p>
              </div>
              <div className="heading-actions">
                {active === "faq" && <a className="secondary-button" href="https://docs.google.com/spreadsheets/d/1ZD5AVEsnUGld4OPlEVESpjuINQ8Q3QopSdYCjamhtKU/edit?gid=483265670#gid=483265670" target="_blank" rel="noreferrer">Open source sheet ↗</a>}
                <button className="primary-button" onClick={() => setEditing(structuredClone(blankBySection[active]))}>＋ Add item</button>
              </div>
            </div>

            {active === "payments" && <PaymentStudio setToast={setToast} />}

            <div className="list-toolbar">
              <p><strong>{visible.length}</strong> {visible.length === 1 ? "item" : "items"}</p>
              <span>Last updated today</span>
            </div>

            <div className={`record-grid ${active}`}>
              {visible.map((item) => (
                <RecordCard key={item.id} item={item} setEditing={setEditing} removeItem={removeItem} setToast={setToast} />
              ))}
              {visible.length === 0 && (
                <div className="empty-state">
                  <span>⌕</span><h3>No matching items</h3><p>Try a different keyword or add a new item.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {editing && (
        <EditModal
          item={editing}
          setItem={setEditing}
          onClose={() => setEditing(null)}
          onSave={saveItem}
          saving={saving}
          setToast={setToast}
        />
      )}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {mobileMenu && <button className="menu-backdrop" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}
    </div>
  );
}

function Overview({ records, navigate, setToast }: { records: RecordItem[]; navigate: (next: "home" | Section) => void; setToast: (value: string) => void }) {
  const stats = [
    { label: "Products", value: records.filter((item) => item.section === "products").length, detail: "Across 4 channels", accent: "lime", section: "products" as Section },
    { label: "Pharmacies", value: records.filter((item) => item.section === "pharmacies").length, detail: "Retail partners", accent: "blue", section: "pharmacies" as Section },
    { label: "Payment options", value: records.filter((item) => item.section === "payments").length, detail: "Ready for orders", accent: "pink", section: "payments" as Section },
    { label: "FAQ answers", value: records.filter((item) => item.section === "faq").length, detail: "Shared knowledge", accent: "gold", section: "faq" as Section },
  ];
  const recent = records.slice(-5).reverse();
  return (
    <section className="page overview">
      <div className="welcome">
        <div>
          <p className="eyebrow">Monday · DrSmile workspace</p>
          <h1>Everything your team needs,<br /><span>ready for every order.</span></h1>
          <p>Pricing, pharmacy contacts, payment tools and customer answers — all in one shared place.</p>
        </div>
        <div className="welcome-art">
          <span className="orb orb-one" /><span className="orb orb-two" />
          <div className="smile-card"><strong>DrSmile</strong><span>team hub</span><i>◡</i></div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <button key={stat.label} className={`stat-card ${stat.accent}`} onClick={() => navigate(stat.section)}>
            <span className="stat-icon">{stat.label.slice(0, 2).toUpperCase()}</span>
            <div><p>{stat.label}</p><strong>{stat.value}</strong><small>{stat.detail}</small></div>
            <em>↗</em>
          </button>
        ))}
      </div>

      <div className="overview-grid">
        <div className="panel quick-panel">
          <div className="panel-heading"><div><p className="eyebrow">Shortcuts</p><h2>Quick actions</h2></div></div>
          <div className="quick-grid">
            <button onClick={() => navigate("products")}><span>PR</span><strong>Check pricing</strong><small>Compare channel prices</small></button>
            <button onClick={() => navigate("pharmacies")}><span>PH</span><strong>Find pharmacy</strong><small>Copy address or phone</small></button>
            <button onClick={() => navigate("payments")}><span>PY</span><strong>Create payment</strong><small>Atome or Payex portal</small></button>
            <button onClick={() => navigate("faq")}><span>FQ</span><strong>Find an answer</strong><small>Search team FAQ</small></button>
          </div>
        </div>
        <div className="panel activity-panel">
          <div className="panel-heading"><div><p className="eyebrow">Workspace</p><h2>Recently updated</h2></div><button onClick={() => setToast("You’re viewing the latest shared data")}>Live</button></div>
          <div className="activity-list">
            {recent.map((item) => (
              <button key={item.id} onClick={() => navigate(item.section)}>
                <span>{item.title.slice(0, 2).toUpperCase()}</span><div><strong>{item.title}</strong><small>{menus.find((menu) => menu.id === item.section)?.label}</small></div><em>›</em>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RecordCard({ item, setEditing, removeItem, setToast }: { item: RecordItem; setEditing: (item: RecordItem) => void; removeItem: (item: RecordItem) => void; setToast: (value: string) => void }) {
  if (item.section === "products") {
    return (
      <article className="record-card product-card">
        <div className="card-top"><span className="record-avatar">DS</span><div><h3>{item.title}</h3><p>{item.data.sku || item.subtitle}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} /></div>
        <div className="price-highlight"><span>Ala carte</span><strong>{item.data.alacart || "—"}</strong><small>PWP {item.data.pwp || "—"}</small></div>
        <div className="channel-grid">{channelFields.map(([key, label]) => <div key={key}><span>{label}</span><strong>{item.data[key] || "—"}</strong></div>)}</div>
        <div className="card-footer"><span className="status-chip">{item.data.status || "Active"}</span><button onClick={() => copyText(`${item.title} — ${item.data.alacart}`, "Price", setToast)}>Copy price</button></div>
      </article>
    );
  }
  if (item.section === "pharmacies") {
    return (
      <article className="record-card pharmacy-card">
        <div className="card-top"><span className="record-avatar">＋</span><div><h3>{item.title}</h3><p>{item.subtitle || item.data.state}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} /></div>
        <div className="contact-row"><span>Phone</span><strong>{item.data.phone || "—"}</strong><button onClick={() => copyText(item.data.phone, "Phone number", setToast)}>Copy</button></div>
        <div className="address-block"><span>Full address</span><p>{item.data.address || "—"}</p><button onClick={() => copyText(item.data.address, "Address", setToast)}>Copy full address</button></div>
      </article>
    );
  }
  if (item.section === "payments") {
    return (
      <article className="record-card payment-card">
        <div className="card-top"><span className="payment-logo">{item.title.slice(0, 2).toUpperCase()}</span><div><h3>{item.title}</h3><p>{item.subtitle}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} /></div>
        <p className="payment-details">{item.data.details}</p>
        {item.data.qrUrl ? <img className="qr-image" src={item.data.qrUrl} alt={`${item.title} QR code`} /> : <div className="qr-placeholder"><span>QR</span><small>Add payment QR</small></div>}
        <div className="payment-actions">
          {item.data.portal && <a href={item.data.portal} target="_blank" rel="noreferrer">Create link ↗</a>}
          {item.data.link && <button onClick={() => copyText(item.data.link, "Payment link", setToast)}>Copy link</button>}
          {item.data.qrUrl && <button onClick={() => copyText(new URL(item.data.qrUrl, window.location.href).href, "QR link", setToast)}>Copy QR</button>}
        </div>
      </article>
    );
  }
  if (item.section === "faq") {
    return (
      <article className="record-card faq-card">
        <div className="faq-number">Q</div><div className="faq-content"><span>{item.data.category || item.subtitle}</span><h3>{item.title}</h3><p>{item.data.answer}</p><button onClick={() => copyText(item.data.answer, "Answer", setToast)}>Copy answer</button></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} />
      </article>
    );
  }
  return (
    <article className="record-card point-card">
      <div className="card-top"><span className="record-avatar">PT</span><div><h3>{item.title}</h3><p>{item.subtitle}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} /></div>
      <div className="point-value"><strong>{item.data.points || "—"}</strong><span>{item.data.value || "—"}</span></div>
      <p>{item.data.terms}</p><div className="card-footer"><span className="status-chip">{item.data.status || "Active"}</span><button onClick={() => copyText(`${item.title}: ${item.data.points} = ${item.data.value}. ${item.data.terms}`, "Reward details", setToast)}>Copy details</button></div>
    </article>
  );
}

function CardMenu({ item, setEditing, removeItem }: { item: RecordItem; setEditing: (item: RecordItem) => void; removeItem: (item: RecordItem) => void }) {
  return <div className="card-menu"><button onClick={() => setEditing(structuredClone(item))}>Edit</button><button className="delete" onClick={() => removeItem(item)}>Delete</button></div>;
}

function PaymentStudio({ setToast }: { setToast: (value: string) => void }) {
  const [gateway, setGateway] = useState("Atome");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const portal = gateway === "Atome" ? "https://portal.atome.my/main/dashboard" : "https://portal.payex.io/AutoPayments";
  return (
    <div className="payment-studio">
      <div><p className="eyebrow">Payment link studio</p><h2>Create a payment request</h2><span>Prepare the order, then continue securely in your selected payment portal.</span></div>
      <label><span>Gateway</span><select value={gateway} onChange={(event) => setGateway(event.target.value)}><option>Atome</option><option>Payex</option></select></label>
      <label><span>Amount (RM)</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
      <label><span>Order reference</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. DS-1042" /></label>
      <div className="studio-actions">
        <button onClick={() => copyText(`${gateway} payment • RM ${amount || "0.00"} • ${reference || "No reference"}`, "Payment brief", setToast)}>Copy brief</button>
        <a href={portal} target="_blank" rel="noreferrer">Continue in {gateway} ↗</a>
      </div>
    </div>
  );
}

function EditModal({ item, setItem, onClose, onSave, saving, setToast }: { item: RecordItem; setItem: (item: RecordItem) => void; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void; saving: boolean; setToast: (value: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fields: Record<Section, [string, string, "text" | "textarea"][]> = {
    products: [["sku", "SKU", "text"], ["alacart", "Ala carte price", "text"], ["pwp", "PWP price", "text"], ["pharmacy", "Pharmacy promo price", "text"], ["shopee", "Shopee promo price", "text"], ["website", "Website promo price", "text"], ["facebook", "Facebook promo price", "text"], ["status", "Status", "text"]],
    points: [["points", "Points required", "text"], ["value", "Reward value", "text"], ["terms", "Terms", "textarea"], ["status", "Status", "text"]],
    pharmacies: [["phone", "Phone number", "text"], ["address", "Full address", "textarea"], ["state", "State", "text"]],
    payments: [["details", "Payment instructions", "textarea"], ["link", "Payment link", "text"], ["portal", "Portal link", "text"], ["status", "Status", "text"]],
    faq: [["category", "Category", "text"], ["answer", "Answer", "textarea"], ["source", "Source", "text"]],
  };

  function updateData(key: string, value: string) {
    setItem({ ...item, data: { ...item.data, [key]: value } });
  }

  async function uploadQr(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/files", { method: "POST", body: form });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      updateData("qrUrl", payload.url);
      setToast("QR uploaded");
    } catch {
      setToast("QR upload will be available after publishing");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" onSubmit={onSave}>
        <div className="modal-heading"><div><p className="eyebrow">{item.id ? "Update item" : "New item"}</p><h2>{item.id ? item.title : `Add to ${menus.find((menu) => menu.id === item.section)?.label}`}</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div>
        <div className="form-grid">
          <label className="full"><span>{item.section === "faq" ? "Question" : item.section === "pharmacies" ? "Shop name" : "Name"}</span><input required value={item.title} onChange={(event) => setItem({ ...item, title: event.target.value })} placeholder="Enter a clear name" /></label>
          <label className="full"><span>{item.section === "pharmacies" ? "Area / location" : "Short description"}</span><input value={item.subtitle} onChange={(event) => setItem({ ...item, subtitle: event.target.value })} placeholder="Optional supporting detail" /></label>
          {fields[item.section].map(([key, label, type]) => (
            <label key={key} className={type === "textarea" ? "full" : ""}><span>{label}</span>{type === "textarea" ? <textarea value={item.data[key] || ""} onChange={(event) => updateData(key, event.target.value)} /> : <input value={item.data[key] || ""} onChange={(event) => updateData(key, event.target.value)} />}</label>
          ))}
          {item.section === "payments" && (
            <label className="full upload-field"><span>Payment QR image</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadQr(event.target.files?.[0])} /><small>{uploading ? "Uploading…" : item.data.qrUrl ? "QR attached — choose another file to replace it." : "PNG, JPG or WebP"}</small></label>
          )}
        </div>
        <div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving || uploading}>{saving ? "Saving…" : "Save shared item"}</button></div>
      </form>
    </div>
  );
}
