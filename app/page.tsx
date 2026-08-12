"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import sheetData from "./sheet-data.json";

type Section = "products" | "promotions" | "points" | "pharmacies" | "payments" | "faq" | "calendar";
type RecordItem = {
  id: number;
  section: Section;
  title: string;
  subtitle: string;
  data: Record<string, string>;
};

type ImportableSection = Exclude<Section, "payments" | "promotions" | "calendar">;

const DEFAULT_PRODUCT_CATEGORIES = ["牙粉", "完整美白疗程", "漱口水", "加购产品", "包包"];
const ALL_PRODUCTS = "All Item";
const ALL_STATES = "All";

const SOURCE_SHEET_URL = "https://docs.google.com/spreadsheets/d/18DC7Df9OCFtrbj5FmZUVcLTwC0hg_2lYnNDFjrpMSaU/edit?gid=1909559648#gid=1909559648";

const menus: { id: "home" | Section; label: string; short: string }[] = [
  { id: "home", label: "Overview", short: "OV" },
  { id: "calendar", label: "Calendar", short: "CL" },
  { id: "products", label: "Products & Pricing", short: "PR" },
  { id: "promotions", label: "Promotion", short: "PM" },
  { id: "points", label: "Point Redeem", short: "PT" },
  { id: "pharmacies", label: "Pharmacy List", short: "PH" },
  { id: "payments", label: "Payment Method", short: "PY" },
  { id: "faq", label: "FAQ", short: "FQ" },
];

const channelFields = [
  ["facebook", "FB", "facebookPwp"],
  ["website", "Website", "websitePwp"],
  ["shopee", "Shopee", ""],
  ["pharmacy", "Pharmacy", ""],
] as const;

const paymentRecords: RecordItem[] = [
  {
    id: 1001,
    section: "payments",
    title: "Bank Transfer",
    subtitle: "Manual payment",
    data: { details: "Add bank name and account number", link: "", qrUrl: "", status: "Available" },
  },
  {
    id: 1002,
    section: "payments",
    title: "Touch ’n Go",
    subtitle: "QR payment",
    data: { details: "Upload TNG QR", link: "", qrUrl: "", status: "Available" },
  },
  {
    id: 1003,
    section: "payments",
    title: "Credit Card",
    subtitle: "Payex",
    data: { details: "Create a secure card payment link in Payex", link: "", qrUrl: "", portal: "https://portal.payex.io/AutoPayments", status: "Available" },
  },
  {
    id: 1004,
    section: "payments",
    title: "Atome Pay",
    subtitle: "Buy now, pay later",
    data: { details: "Create an Atome payment link", link: "", qrUrl: "", portal: "https://portal.atome.my/main/dashboard", status: "Available" },
  },
  {
    id: 1005,
    section: "payments",
    title: "Shopee Pay",
    subtitle: "QR payment",
    data: { details: "Upload ShopeePay QR", link: "", qrUrl: "", status: "Available" },
  },
  {
    id: 1006,
    section: "payments",
    title: "Cash on Delivery",
    subtitle: "COD",
    data: { details: "Confirm delivery area and fee before order", link: "", qrUrl: "", status: "Available" },
  },
];

const initialRecords: RecordItem[] = [
  ...(sheetData.records as RecordItem[]),
  ...paymentRecords,
];

const blankBySection: Record<Section, RecordItem> = {
  products: { id: 0, section: "products", title: "", subtitle: "", data: { sku: "", category: "", remark: "", posterUrl: "", alacart: "", alacartSG: "", pharmacy: "", shopee: "", website: "", websitePwp: "", facebook: "", facebookPwp: "", status: "Active" } },
  promotions: { id: 0, section: "promotions", title: "", subtitle: "", data: { promotionName: "", month: new Date().toISOString().slice(0, 7), posterUrl: "", onlinePrice: "", shopeePrice: "", packageDetails: "", status: "Active" } },
  points: { id: 0, section: "points", title: "", subtitle: "", data: { points: "", value: "", terms: "", posterUrl: "", status: "Active" } },
  pharmacies: { id: 0, section: "pharmacies", title: "", subtitle: "", data: { phone: "", address: "", state: "" } },
  payments: { id: 0, section: "payments", title: "", subtitle: "", data: { details: "", link: "", qrUrl: "", portal: "", status: "Available" } },
  faq: { id: 0, section: "faq", title: "", subtitle: "", data: { answer: "", category: "", source: "Google Sheet" } },
  calendar: { id: 0, section: "calendar", title: "", subtitle: "", data: { date: localDateKey(new Date()), time: "", location: "", pic: "", attendees: "", details: "", status: "Scheduled" } },
};

const pageCopy: Record<Section, { eyebrow: string; title: string; description: string }> = {
  products: { eyebrow: "Commercial catalogue", title: "Products & pricing", description: "Ala carte, PWP and monthly promotion pricing across every sales channel." },
  promotions: { eyebrow: "Monthly campaign library", title: "Promotion", description: "Keep every month’s poster, package details, online price and Shopee price together." },
  points: { eyebrow: "Customer loyalty", title: "Point redeem", description: "Keep redemption rewards, point values and terms easy for the whole team to reference." },
  pharmacies: { eyebrow: "Retail network", title: "Pharmacy list", description: "Search every stockist and copy phone numbers or full addresses in one click." },
  payments: { eyebrow: "Order collection", title: "Payment methods", description: "Keep QR codes, payment instructions and gateway links ready for every order." },
  faq: { eyebrow: "Team knowledge", title: "Frequently asked questions", description: "A shared answer bank for fast, consistent customer replies." },
  calendar: { eyebrow: "Team schedule", title: "Calendar", description: "Plan every DrSmile event by date, activity and location for the whole admin team." },
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric" }).format(date);
}

function calendarCells(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  return [...Array.from({ length: leading }, () => null), ...Array.from({ length: days }, (_, index) => index + 1)];
}

function copyText(value: string, label: string, setToast: (value: string) => void) {
  if (!value || value === "—") return;
  navigator.clipboard.writeText(value);
  setToast(`${label} copied`);
}

function parseDelimited(text: string) {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function rm(value = "") {
  const clean = value.trim();
  if (!clean || clean === "-") return "—";
  return /^\d+(\.\d+)?$/.test(clean) ? `RM ${clean}` : clean;
}

function inferProductCategory(title: string) {
  const value = title.toLowerCase();
  if (value.includes("完整美白疗程")) return "完整美白疗程";
  if (value.includes("漱口水")) return "漱口水";
  if (value.includes("包") || value.includes("bag") || value.includes("tote")) return "包包";
  if (value.includes("牙粉") || value.includes("first trial")) return "牙粉";
  return "加购产品";
}

function productCategory(item: RecordItem) {
  return Object.prototype.hasOwnProperty.call(item.data, "category")
    ? item.data.category
    : inferProductCategory(item.title);
}

function importRows(section: ImportableSection, text: string): Omit<RecordItem, "id">[] {
  const rows = parseDelimited(text);
  if (!rows.length) return [];

  if (section === "products") {
    const start = rows.findIndex((row) => row[0]?.toLowerCase() === "items");
    return rows.slice(Math.max(start + 2, 0)).filter((row) => row[0]).map((row) => ({
      section,
      title: row[0],
      subtitle: "Google Sheet",
      data: {
        sku: row[1] || "—",
        category: inferProductCategory(row[0]),
        remark: "",
        alacart: rm(row[2]),
        facebook: rm(row[3]),
        facebookPwp: rm(row[4]),
        website: rm(row[5]),
        websitePwp: rm(row[6]),
        shopee: rm(row[7]),
        pharmacy: rm(row[8]),
        status: "Sheet",
      },
    }));
  }

  if (section === "points") {
    const start = rows.findIndex((row) => row[0]?.toLowerCase() === "items");
    return rows.slice(Math.max(start + 1, 0)).filter((row) => row[0] && row[1]).map((row) => ({
      section,
      title: row[0],
      subtitle: "Point Redeem",
      data: { points: `${row[1]} points`, value: "Redeem reward", terms: "Based on DrSmile Point Redeem sheet", posterUrl: "", status: "Active" },
    }));
  }

  if (section === "pharmacies") {
    const start = rows.findIndex((row) => row[0]?.toLowerCase() === "city");
    return rows.slice(Math.max(start + 1, 0)).filter((row) => row[1]).map((row) => ({
      section,
      title: row[1],
      subtitle: row[0],
      data: { address: row[2], postcode: row[3], phone: row[4], state: row[0] },
    }));
  }

  const questions = rows
    .map((row, index) => ({ index, values: row.filter(Boolean) }))
    .filter(({ values }) => values[0]?.startsWith("Q:") && values[1]);

  return questions.map((question, questionIndex) => {
    const end = questions[questionIndex + 1]?.index ?? rows.length;
    const answerParts: string[] = [];
    rows.slice(question.index + 1, end).forEach((row) => {
      const values = row.filter(Boolean);
      if (!values.length || values[0] === "Save Reply:" || values[0].startsWith("Q:")) return;
      if (values[0] === "A:" || values[0] === "问:" || values[0].startsWith("Step")) {
        answerParts.push(values.slice(1).join(" "));
      } else if (answerParts.length && values.join(" ").length > 5) {
        answerParts.push(values.join(" "));
      }
    });
    return {
      section,
      title: question.values[1],
      subtitle: "Customer FAQ",
      data: {
        answer: answerParts.filter(Boolean).join("\n") || "Answer pending in source sheet",
        category: "Product & oral care",
        source: "DrSmile Dashboard Google Sheet",
      },
    };
  });
}

export default function Home() {
  const [active, setActive] = useState<"home" | Section>("home");
  const [records, setRecords] = useState<RecordItem[]>(initialRecords);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [importing, setImporting] = useState<ImportableSection | null>(null);
  const [promotionTitle, setPromotionTitle] = useState("");
  const [promotionMonth, setPromotionMonth] = useState(new Date().toISOString().slice(0, 7));
  const [productCategories, setProductCategories] = useState<string[]>(DEFAULT_PRODUCT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(ALL_PRODUCTS);
  const [newCategory, setNewCategory] = useState("");
  const [selectedState, setSelectedState] = useState(ALL_STATES);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    fetch("/api/records")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => payload.records?.length && setRecords(payload.records))
      .catch(() => undefined);
    fetch("/api/categories")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => Array.isArray(payload.categories) && setProductCategories(payload.categories))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const currentCampaign = records.find((record) => record.section === "promotions" && record.data.month === promotionMonth);
    setPromotionTitle(currentCampaign?.data.promotionName || "");
  }, [promotionMonth, records]);

  const visible = useMemo(() => {
    const needle = query.toLowerCase().trim();
    const inSection = active === "home" ? records : records.filter((record) => {
      if (record.section !== active) return false;
      if (active === "promotions" && record.data.month !== promotionMonth) return false;
      if (active === "products" && selectedCategory !== ALL_PRODUCTS && productCategory(record) !== selectedCategory) return false;
      if (active === "pharmacies" && selectedState !== ALL_STATES && (record.data.state || record.subtitle || "Unspecified") !== selectedState) return false;
      return true;
    });
    if (!needle) return inSection;
    return inSection.filter((record) =>
      `${record.title} ${record.subtitle} ${Object.values(record.data).join(" ")}`.toLowerCase().includes(needle),
    );
  }, [active, query, records, promotionMonth, selectedCategory, selectedState]);

  const pharmacyStates = useMemo(() => Array.from(new Set(
    records
      .filter((record) => record.section === "pharmacies")
      .map((record) => record.data.state || record.subtitle || "Unspecified")
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right)), [records]);

  function navigate(next: "home" | Section) {
    setActive(next);
    setQuery("");
    if (next === "products") setSelectedCategory(ALL_PRODUCTS);
    if (next === "pharmacies") setSelectedState(ALL_STATES);
    setMobileMenu(false);
  }

  function startAdd() {
    if (active === "home") return;
    const next = structuredClone(blankBySection[active]);
    if (active === "products") next.data.category = selectedCategory === ALL_PRODUCTS ? "" : selectedCategory;
    if (active === "promotions") {
      next.data.month = promotionMonth;
      next.data.promotionName = promotionTitle;
    }
    setEditing(next);
  }

  function startCalendarEvent(date: string) {
    const next = structuredClone(blankBySection.calendar);
    next.data.date = date;
    setEditing(next);
  }

  async function savePromotionTitle() {
    const campaignItems = records.filter((record) => record.section === "promotions" && record.data.month === promotionMonth);
    if (!campaignItems.length) {
      setToast("Add a promotion item first");
      return;
    }
    const updated = campaignItems.map((record) => ({ ...record, data: { ...record.data, promotionName: promotionTitle.trim() } }));
    setRecords((current) => current.map((record) => updated.find((item) => item.id === record.id) || record));
    await Promise.all(updated.map((record) => fetch("/api/records", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(record) })));
    setToast("Promotion name saved");
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

  async function addProductCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    if (productCategories.some((category) => category.toLowerCase() === name.toLowerCase())) {
      setToast("Category already exists");
      return;
    }
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    if (!response?.ok) {
      setToast("Category could not be added");
      return;
    }
    const payload = await response.json();
    setProductCategories(payload.categories);
    setSelectedCategory(name);
    setNewCategory("");
    setToast("Category added");
  }

  async function deleteProductCategory(name: string) {
    if (!window.confirm(`Delete category “${name}”? Products will remain under All Item.`)) return;
    const response = await fetch(`/api/categories?name=${encodeURIComponent(name)}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setToast("Category could not be deleted");
      return;
    }
    const payload = await response.json();
    setProductCategories(payload.categories);
    setRecords((current) => current.map((record) => record.section === "products" && productCategory(record) === name
      ? { ...record, data: { ...record.data, category: "" } }
      : record));
    if (selectedCategory === name) setSelectedCategory(ALL_PRODUCTS);
    setToast("Category deleted");
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
                {active === "promotions" && (
                  <label className="campaign-title-editor">
                    <span>Title B · Promotion Name</span>
                    <input value={promotionTitle} onChange={(event) => setPromotionTitle(event.target.value)} placeholder="Enter this month’s promotion name" />
                    <button type="button" onClick={savePromotionTitle}>Save</button>
                  </label>
                )}
                <p>{pageCopy[active].description}</p>
              </div>
              <div className="heading-actions">
                {active === "promotions" && <label className="month-filter"><span>Track by month</span><input type="month" value={promotionMonth} onChange={(event) => setPromotionMonth(event.target.value)} /></label>}
                {active !== "payments" && active !== "promotions" && active !== "calendar" && <a className="secondary-button" href={SOURCE_SHEET_URL} target="_blank" rel="noreferrer">Open Sheet ↗</a>}
                {active !== "payments" && active !== "promotions" && active !== "calendar" && <button className="secondary-button import-button" onClick={() => setImporting(active)}>⇧ Import data</button>}
                <button className="primary-button" onClick={startAdd}>＋ {active === "calendar" ? "Add event" : "Add item"}</button>
              </div>
            </div>

            {active !== "payments" && active !== "promotions" && active !== "calendar" && (
              <div className="sheet-note">
                <span className="sheet-mark">GS</span>
                <div><strong>Imported from DrSmile Dashboard</strong><small>Copy rows from the matching Google Sheet tab and use Import data anytime.</small></div>
                <span>{records.filter((record) => record.section === active).length} records</span>
              </div>
            )}

            {active === "payments" && <PaymentStudio setToast={setToast} />}

            {active === "calendar" ? (
              <CalendarWorkspace
                events={records.filter((record) => record.section === "calendar")}
                month={calendarMonth}
                setMonth={setCalendarMonth}
                onAddDate={startCalendarEvent}
                setEditing={setEditing}
                removeItem={removeItem}
              />
            ) : <div className={active === "products" || active === "pharmacies" ? "products-browser" : ""}>
              {active === "products" && (
                <aside className="category-panel" aria-label="Product categories">
                  <div className="category-heading"><span>Categories</span><small>{productCategories.length}</small></div>
                  <button className={selectedCategory === ALL_PRODUCTS ? "category-filter active" : "category-filter"} onClick={() => setSelectedCategory(ALL_PRODUCTS)}>
                    <span>All Item</span><em>{records.filter((record) => record.section === "products").length}</em>
                  </button>
                  <div className="category-list">
                    {productCategories.map((category) => (
                      <div className={selectedCategory === category ? "category-row active" : "category-row"} key={category}>
                        <button className="category-filter" onClick={() => setSelectedCategory(category)}><span>{category}</span><em>{records.filter((record) => record.section === "products" && productCategory(record) === category).length}</em></button>
                        <button className="category-delete" onClick={() => deleteProductCategory(category)} aria-label={`Delete ${category}`}>×</button>
                      </div>
                    ))}
                  </div>
                  <form className="category-add" onSubmit={addProductCategory}>
                    <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Add category" aria-label="New category name" maxLength={40} />
                    <button type="submit" aria-label="Add category">＋</button>
                  </form>
                </aside>
              )}
              {active === "pharmacies" && (
                <aside className="category-panel" aria-label="Pharmacy states">
                  <div className="category-heading"><span>Filter by State</span><small>{pharmacyStates.length}</small></div>
                  <button className={selectedState === ALL_STATES ? "category-filter active" : "category-filter"} onClick={() => setSelectedState(ALL_STATES)}>
                    <span>All</span><em>{records.filter((record) => record.section === "pharmacies").length}</em>
                  </button>
                  <div className="category-list pharmacy-state-list">
                    {pharmacyStates.map((state) => (
                      <button className={selectedState === state ? "category-filter active" : "category-filter"} key={state} onClick={() => setSelectedState(state)}>
                        <span>{state}</span><em>{records.filter((record) => record.section === "pharmacies" && (record.data.state || record.subtitle || "Unspecified") === state).length}</em>
                      </button>
                    ))}
                  </div>
                </aside>
              )}
              <div className="products-results">
                <div className="list-toolbar">
                  <p><strong>{visible.length}</strong> {visible.length === 1 ? "item" : "items"}{active === "products" && selectedCategory !== ALL_PRODUCTS ? ` in ${selectedCategory}` : ""}{active === "pharmacies" && selectedState !== ALL_STATES ? ` in ${selectedState}` : ""}</p>
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
              </div>
            </div>}
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
          productCategories={productCategories}
        />
      )}
      {importing && (
        <ImportModal
          section={importing}
          onClose={() => setImporting(null)}
          setRecords={setRecords}
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
    { label: "Promotions", value: records.filter((item) => item.section === "promotions").length, detail: "Monthly campaigns", accent: "blue", section: "promotions" as Section },
    { label: "Pharmacies", value: records.filter((item) => item.section === "pharmacies").length, detail: "Retail partners", accent: "blue", section: "pharmacies" as Section },
    { label: "Payment options", value: records.filter((item) => item.section === "payments").length, detail: "Ready for orders", accent: "pink", section: "payments" as Section },
    { label: "FAQ answers", value: records.filter((item) => item.section === "faq").length, detail: "Shared knowledge", accent: "gold", section: "faq" as Section },
    { label: "Events", value: records.filter((item) => item.section === "calendar").length, detail: "Shared schedule", accent: "blue", section: "calendar" as Section },
  ];
  const recent = records.slice(-5).reverse();
  return (
    <section className="page overview">
      <div className="welcome">
        <div>
          <p className="eyebrow">Google Sheet powered · DrSmile workspace</p>
          <h1>Everything your team needs,<br /><span>ready for every order.</span></h1>
          <p>123 product, reward, pharmacy and FAQ records imported from your team sheet — searchable and easy to copy.</p>
        </div>
        <div className="welcome-art">
          <span className="orb orb-one" /><span className="orb orb-two" />
          <div className="smile-card"><strong>DrSmile</strong><span>team hub</span><i>◡</i></div>
        </div>
      </div>

      <div className="stats-grid six">
        {stats.map((stat) => (
          <button key={stat.label} className={`stat-card ${stat.accent}`} onClick={() => navigate(stat.section)}>
            <span className="stat-icon">{stat.label.slice(0, 2).toUpperCase()}</span>
            <div><p>{stat.label}</p><strong>{stat.value}</strong><small>{stat.detail}</small></div>
            <em>↗</em>
          </button>
        ))}
      </div>

      <OverviewCalendar events={records.filter((record) => record.section === "calendar")} onOpen={() => navigate("calendar")} />

      <div className="overview-grid">
        <div className="panel quick-panel">
          <div className="panel-heading"><div><p className="eyebrow">Shortcuts</p><h2>Quick actions</h2></div></div>
          <div className="quick-grid">
            <button onClick={() => navigate("products")}><span>PR</span><strong>Check pricing</strong><small>Compare price and PWP</small></button>
            <button onClick={() => navigate("promotions")}><span>PM</span><strong>Monthly promotion</strong><small>Poster, package and prices</small></button>
            <button onClick={() => navigate("pharmacies")}><span>PH</span><strong>Find pharmacy</strong><small>Copy address or phone</small></button>
            <button onClick={() => navigate("payments")}><span>PY</span><strong>Create payment</strong><small>Atome or Payex portal</small></button>
            <button onClick={() => navigate("faq")}><span>FQ</span><strong>Find an answer</strong><small>Search team FAQ</small></button>
            <button onClick={() => navigate("calendar")}><span>CL</span><strong>Team calendar</strong><small>View events and locations</small></button>
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

function MonthGrid({ month, events, onDayClick, compact = false }: { month: Date; events: RecordItem[]; onDayClick?: (date: string) => void; compact?: boolean }) {
  const today = localDateKey(new Date());
  const cells = calendarCells(month);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  return (
    <div className={compact ? "month-grid compact" : "month-grid"}>
      {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => <span className="weekday" key={day}>{day}</span>)}
      {cells.map((day, index) => {
        if (!day) return <span className="calendar-blank" key={`blank-${index}`} />;
        const date = localDateKey(new Date(year, monthIndex, day));
        const dayEvents = events.filter((event) => event.data.date === date);
        return (
          <button type="button" className={`${date === today ? "today " : ""}${dayEvents.length ? "has-events" : ""}`} key={date} onClick={() => onDayClick?.(date)} aria-label={`${date}${dayEvents.length ? `, ${dayEvents.length} events` : ""}`}>
            <strong>{day}</strong>
            {!!dayEvents.length && (compact
              ? <span className="event-dots">{dayEvents.slice(0, 3).map((event) => <i key={event.id} />)}</span>
              : <span className="calendar-events">{dayEvents.slice(0, 3).map((event, eventIndex) => <span className={`calendar-event-pill tone-${eventIndex % 3}`} key={event.id}><b>{event.title}</b>{event.data.time && <small>{event.data.time}</small>}</span>)}{dayEvents.length > 3 && <em>+{dayEvents.length - 3} more</em>}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function OverviewCalendar({ events, onOpen }: { events: RecordItem[]; onOpen: () => void }) {
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const upcoming = events
    .filter((event) => event.data.date >= localDateKey(today))
    .sort((left, right) => `${left.data.date}${left.data.time}`.localeCompare(`${right.data.date}${right.data.time}`))
    .slice(0, 4);
  return (
    <section className="panel overview-calendar">
      <div className="calendar-overview-main">
        <div className="calendar-title-row"><div><p className="eyebrow">Today · {new Intl.DateTimeFormat("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(today)}</p><h2>Calendar</h2></div><button onClick={onOpen}>Open calendar ›</button></div>
        <div className="month-pill"><strong>{monthLabel(currentMonth)}</strong><span>{events.filter((event) => event.data.date?.startsWith(localDateKey(currentMonth).slice(0, 7))).length} events</span></div>
        <MonthGrid month={currentMonth} events={events} compact />
      </div>
      <div className="upcoming-overview">
        <p className="eyebrow">Coming up</p>
        <h3>Next activities</h3>
        {upcoming.length ? upcoming.map((event) => <button key={event.id} onClick={onOpen}><time>{dateFromKey(event.data.date).toLocaleDateString("en-MY", { day: "2-digit", month: "short" })}</time><div><strong>{event.title}</strong><small>{event.data.location || "Location not added"}{event.data.time ? ` · ${event.data.time}` : ""}</small></div></button>) : <div className="no-events"><span>＋</span><p>No upcoming events yet.</p><button onClick={onOpen}>Add the first event</button></div>}
      </div>
    </section>
  );
}

function CalendarWorkspace({ events, month, setMonth, onAddDate, setEditing, removeItem }: { events: RecordItem[]; month: Date; setMonth: React.Dispatch<React.SetStateAction<Date>>; onAddDate: (date: string) => void; setEditing: (item: RecordItem) => void; removeItem: (item: RecordItem) => void }) {
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const monthEvents = events.filter((event) => event.data.date?.startsWith(monthPrefix)).sort((left, right) => `${left.data.date}${left.data.time}`.localeCompare(`${right.data.date}${right.data.time}`));
  const today = new Date();
  function changeMonth(offset: number) { setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1)); }
  return (
    <div className="calendar-workspace">
      <section className="panel calendar-board">
        <div className="calendar-board-header">
          <div><p className="eyebrow">Click a date to add an event</p><h2>{monthLabel(month)}</h2></div>
          <div><button onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button><button onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button><button onClick={() => changeMonth(1)} aria-label="Next month">›</button></div>
        </div>
        <MonthGrid month={month} events={monthEvents} onDayClick={onAddDate} />
      </section>
      <aside className="panel calendar-agenda">
        <div className="panel-heading"><div><p className="eyebrow">Monthly agenda</p><h2>{monthEvents.length} {monthEvents.length === 1 ? "event" : "events"}</h2></div></div>
        <div className="agenda-list">
          {monthEvents.map((event) => (
            <article key={event.id}>
              <time><strong>{dateFromKey(event.data.date).getDate()}</strong><span>{dateFromKey(event.data.date).toLocaleDateString("en-MY", { month: "short" })}</span></time>
              <div><h3>{event.title}</h3><p>{event.data.time || "All day"} · {event.data.location || "Location not added"}</p>{event.data.pic && <span className="agenda-people">PIC · {event.data.pic}</span>}{event.data.attendees && <span className="agenda-people">Attend · {event.data.attendees}</span>}{event.data.details && <small>{event.data.details}</small>}</div>
              <div className="agenda-actions"><button onClick={() => setEditing(structuredClone(event))}>Edit</button><button className="delete" onClick={() => removeItem(event)}>Delete</button></div>
            </article>
          ))}
          {!monthEvents.length && <div className="no-events"><span>＋</span><p>No events planned for {monthLabel(month)}.</p><button onClick={() => onAddDate(localDateKey(new Date(month.getFullYear(), month.getMonth(), 1)))}>Add event</button></div>}
        </div>
      </aside>
    </div>
  );
}

function RecordCard({ item, setEditing, removeItem, setToast }: { item: RecordItem; setEditing: (item: RecordItem) => void; removeItem: (item: RecordItem) => void; setToast: (value: string) => void }) {
  if (item.section === "products") {
    return (
      <article className="record-card product-card">
        {item.data.posterUrl && <div className="product-poster-frame"><img className="product-poster" src={item.data.posterUrl} alt={`${item.title} poster`} /></div>}
        <div className="card-top"><span className="record-avatar">DS</span><div><h3>{item.title}</h3><p>{item.data.sku || item.subtitle}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} /></div>
        <div className="product-category-chip">{productCategory(item) || "Uncategorised"}</div>
        <div className="market-price-row">
          <div><span>Malaysia price</span><strong>{item.data.alacart || "—"}</strong></div>
          <div><span>Singapore price</span><strong>{item.data.alacartSG || "—"}</strong></div>
        </div>
        <div className="channel-grid">{channelFields.map(([key, label, pwpKey]) => <div key={key}><span>{label}</span><strong>{item.data[key] || "—"}</strong>{pwpKey && item.data[pwpKey] && item.data[pwpKey] !== "—" && <small>PWP {item.data[pwpKey]}</small>}</div>)}</div>
        <div className="product-remark"><span>Remark</span><p>{item.data.remark || "—"}</p></div>
        <div className="card-footer"><span className="status-chip">{item.data.status || "Active"}</span><button onClick={() => copyText(`${item.title}\nMalaysia: ${item.data.alacart || "—"}\nSingapore: ${item.data.alacartSG || "—"}\nRemark: ${item.data.remark || "—"}`, "Price", setToast)}>Copy price</button></div>
      </article>
    );
  }
  if (item.section === "promotions") {
    return (
      <article className="record-card promotion-card">
        <div className="promotion-poster-frame">
          {item.data.posterUrl ? <img className="promotion-poster" src={item.data.posterUrl} alt={`${item.title} promotion poster`} /> : <div className="poster-placeholder">POSTER</div>}
        </div>
        <div className="card-top"><span className="record-avatar">PM</span><div><h3>{item.title}</h3><p>{item.subtitle ? `SKU · ${item.subtitle}` : "SKU not added"}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} /></div>
        <div className="promotion-prices"><div><span>Online price</span><strong>{item.data.onlinePrice || "—"}</strong></div><div><span>Shopee price</span><strong>{item.data.shopeePrice || "—"}</strong></div></div>
        <div className="package-details"><span>Package details</span><p>{item.data.packageDetails || "No package details added yet."}</p></div>
        <div className="card-footer"><span className="status-chip">{item.data.status || "Active"}</span><button onClick={() => copyText(`${item.data.promotionName || "Promotion"}\n${item.title}\nSKU: ${item.subtitle || "—"}\nOnline: ${item.data.onlinePrice}\nShopee: ${item.data.shopeePrice}\n${item.data.packageDetails}`, "Promotion", setToast)}>Copy details</button></div>
      </article>
    );
  }
  if (item.section === "pharmacies") {
    return (
      <article className="record-card pharmacy-card">
        <div className="card-top"><span className="record-avatar">＋</span><div><h3>{item.title}</h3><p>{item.subtitle || item.data.state}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} /></div>
        <div className="contact-row"><span>Phone</span><strong>{item.data.phone || "—"}</strong><button onClick={() => copyText(item.data.phone, "Phone number", setToast)}>Copy</button></div>
        <div className="address-block"><span>Full address {item.data.postcode ? `· ${item.data.postcode}` : ""}</span><p>{item.data.address || "—"}</p><button onClick={() => copyText(item.data.address, "Address", setToast)}>Copy full address</button></div>
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
        <div className="faq-number">Q</div><div className="faq-content"><span>{item.data.category || item.subtitle}</span><h3>{item.title}</h3><details><summary>View answer</summary><p>{item.data.answer}</p></details><button onClick={() => copyText(item.data.answer, "Answer", setToast)}>Copy answer</button></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} />
      </article>
    );
  }
  return (
    <article className="record-card point-card">
      {item.data.posterUrl && <div className="point-poster-frame"><img className="point-poster" src={item.data.posterUrl} alt={`${item.title} reward`} /></div>}
      <div className="card-top"><span className="record-avatar">PT</span><div><h3>{item.title}</h3><p>{item.subtitle}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} /></div>
      <div className="point-value"><strong>{item.data.points || "—"}</strong><span>Redeem</span></div>
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

function ImportModal({
  section,
  onClose,
  setRecords,
  setToast,
}: {
  section: ImportableSection;
  onClose: () => void;
  setRecords: React.Dispatch<React.SetStateAction<RecordItem[]>>;
  setToast: (value: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => importRows(section, text), [section, text]);

  async function readFile(file?: File) {
    if (!file) return;
    setText(await file.text());
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed.length) {
      setToast("No matching rows found");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "replace", section, records: parsed }),
      });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      setRecords((current) => [
        ...current.filter((record) => record.section !== section),
        ...payload.records,
      ]);
      setToast(`${payload.records.length} records imported`);
      onClose();
    } catch {
      setToast("Import could not be saved");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal import-modal" onSubmit={submitImport}>
        <div className="modal-heading">
          <div><p className="eyebrow">Quick sheet import</p><h2>Import {menus.find((menu) => menu.id === section)?.label}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <ol className="import-steps">
          <li>Open the matching tab in Google Sheets.</li>
          <li>Select the table, copy it, then paste below.</li>
          <li>Check the item count and replace this section.</li>
        </ol>
        <textarea
          className="import-area"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste copied Google Sheet rows here…"
          autoFocus
        />
        <label className="file-import"><span>or choose a CSV / TSV file</span><input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" onChange={(event) => readFile(event.target.files?.[0])} /></label>
        <div className="import-preview">
          <span>Preview</span>
          <strong>{parsed.length} {parsed.length === 1 ? "record" : "records"} ready</strong>
          <small>{parsed.slice(0, 3).map((item) => item.title).join(" · ") || "Paste data to preview"}</small>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit" disabled={!parsed.length || busy}>{busy ? "Importing…" : `Replace with ${parsed.length} records`}</button>
        </div>
      </form>
    </div>
  );
}

function EditModal({ item, setItem, onClose, onSave, saving, setToast, productCategories }: { item: RecordItem; setItem: (item: RecordItem) => void; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void; saving: boolean; setToast: (value: string) => void; productCategories: string[] }) {
  const [uploading, setUploading] = useState(false);
  const fields: Record<Section, [string, string, "text" | "textarea" | "month" | "date" | "time"][]> = {
    products: [],
    promotions: [],
    points: [["points", "Points required", "text"], ["value", "Reward value", "text"], ["terms", "Terms", "textarea"], ["status", "Status", "text"]],
    pharmacies: [["phone", "Phone number", "text"], ["address", "Full address", "textarea"], ["state", "State", "text"]],
    payments: [["details", "Payment instructions", "textarea"], ["link", "Payment link", "text"], ["portal", "Portal link", "text"], ["status", "Status", "text"]],
    faq: [["category", "Category", "text"], ["answer", "Answer", "textarea"], ["source", "Source", "text"]],
    calendar: [["date", "Event date", "date"], ["time", "Start time", "time"], ["location", "Location", "text"], ["details", "Event details / remark", "textarea"], ["status", "Status", "text"]],
  };

  function updateData(key: string, value: string) {
    setItem({ ...item, data: { ...item.data, [key]: value } });
  }

  async function uploadImage(file?: File, target = "qrUrl") {
    if (!file) return;
    setUploading(true);
    try {
      const uploadFile = await prepareImageForUpload(file);
      const form = new FormData();
      form.append("file", uploadFile);
      const response = await fetch("/api/files", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Image upload failed");
      updateData(target, payload.url);
      setToast(target === "posterUrl" ? "Poster uploaded" : "QR uploaded");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" onSubmit={onSave}>
        <div className="modal-heading"><div><p className="eyebrow">{item.id ? "Update item" : "New item"}</p><h2>{item.id ? item.title : `Add to ${menus.find((menu) => menu.id === item.section)?.label}`}</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div>
        <div className="form-grid">
          <label className="full"><span>{item.section === "faq" ? "Question" : item.section === "pharmacies" ? "Shop name" : item.section === "promotions" ? "Title A · Package Name" : item.section === "calendar" ? "Event name" : "Name"}</span><input required value={item.title} onChange={(event) => setItem({ ...item, title: event.target.value })} placeholder={item.section === "promotions" ? "e.g. 配套A - 美白牙粉x2" : item.section === "calendar" ? "e.g. DrSmile Roadshow" : "Enter a clear name"} /></label>
          <label className="full"><span>{item.section === "pharmacies" ? "Area / location" : item.section === "promotions" ? "SKU" : item.section === "calendar" ? "Event type" : "Short description"}</span><input value={item.subtitle} onChange={(event) => setItem({ ...item, subtitle: event.target.value })} placeholder={item.section === "promotions" ? "e.g. 8A26" : item.section === "calendar" ? "e.g. Roadshow, training or campaign" : "Optional supporting detail"} /></label>
          {item.section === "products" && (
            <>
              <label><span>SKU</span><input value={item.data.sku || ""} onChange={(event) => updateData("sku", event.target.value)} /></label>
              <label><span>Category</span><select value={productCategory(item)} onChange={(event) => updateData("category", event.target.value)}><option value="">Uncategorised</option>{productCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
              <div className="price-fields full">
                <PriceField label="Malaysia Ala Carte" fieldKey="alacart" item={item} updateData={updateData} />
                <PriceField label="Singapore Ala Carte" fieldKey="alacartSG" item={item} updateData={updateData} defaultCurrency="SGD" />
                <PriceField label="FB Price" fieldKey="facebook" item={item} updateData={updateData} />
                <PriceField label="FB PWP" fieldKey="facebookPwp" item={item} updateData={updateData} />
                <PriceField label="Website Price" fieldKey="website" item={item} updateData={updateData} />
                <PriceField label="Website PWP" fieldKey="websitePwp" item={item} updateData={updateData} />
                <PriceField label="Shopee Price" fieldKey="shopee" item={item} updateData={updateData} />
                <PriceField label="Pharmacy Price" fieldKey="pharmacy" item={item} updateData={updateData} />
              </div>
              <label className="full"><span>Remark</span><textarea value={item.data.remark || ""} onChange={(event) => updateData("remark", event.target.value)} placeholder="Add product notes for the team" /></label>
              <label><span>Status</span><input value={item.data.status || ""} onChange={(event) => updateData("status", event.target.value)} /></label>
            </>
          )}
          {item.section === "promotions" && (
            <>
              <label><span>Promotion month</span><input type="month" value={item.data.month || ""} onChange={(event) => updateData("month", event.target.value)} /></label>
              <div className="price-fields full">
                <PriceField label="Online Price" fieldKey="onlinePrice" item={item} updateData={updateData} />
                <PriceField label="Shopee Price" fieldKey="shopeePrice" item={item} updateData={updateData} />
              </div>
              <label className="full"><span>Package details</span><textarea value={item.data.packageDetails || ""} onChange={(event) => updateData("packageDetails", event.target.value)} /></label>
              <label><span>Status</span><input value={item.data.status || ""} onChange={(event) => updateData("status", event.target.value)} /></label>
            </>
          )}
          {item.section === "calendar" && (
            <div className="multi-people-fields full">
              <MultiNameField label="PIC" value={item.data.pic || ""} onChange={(value) => updateData("pic", value)} placeholder="Type a PIC name" />
              <MultiNameField label="Who Attend" value={item.data.attendees || ""} onChange={(value) => updateData("attendees", value)} placeholder="Type an attendee name" />
            </div>
          )}
          {fields[item.section].map(([key, label, type]) => (
            <label key={key} className={type === "textarea" ? "full" : ""}><span>{label}</span>{type === "textarea" ? <textarea value={item.data[key] || ""} onChange={(event) => updateData(key, event.target.value)} /> : <input type={type} value={item.data[key] || ""} onChange={(event) => updateData(key, event.target.value)} />}</label>
          ))}
          {(item.section === "products" || item.section === "promotions" || item.section === "points") && (
            <label className="full upload-field"><span>Poster image</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadImage(event.target.files?.[0], "posterUrl")} /><small>{uploading ? "Uploading…" : item.data.posterUrl ? "Poster attached — it will display in a neat 4×4 square crop." : "PNG, JPG or WebP · displayed as a 4×4 square · maximum 5 MB"}</small></label>
          )}
          {item.section === "payments" && (
            <label className="full upload-field"><span>Payment QR image</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadImage(event.target.files?.[0])} /><small>{uploading ? "Uploading…" : item.data.qrUrl ? "QR attached — choose another file to replace it." : "PNG, JPG or WebP"}</small></label>
          )}
        </div>
        <div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving || uploading}>{saving ? "Saving…" : "Save shared item"}</button></div>
      </form>
    </div>
  );
}

function MultiNameField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const names = value.split(",").map((name) => name.trim()).filter(Boolean);
  function addName() {
    const name = draft.trim();
    if (!name) return;
    if (!names.some((existing) => existing.toLowerCase() === name.toLowerCase())) onChange([...names, name].join(", "));
    setDraft("");
  }
  function removeName(name: string) { onChange(names.filter((entry) => entry !== name).join(", ")); }
  return (
    <label className="multi-name-field">
      <span>{label} · Multiple selection</span>
      <div className="name-chips">{names.map((name) => <span key={name}>{name}<button type="button" onClick={() => removeName(name)} aria-label={`Remove ${name}`}>×</button></span>)}</div>
      <div className="name-entry"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addName(); } }} placeholder={placeholder} /><button type="button" onClick={addName}>＋ Add</button></div>
      <small>Enter a name, then press Enter. Add as many people as needed.</small>
    </label>
  );
}

async function prepareImageForUpload(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a PNG or JPEG image");
  if (file.size > 5_000_000) throw new Error("Image must be under 5 MB");
  if (file.size < 850_000) return file;

  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This image could not be prepared");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.84, 0.72, 0.6]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size < 850_000) return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  }
  throw new Error("Image is too detailed. Please use a smaller file");
}

function PriceField({ label, fieldKey, item, updateData, defaultCurrency = "RM" }: { label: string; fieldKey: string; item: RecordItem; updateData: (key: string, value: string) => void; defaultCurrency?: "RM" | "SGD" }) {
  const currencyKey = `${fieldKey}Currency`;
  const stored = item.data[fieldKey] || "";
  const inferredCurrency = stored.trim().toUpperCase().startsWith("SGD") ? "SGD" : stored.trim().toUpperCase().startsWith("RM") ? "RM" : defaultCurrency;
  const currency = (item.data[currencyKey] || inferredCurrency) as "RM" | "SGD";
  const amount = stored === "—" ? "" : stored.replace(/^(RM|SGD)\s*/i, "").trim();

  function changeCurrency(next: string) {
    updateData(currencyKey, next);
    updateData(fieldKey, amount ? `${next} ${amount}` : "");
  }

  return (
    <label className="price-field">
      <span>{label}</span>
      <div><select value={currency} onChange={(event) => changeCurrency(event.target.value)} aria-label={`${label} currency`}><option value="RM">RM</option><option value="SGD">SGD</option></select><input inputMode="decimal" value={amount} onChange={(event) => updateData(fieldKey, event.target.value ? `${currency} ${event.target.value}` : "")} placeholder="0.00" /></div>
    </label>
  );
}
