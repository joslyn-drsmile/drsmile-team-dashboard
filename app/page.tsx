"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import sheetData from "./sheet-data.json";

type Section = "products" | "promotions" | "points" | "pharmacies" | "payments" | "faq" | "calendar" | "broadcasts";
type RecordItem = {
  id: number;
  section: Section;
  title: string;
  subtitle: string;
  data: Record<string, string>;
};

type ImportableSection = Exclude<Section, "payments" | "promotions" | "calendar" | "broadcasts">;
type PermissionSet = { view: boolean; add: boolean; edit: boolean; delete: boolean };
type AccessMember = { id: string; name: string; role: string; email: string; active: boolean; isOwner: boolean; updatedAt: string; permissions: Record<Section, PermissionSet> };
type CurrentAccess = { member: AccessMember; permissions: Record<Section, PermissionSet> };

const DEFAULT_PRODUCT_CATEGORIES = ["牙粉", "完整美白疗程", "漱口水", "加购产品", "包包"];
const ALL_PRODUCTS = "All Item";
const ALL_STATES = "All";
const PHARMACY_STATE_GROUPS = [
  { label: "West Malaysia", states: ["Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Selangor", "Terengganu"] },
  { label: "East Malaysia", states: ["Sabah", "Sarawak"] },
  { label: "Federal Territories", states: ["Kuala Lumpur", "Putrajaya", "Labuan"] },
] as const;
const PHARMACY_STATES = PHARMACY_STATE_GROUPS.flatMap((group) => [...group.states]);
const ADMIN_TEAM = [
  { name: "Oscar", role: "Boss" },
  { name: "Elaine", role: "Boss" },
  { name: "Wen Yi", role: "Marketer" },
  { name: "Joey", role: "Marketer" },
  { name: "Zi Hui", role: "Marketer" },
  { name: "Jae Wye", role: "Marketer" },
  { name: "Joslyn", role: "CS" },
  { name: "Shina", role: "CS & Admin" },
  { name: "Corrine", role: "After Sales" },
];

const SOURCE_SHEET_URL = "https://docs.google.com/spreadsheets/d/18DC7Df9OCFtrbj5FmZUVcLTwC0hg_2lYnNDFjrpMSaU/edit?gid=1909559648#gid=1909559648";

const menus: { id: "home" | Section; label: string; short: string }[] = [
  { id: "home", label: "Overview", short: "OV" },
  { id: "calendar", label: "Calendar", short: "CL" },
  { id: "broadcasts", label: "Broadcast Schedule", short: "BC" },
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

const PRODUCT_IMAGE_BY_TITLE: Record<string, string> = {
  "美白牙粉 + Free 1 x 牙刷": "/product-images/toothpowder.jpg",
  "2 美白牙粉 + Free 2 x 牙刷": "/product-images/toothpowder.jpg",
  "3 美白牙粉 + Free 3 x 牙刷": "/product-images/toothpowder.jpg",
  "4 美白牙粉 + Free 4 x 牙刷": "/product-images/toothpowder.jpg",
  "美白牙粉": "/product-images/toothpowder.jpg",
  "First Trial": "/product-images/first-trial.jpeg",
  "完整美白疗程": "/product-images/complete-treatment.jpg",
  "𝐏𝐀𝐏⁺ 焕白牙贴": "/product-images/whitening-strips.jpg",
  "美白精华": "/product-images/whitening-essence.jpg",
  "Dr Smile 软毛牙刷": "/product-images/toothbrush.jpg",
  "蜂胶茶树油漱口水": "/product-images/mouthwash.jpg",
  "西柚漱口水": "/product-images/mouthwash.jpg",
  "葡萄漱口水": "/product-images/mouthwash.jpg",
  "4盒牙线棒": "/product-images/toothbrush-bundle.jpg",
  "防水洗漱包": "/product-images/cosmic-bag.jpg",
  "2瓶杀菌漱口水": "/product-images/mouthwash-bundle.jpg",
  "高订香薰": "/product-images/cosmic-bag.jpg",
  "化妆包": "/product-images/cosmic-bag.jpg",
  "Drsmile tote bag": "/product-images/tote-bag.jpg",
  "Mug": "/product-images/mug.png",
  "漱口水礼盒 1 Set": "/product-images/mouthwash-bundle.jpg",
  "漱口水礼盒 2 Set": "/product-images/mouthwash-bundle.jpg",
  "漱口水礼盒 3 Set": "/product-images/mouthwash-bundle.jpg",
};

const blankBySection: Record<Section, RecordItem> = {
  products: { id: 0, section: "products", title: "", subtitle: "", data: { sku: "", category: "", remark: "", posterUrl: "", alacart: "", alacartSG: "", pharmacy: "", shopee: "", website: "", websitePwp: "", facebook: "", facebookPwp: "", status: "Active" } },
  promotions: { id: 0, section: "promotions", title: "", subtitle: "", data: { promotionName: "", month: new Date().toISOString().slice(0, 7), posterUrl: "", onlinePrice: "", shopeePrice: "", packageDetails: "", status: "Active" } },
  points: { id: 0, section: "points", title: "", subtitle: "", data: { points: "", value: "", terms: "", posterUrl: "", status: "Active" } },
  pharmacies: { id: 0, section: "pharmacies", title: "", subtitle: "", data: { phone: "", address: "", city: "", regionState: "" } },
  payments: { id: 0, section: "payments", title: "", subtitle: "", data: { details: "", link: "", qrUrl: "", portal: "", status: "Available" } },
  faq: { id: 0, section: "faq", title: "", subtitle: "", data: { answer: "", category: "", source: "Google Sheet" } },
  calendar: { id: 0, section: "calendar", title: "", subtitle: "", data: { date: localDateKey(new Date()), endDate: localDateKey(new Date()), time: "", location: "", pic: "", attendees: "", details: "", status: "Scheduled" } },
  broadcasts: { id: 0, section: "broadcasts", title: "", subtitle: "Broadcast", data: { date: localDateKey(new Date()), time: "", channel: "", description: "", pic: "" } },
};

const pageCopy: Record<Section, { eyebrow: string; title: string; description: string }> = {
  products: { eyebrow: "Commercial catalogue", title: "Products & pricing", description: "Ala carte, PWP and monthly promotion pricing across every sales channel." },
  promotions: { eyebrow: "Monthly campaign library", title: "Promotion", description: "Keep every month’s poster, package details, online price and Shopee price together." },
  points: { eyebrow: "Customer loyalty", title: "Point redeem", description: "Keep redemption rewards, point values and terms easy for the whole team to reference." },
  pharmacies: { eyebrow: "Retail network", title: "Pharmacy list", description: "Search every stockist and copy phone numbers or full addresses in one click." },
  payments: { eyebrow: "Order collection", title: "Payment methods", description: "Keep QR codes, payment instructions and gateway links ready for every order." },
  faq: { eyebrow: "Team knowledge", title: "Frequently asked questions", description: "A shared answer bank for fast, consistent customer replies." },
  calendar: { eyebrow: "Team schedule", title: "Calendar", description: "Plan every DrSmile event by date, activity and location for the whole admin team." },
  broadcasts: { eyebrow: "Monthly content schedule", title: "Broadcast Schedule", description: "Plan every Facebook and WhatsApp broadcast in one clear monthly view." },
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

function eventEndDate(event: RecordItem) {
  return event.data.endDate || event.data.date;
}

function eventSpansDate(event: RecordItem, date: string) {
  return !!event.data.date && event.data.date <= date && eventEndDate(event) >= date;
}

function formatEventTime(value = "") {
  if (!value) return "";
  const [hourValue, minute = "00"] = value.split(":");
  const hour = Number(hourValue);
  if (Number.isNaN(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function eventDateLabel(event: RecordItem) {
  const start = event.data.date;
  const end = eventEndDate(event);
  if (!start) return "Date not added";
  const format = (value: string) => dateFromKey(value).toLocaleDateString("en-MY", { day: "2-digit", month: "short" });
  return end && end !== start ? `${format(start)} → ${format(end)}` : format(start);
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

function inferStateFromText(value = "") {
  const text = value.toLowerCase();
  const matches: [RegExp, string][] = [
    [/kuala lumpur|wilayah persekutuan kuala lumpur/, "Kuala Lumpur"],
    [/putrajaya/, "Putrajaya"],
    [/labuan/, "Labuan"],
    [/negeri sembilan|seremban/, "Negeri Sembilan"],
    [/pulau pinang|penang|tanjung tokong|juru|simpang ampat|kepala batas|butterworth|bukit mertajam/, "Penang"],
    [/sarawak|miri|kuching|bintulu|sibu/, "Sarawak"],
    [/sabah|kota kinabalu/, "Sabah"],
    [/johor|skudai|iskandar puteri|gelang patah|kulai|segamat|batu pahat|kluang/, "Johor"],
    [/selangor|sungai buloh|batu caves|klang|ampang|cheras|setia alam|shah alam/, "Selangor"],
    [/melaka|malacca/, "Melaka"],
    [/perak|ipoh|taiping/, "Perak"],
    [/pahang|kuantan/, "Pahang"],
    [/kedah|alor setar/, "Kedah"],
    [/kelantan|kota bharu/, "Kelantan"],
    [/perlis|kangar/, "Perlis"],
    [/terengganu|kuala terengganu/, "Terengganu"],
  ];
  return matches.find(([pattern]) => pattern.test(text))?.[1] || "";
}

function pharmacyState(item: RecordItem) {
  return item.data.regionState
    || inferStateFromText(`${item.data.address || ""} ${item.data.city || ""} ${item.data.state || ""} ${item.subtitle || ""}`)
    || "Unspecified";
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
      data: { address: row[2], postcode: row[3], phone: row[4], city: row[0], regionState: inferStateFromText(`${row[2]} ${row[0]}`) },
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
  const [active, setActive] = useState<"home" | Section | "settings">("home");
  const [access, setAccess] = useState<CurrentAccess | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);
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
  const [broadcastMonth, setBroadcastMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [broadcastChannel, setBroadcastChannel] = useState("All");

  useEffect(() => {
    fetch("/api/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("No access");
        const payload = await response.json();
        setAccess({ member: { ...payload.member, permissions: payload.permissions }, permissions: payload.permissions });
        const [recordsResponse, categoriesResponse] = await Promise.all([fetch("/api/records"), fetch("/api/categories")]);
        if (recordsResponse.ok) {
          const recordsPayload = await recordsResponse.json();
          setRecords(recordsPayload.records || []);
        }
        if (categoriesResponse.ok) {
          const categoriesPayload = await categoriesResponse.json();
          if (Array.isArray(categoriesPayload.categories)) setProductCategories(categoriesPayload.categories);
        }
      })
      .catch(() => setAccess(null))
      .finally(() => setAccessLoaded(true));
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
      if (active === "pharmacies" && selectedState !== ALL_STATES && pharmacyState(record) !== selectedState) return false;
      if (active === "broadcasts" && broadcastChannel !== "All" && !record.data.channel?.split(",").map((value) => value.trim()).includes(broadcastChannel)) return false;
      return true;
    });
    if (!needle) return inSection;
    return inSection.filter((record) =>
      `${record.title} ${record.subtitle} ${Object.values(record.data).join(" ")}`.toLowerCase().includes(needle),
    );
  }, [active, query, records, promotionMonth, selectedCategory, selectedState, broadcastChannel]);

  function allowed(section: Section, action: keyof PermissionSet) {
    return !!access?.permissions[section]?.[action];
  }

  function navigate(next: "home" | Section | "settings") {
    if (next === "settings" && !access?.member.isOwner) return;
    if (next !== "home" && next !== "settings" && !allowed(next, "view")) return;
    setActive(next);
    setQuery("");
    if (next === "products") setSelectedCategory(ALL_PRODUCTS);
    if (next === "pharmacies") setSelectedState(ALL_STATES);
    setMobileMenu(false);
  }

  function startAdd() {
    if (active === "home" || active === "settings" || !allowed(active, "add")) return;
    const next = structuredClone(blankBySection[active]);
    if (active === "products") next.data.category = selectedCategory === ALL_PRODUCTS ? "" : selectedCategory;
    if (active === "promotions") {
      next.data.month = promotionMonth;
      next.data.promotionName = promotionTitle;
    }
    setEditing(next);
  }

  function startCalendarEvent(date: string) {
    if (!allowed("calendar", "add")) return;
    const next = structuredClone(blankBySection.calendar);
    next.data.date = date;
    next.data.endDate = date;
    setEditing(next);
  }

  function startBroadcast(date = localDateKey(new Date(broadcastMonth.getFullYear(), broadcastMonth.getMonth(), 1))) {
    if (!allowed("broadcasts", "add")) return;
    const next = structuredClone(blankBySection.broadcasts);
    next.data.date = date;
    setEditing(next);
  }

  async function savePromotionTitle() {
    if (!allowed("promotions", "edit")) return;
    const campaignItems = records.filter((record) => record.section === "promotions" && record.data.month === promotionMonth);
    if (!campaignItems.length) {
      setToast("Add a promotion item first");
      return;
    }
    const updated = campaignItems.map((record) => ({ ...record, data: { ...record.data, promotionName: promotionTitle.trim() } }));
    const previous = records;
    setRecords((current) => current.map((record) => updated.find((item) => item.id === record.id) || record));
    const responses = await Promise.all(updated.map((record) => fetch("/api/records", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(record) })));
    if (responses.some((response) => !response.ok)) {
      setRecords(previous);
      setToast("Promotion name could not be saved");
      return;
    }
    setToast("Promotion name saved");
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    if (!allowed(editing.section, editing.id ? "edit" : "add")) return;
    if (editing.section === "broadcasts" && (!editing.data.date || !editing.data.time || !editing.data.channel || !editing.data.description?.trim() || !editing.data.pic)) {
      setToast("Complete date, time, channel, description and PIC");
      return;
    }
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
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Shared changes could not be saved");
      }
      const payload = await response.json();
      setRecords((current) =>
        editing.id
          ? current.map((record) => (record.id === editing.id ? payload.record : record))
          : current.map((record) => (record.id === optimistic[optimistic.length - 1].id ? payload.record : record)),
      );
      setToast(payload.sync && !payload.sync.synced ? "Broadcast saved · Sheet sync pending" : "Shared changes saved");
    } catch (error) {
      setRecords(records);
      setToast(error instanceof Error ? error.message : "Shared changes could not be saved");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item: RecordItem) {
    if (!allowed(item.section, "delete")) return;
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    const previous = records;
    setRecords((current) => current.filter((record) => record.id !== item.id));
    const response = await fetch(`/api/records?id=${item.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setRecords(previous);
      setToast("Item could not be deleted");
      return;
    }
    const payload = await response.json().catch(() => ({}));
    setToast(payload.sync && !payload.sync.synced ? "Broadcast deleted · Sheet sync pending" : "Item deleted");
  }

  async function addProductCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowed("products", "add")) return;
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
    if (!allowed("products", "delete")) return;
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

  if (!accessLoaded) return <div className="access-screen"><div className="access-card"><span>DS</span><h1>Loading your workspace…</h1></div></div>;
  if (!access) return <div className="access-screen"><div className="access-card"><span>DS</span><p className="eyebrow">DrSmile Team Dashboard</p><h1>No access</h1><p>Your signed-in email is not active in the Admin member list. Please ask Joslyn to add your email in Settings.</p></div></div>;

  const visibleMenus = menus.filter((menu) => menu.id === "home" || allowed(menu.id, "view"));
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}>
        <button className="brand" onClick={() => navigate("home")} aria-label="DrSmile dashboard home">
          <img src={`${import.meta.env.BASE_URL || "/"}drsmile-logo.png`} alt="DrSmile Whitening" />
        </button>
        <div className="workspace-pill">
          <span>DS</span>
          <div><strong>DrSmile Team</strong><small>Shared workspace</small></div>
        </div>
        <nav aria-label="Dashboard menu">
          <p className="nav-label">Workspace</p>
          {visibleMenus.map((menu) => (
            <button key={menu.id} className={active === menu.id ? "active" : ""} onClick={() => navigate(menu.id)}>
              <span className="nav-icon">{menu.short}</span>
              <span>{menu.label}</span>
              {menu.id !== "home" && <em>{records.filter((record) => record.section === menu.id).length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {access.member.isOwner && <button className={active === "settings" ? "settings-link active" : "settings-link"} onClick={() => navigate("settings")}><span>⚙</span> Settings</button>}
          <a href="https://drsmile.my/" target="_blank" rel="noreferrer"><span>↗</span> View DrSmile website</a>
          <p><span className="status-dot" />Team data synced</p>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMobileMenu((value) => !value)} aria-label="Toggle menu">☰</button>
          <label className="search">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${active === "home" ? "the workspace" : active === "settings" ? "settings" : pageCopy[active].title.toLowerCase()}…`} />
            <kbd>⌘ K</kbd>
          </label>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">◎</button>
            <div className="avatar">DS</div>
            <div className="profile"><strong>{access.member.name}</strong><small>{access.member.role || "Team member"}</small></div>
          </div>
        </header>

        {active === "home" ? (
          <Overview records={records} navigate={navigate} setToast={setToast} permissions={access.permissions} />
        ) : active === "settings" ? (
          <SettingsPage currentEmail={access.member.email} setToast={setToast} />
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
                    {allowed("promotions", "edit") && <button type="button" onClick={savePromotionTitle}>Save</button>}
                  </label>
                )}
                <p>{pageCopy[active].description}</p>
              </div>
              <div className="heading-actions">
                {active === "promotions" && <label className="month-filter"><span>Track by month</span><input type="month" value={promotionMonth} onChange={(event) => setPromotionMonth(event.target.value)} /></label>}
                {active !== "payments" && active !== "promotions" && active !== "calendar" && active !== "broadcasts" && <a className="secondary-button" href={SOURCE_SHEET_URL} target="_blank" rel="noreferrer">Open Sheet ↗</a>}
                {active !== "payments" && active !== "promotions" && active !== "calendar" && active !== "broadcasts" && allowed(active, "add") && allowed(active, "edit") && allowed(active, "delete") && <button className="secondary-button import-button" onClick={() => setImporting(active as ImportableSection)}>⇧ Import data</button>}
                {allowed(active, "add") && <button className="primary-button" onClick={active === "broadcasts" ? () => startBroadcast() : startAdd}>＋ {active === "calendar" ? "Add event" : active === "broadcasts" ? "Add broadcast" : "Add item"}</button>}
              </div>
            </div>

            {active !== "payments" && active !== "promotions" && active !== "calendar" && active !== "broadcasts" && (
              <div className="sheet-note">
                <span className="sheet-mark">GS</span>
                <div><strong>Imported from DrSmile Dashboard</strong><small>Copy rows from the matching Google Sheet tab and use Import data anytime.</small></div>
                <span>{records.filter((record) => record.section === active).length} records</span>
              </div>
            )}

            {active === "payments" && <PaymentStudio setToast={setToast} canManage={allowed("payments", "add")} />}

            {active === "calendar" ? (
              <CalendarWorkspace
                events={records.filter((record) => record.section === "calendar")}
                month={calendarMonth}
                setMonth={setCalendarMonth}
                onAddDate={startCalendarEvent}
                setEditing={setEditing}
                removeItem={removeItem}
                canAdd={allowed("calendar", "add")}
                canEdit={allowed("calendar", "edit")}
                canDelete={allowed("calendar", "delete")}
              />
            ) : active === "broadcasts" ? (
              <BroadcastWorkspace
                broadcasts={visible.filter((record) => record.section === "broadcasts")}
                month={broadcastMonth}
                setMonth={setBroadcastMonth}
                channel={broadcastChannel}
                setChannel={setBroadcastChannel}
                onAddDate={startBroadcast}
                setEditing={setEditing}
                removeItem={removeItem}
                setToast={setToast}
                canAdd={allowed("broadcasts", "add")}
                canEdit={allowed("broadcasts", "edit")}
                canDelete={allowed("broadcasts", "delete")}
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
                        {allowed("products", "delete") && <button className="category-delete" onClick={() => deleteProductCategory(category)} aria-label={`Delete ${category}`}>×</button>}
                      </div>
                    ))}
                  </div>
                  {allowed("products", "add") && <form className="category-add" onSubmit={addProductCategory}>
                    <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Add category" aria-label="New category name" maxLength={40} />
                    <button type="submit" aria-label="Add category">＋</button>
                  </form>}
                </aside>
              )}
              {active === "pharmacies" && (
                <aside className="category-panel" aria-label="Pharmacy states">
                  <div className="category-heading"><span>Filter by State</span><small>{PHARMACY_STATES.length}</small></div>
                  <button className={selectedState === ALL_STATES ? "category-filter active" : "category-filter"} onClick={() => setSelectedState(ALL_STATES)}>
                    <span>All</span><em>{records.filter((record) => record.section === "pharmacies").length}</em>
                  </button>
                  <div className="category-list pharmacy-state-list">
                    {PHARMACY_STATE_GROUPS.map((group) => (
                      <div className="state-group" key={group.label}>
                        <p className="state-group-title">{group.label}</p>
                        {group.states.map((state) => (
                          <button className={selectedState === state ? "category-filter active" : "category-filter"} key={state} onClick={() => setSelectedState(state)}>
                            <span>{state}</span><em>{records.filter((record) => record.section === "pharmacies" && pharmacyState(record) === state).length}</em>
                          </button>
                        ))}
                      </div>
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
                    <RecordCard key={item.id} item={item} setEditing={setEditing} removeItem={removeItem} setToast={setToast} canEdit={allowed(item.section, "edit")} canDelete={allowed(item.section, "delete")} />
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

function Overview({ records, navigate, setToast, permissions }: { records: RecordItem[]; navigate: (next: "home" | Section) => void; setToast: (value: string) => void; permissions: Record<Section, PermissionSet> }) {
  const schedule = records
    .filter((item) => (item.section === "calendar" && permissions.calendar.view) || (item.section === "broadcasts" && permissions.broadcasts.view))
    .sort((left, right) => `${left.data.date || "9999"}${left.data.time || ""}`.localeCompare(`${right.data.date || "9999"}${right.data.time || ""}`));
  return (
    <section className="page overview">
      <div className="welcome overview-hero">
        <div className="hero-message">
          <p className="eyebrow">DrSmile Team Workspace</p>
          <h1>This is where we<br /><span>grow together.</span></h1>
          <p>One team. One journey. One DrSmile.</p>
        </div>
        <OverviewCalendar events={schedule} onOpen={() => navigate("calendar")} />
      </div>
      <ScheduleList items={schedule} navigate={navigate} setToast={setToast} />
    </section>
  );
}

function ScheduleList({ items, navigate, setToast }: { items: RecordItem[]; navigate: (next: Section) => void; setToast: (value: string) => void }) {
  return <section className="panel combined-schedule">
    <div className="schedule-heading"><div><p className="eyebrow">All events & broadcasts</p><h2>Schedule</h2></div><span>{items.length} scheduled</span></div>
    <div className="schedule-table">
      <div className="schedule-row schedule-labels"><span>Date</span><span>Type</span><span>Schedule details</span><span>PIC</span><span /></div>
      {items.map((item) => {
        const broadcast = item.section === "broadcasts";
        return <article className="schedule-row" key={`${item.section}-${item.id}`}>
          <time><strong>{eventDateLabel(item)}</strong><small>{formatEventTime(item.data.time) || "All day"}</small></time>
          <span className={`schedule-type ${broadcast ? "broadcast" : "event"}`}>{broadcast ? "Broadcast" : "Event"}</span>
          <div className="schedule-details"><strong>{item.title}</strong><p>{broadcast ? item.data.description : [item.data.location, item.data.details].filter(Boolean).join(" · ") || "No details added"}</p>{broadcast && <div className="broadcast-channel-tags">{item.data.channel?.split(",").map((name) => name.trim()).filter(Boolean).map((name) => <span className={name === "Facebook" ? "facebook" : "whatsapp"} key={name}>{name === "Facebook" ? "FB" : "WA"}</span>)}</div>}</div>
          <span className="schedule-pic">{item.data.pic || "—"}</span>
          <div className="schedule-row-actions">{broadcast && <button onClick={() => copyText(item.data.description, "Broadcast description", setToast)}>Copy</button>}<button onClick={() => navigate(item.section)}>Open ›</button></div>
        </article>;
      })}
      {!items.length && <div className="schedule-empty">No events or broadcasts have been scheduled yet.</div>}
    </div>
  </section>;
}

function MonthGrid({ month, events, onDayClick, onEventClick, compact = false }: { month: Date; events: RecordItem[]; onDayClick?: (date: string) => void; onEventClick?: (event: RecordItem) => void; compact?: boolean }) {
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
        const dayEvents = events.filter((event) => eventSpansDate(event, date));
        return (
          <button type="button" className={`${date === today ? "today " : ""}${dayEvents.length ? "has-events" : ""}`} key={date} onClick={() => onDayClick?.(date)} aria-label={`${date}${dayEvents.length ? `, ${dayEvents.length} events` : ""}`}>
            <strong>{day}</strong>
            {!!dayEvents.length && (compact
              ? <span className="event-dots">{dayEvents.slice(0, 3).map((event) => <i key={event.id} />)}</span>
              : <span className="calendar-events">{dayEvents.slice(0, 3).map((event, eventIndex) => <span className={`calendar-event-pill tone-${eventIndex % 3}`} key={event.id} role={onEventClick ? "button" : undefined} tabIndex={onEventClick ? 0 : undefined} onClick={(click) => { if (!onEventClick) return; click.stopPropagation(); onEventClick(event); }} onKeyDown={(key) => { if (onEventClick && (key.key === "Enter" || key.key === " ")) { key.preventDefault(); key.stopPropagation(); onEventClick(event); } }}><b>{event.title}</b>{event.data.time && <small>{event.section === "broadcasts" ? `${event.data.channel?.replace("Facebook", "FB").replace("WhatsApp", "WA")} · ` : ""}{formatEventTime(event.data.time)}</small>}</span>)}{dayEvents.length > 3 && <em>+{dayEvents.length - 3} more</em>}</span>
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
  return (
    <section className="hero-calendar" aria-label="This month calendar">
      <div className="hero-calendar-heading"><div><p>Calendar</p><strong>{monthLabel(currentMonth)}</strong></div><button onClick={onOpen}>Open ›</button></div>
      <MonthGrid month={currentMonth} events={events} compact />
      <p className="hero-today">Today · {new Intl.DateTimeFormat("en-MY", { weekday: "long", day: "numeric", month: "long" }).format(today)}</p>
    </section>
  );
}

function CalendarWorkspace({ events, month, setMonth, onAddDate, setEditing, removeItem, canAdd, canEdit, canDelete }: { events: RecordItem[]; month: Date; setMonth: React.Dispatch<React.SetStateAction<Date>>; onAddDate: (date: string) => void; setEditing: (item: RecordItem) => void; removeItem: (item: RecordItem) => void; canAdd: boolean; canEdit: boolean; canDelete: boolean }) {
  const monthStart = localDateKey(new Date(month.getFullYear(), month.getMonth(), 1));
  const monthEnd = localDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const monthEvents = events.filter((event) => event.data.date <= monthEnd && eventEndDate(event) >= monthStart).sort((left, right) => `${left.data.date}${left.data.time}`.localeCompare(`${right.data.date}${right.data.time}`));
  const today = new Date();
  function changeMonth(offset: number) { setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1)); }
  return (
    <div className="calendar-workspace">
      <section className="panel calendar-board">
        <div className="calendar-board-header">
          <div><p className="eyebrow">Click a date to add an event</p><h2>{monthLabel(month)}</h2></div>
          <div><button onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button><button onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button><button onClick={() => changeMonth(1)} aria-label="Next month">›</button></div>
        </div>
        <MonthGrid month={month} events={monthEvents} onDayClick={canAdd ? onAddDate : undefined} />
      </section>
      <aside className="panel calendar-agenda">
        <div className="panel-heading"><div><p className="eyebrow">Monthly agenda</p><h2>{monthEvents.length} {monthEvents.length === 1 ? "event" : "events"}</h2></div></div>
        <div className="agenda-list">
          {monthEvents.map((event) => (
            <article key={event.id}>
              <time><strong>{dateFromKey(event.data.date).getDate()}</strong><span>{dateFromKey(event.data.date).toLocaleDateString("en-MY", { month: "short" })}</span></time>
              <div><h3>{event.title}</h3><p>{eventDateLabel(event)} · {formatEventTime(event.data.time) || "All day"}</p><p>{event.data.location || "Location not added"}</p>{event.data.pic && <span className="agenda-people">PIC · {event.data.pic}</span>}{event.data.attendees && <span className="agenda-people">Attend · {event.data.attendees}</span>}{event.data.details && <small>{event.data.details}</small>}</div>
              {(canEdit || canDelete) && <div className="agenda-actions">{canEdit && <button onClick={() => setEditing(structuredClone(event))}>Edit</button>}{canDelete && <button className="delete" onClick={() => removeItem(event)}>Delete</button>}</div>}
            </article>
          ))}
          {!monthEvents.length && <div className="no-events"><span>＋</span><p>No events planned for {monthLabel(month)}.</p>{canAdd && <button onClick={() => onAddDate(localDateKey(new Date(month.getFullYear(), month.getMonth(), 1)))}>Add event</button>}</div>}
        </div>
      </aside>
    </div>
  );
}

function BroadcastWorkspace({ broadcasts, month, setMonth, channel, setChannel, onAddDate, setEditing, removeItem, setToast, canAdd, canEdit, canDelete }: { broadcasts: RecordItem[]; month: Date; setMonth: React.Dispatch<React.SetStateAction<Date>>; channel: string; setChannel: (value: string) => void; onAddDate: (date?: string) => void; setEditing: (item: RecordItem) => void; removeItem: (item: RecordItem) => void; setToast: (value: string) => void; canAdd: boolean; canEdit: boolean; canDelete: boolean }) {
  const monthKey = localDateKey(month).slice(0, 7);
  const monthBroadcasts = broadcasts
    .filter((item) => item.data.date?.startsWith(monthKey))
    .sort((left, right) => `${left.data.date}${left.data.time}`.localeCompare(`${right.data.date}${right.data.time}`));
  const today = new Date();
  function changeMonth(offset: number) { setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1)); }
  function channelNames(item: RecordItem) { return item.data.channel?.split(",").map((value) => value.trim()).filter(Boolean) || []; }
  return (
    <section className="broadcast-sheet-wrap">
      <div className="broadcast-filters" aria-label="Broadcast channel filter">
        <span>Channel</span>
        {["All", "Facebook", "WhatsApp"].map((value) => <button type="button" key={value} className={channel === value ? "active" : ""} onClick={() => setChannel(value)}>{value === "WhatsApp" ? "WA" : value}</button>)}
      </div>
      <div className="panel broadcast-sheet">
        <div className="broadcast-sheet-header"><div><p className="eyebrow">Monthly broadcast list</p><h2>{monthLabel(month)}</h2></div><div><button onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button><button onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button><button onClick={() => changeMonth(1)} aria-label="Next month">›</button></div></div>
        <div className="broadcast-table">
          <div className="broadcast-row broadcast-labels"><span>Date</span><span>Channel</span><span>Description</span><span>PIC</span><span /></div>
          {monthBroadcasts.map((item) => <article className="broadcast-row" key={item.id}>
            <time><strong>{eventDateLabel(item)}</strong><small>{formatEventTime(item.data.time)}</small></time>
            <div className="broadcast-channel-tags">{channelNames(item).map((name) => <span className={name === "Facebook" ? "facebook" : "whatsapp"} key={name}>{name === "Facebook" ? "FB" : "WA"}</span>)}</div>
            <div className="broadcast-copy"><strong>{item.title}</strong><p>{item.data.description}</p></div>
            <span className="broadcast-pic">{item.data.pic || "—"}</span>
            <div className="broadcast-row-actions"><button onClick={() => copyText(item.data.description, "Broadcast description", setToast)}>Copy</button>{canEdit && <button onClick={() => setEditing(structuredClone(item))}>Edit</button>}{canDelete && <button className="delete" onClick={() => removeItem(item)}>Delete</button>}</div>
          </article>)}
          {!monthBroadcasts.length && <div className="schedule-empty">No broadcasts planned for {monthLabel(month)}.{canAdd && <button onClick={() => onAddDate(localDateKey(new Date(month.getFullYear(), month.getMonth(), 1)))}>Add broadcast</button>}</div>}
        </div>
      </div>
    </section>
  );
}

const permissionMenus = menus.filter((menu): menu is { id: Section; label: string; short: string } => menu.id !== "home");

function SettingsPage({ currentEmail, setToast }: { currentEmail: string; setToast: (value: string) => void }) {
  const [members, setMembers] = useState<AccessMember[]>([]);
  const [sync, setSync] = useState({ status: "loading", message: "Checking Google Sheet sync", lastSync: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/access").then(async (response) => {
      if (!response.ok) throw new Error("Settings unavailable");
      return response.json();
    }).then((payload) => { setMembers(payload.members); setSync(payload.sync); }).catch(() => setToast("Settings could not be loaded"));
  }, [setToast]);

  function updateMember(id: string, changes: Partial<AccessMember>) {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, ...changes } : member));
  }

  function updatePermission(memberId: string, menu: Section, action: keyof PermissionSet, checked: boolean) {
    setMembers((current) => current.map((member) => {
      if (member.id !== memberId || member.isOwner) return member;
      const nextPermission = { ...member.permissions[menu], [action]: checked };
      if (action === "view" && !checked) Object.assign(nextPermission, { add: false, edit: false, delete: false });
      if (action !== "view" && checked) nextPermission.view = true;
      return { ...member, permissions: { ...member.permissions, [menu]: nextPermission } };
    }));
  }

  function setAll(memberId: string, menu: Section, checked: boolean) {
    setMembers((current) => current.map((member) => member.id === memberId && !member.isOwner
      ? { ...member, permissions: { ...member.permissions, [menu]: { view: checked, add: checked, edit: checked, delete: checked } } }
      : member));
  }

  function addMember() {
    const id = `member-${crypto.randomUUID()}`;
    const permissions = Object.fromEntries(permissionMenus.map((menu) => [menu.id, { view: true, add: false, edit: false, delete: false }])) as Record<Section, PermissionSet>;
    setMembers((current) => [...current, { id, name: "New member", role: "", email: "", active: true, isOwner: false, updatedAt: new Date().toISOString(), permissions }]);
  }

  async function syncNow() {
    const response = await fetch("/api/access/sync", { method: "POST" });
    const payload = await response.json();
    setSync({ status: payload.status, message: payload.message, lastSync: new Date().toISOString() });
    setToast(payload.synced ? "Google Sheet synced" : "Saved — Google Sheet sync pending");
  }

  async function saveSettings() {
    setBusy(true);
    try {
      const response = await fetch("/api/access", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ members }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Settings could not be saved");
      setMembers(payload.members);
      setSync(payload.sync);
      setToast("Access settings saved");
      await syncNow();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Settings could not be saved");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page settings-page">
      <div className="page-heading settings-heading">
        <div><p className="eyebrow">Owner controls</p><h1>Settings</h1><p>Choose exactly which menus each team member can view or manage.</p></div>
        <div className="heading-actions"><button className="secondary-button" onClick={addMember}>＋ Add member</button><button className="primary-button" disabled={busy} onClick={saveSettings}>{busy ? "Saving…" : "Save access"}</button></div>
      </div>
      <div className={`sync-banner ${sync.status}`}><span>{sync.status === "synced" ? "✓" : "↻"}</span><div><strong>{sync.status === "synced" ? "Google Sheet synced" : "Sync pending"}</strong><small>{sync.message}</small></div><button onClick={syncNow}>Sync now</button></div>
      <div className="settings-members">
        {members.map((member) => (
          <article className="member-access-card" key={member.id}>
            <header>
              <div className="member-badge">{member.name.slice(0, 2).toUpperCase()}</div>
              <div><strong>{member.name}</strong><small>{member.isOwner ? "Main account · Full control" : member.email ? "Active team access" : "Add login email to enable access"}</small></div>
              <label className="active-toggle"><input type="checkbox" checked={member.active} disabled={member.isOwner} onChange={(event) => updateMember(member.id, { active: event.target.checked })} /><span>Active</span></label>
            </header>
            <div className="member-fields">
              <label><span>Name</span><input value={member.name} disabled={member.id === "admin-joslyn"} onChange={(event) => updateMember(member.id, { name: event.target.value })} /></label>
              <label><span>Role</span><input value={member.role} disabled={member.id === "admin-joslyn"} onChange={(event) => updateMember(member.id, { role: event.target.value })} /></label>
              <label className="email-field"><span>Login email</span><input type="email" value={member.email} disabled={member.id === "admin-joslyn"} placeholder="name@company.com" onChange={(event) => updateMember(member.id, { email: event.target.value })} /></label>
            </div>
            <div className="permission-table-wrap">
              <table className="permission-table"><thead><tr><th>Menu</th><th>View</th><th>Add</th><th>Edit</th><th>Delete</th><th>All Access</th></tr></thead><tbody>
                {permissionMenus.map((menu) => {
                  const permission = member.permissions[menu.id];
                  const all = Object.values(permission).every(Boolean);
                  return <tr key={menu.id}><th><span>{menu.short}</span>{menu.label}</th>{(["view", "add", "edit", "delete"] as const).map((action) => <td key={action}><input aria-label={`${member.name} ${menu.label} ${action}`} type="checkbox" checked={permission[action]} disabled={member.isOwner || !member.email} onChange={(event) => updatePermission(member.id, menu.id, action, event.target.checked)} /></td>)}<td><input aria-label={`${member.name} ${menu.label} all access`} type="checkbox" checked={all} disabled={member.isOwner || !member.email} onChange={(event) => setAll(member.id, menu.id, event.target.checked)} /></td></tr>;
                })}
              </tbody></table>
            </div>
          </article>
        ))}
      </div>
      <p className="settings-footnote">Signed in as {currentEmail}. Joslyn is the fixed Main Account with full control. Overview is always available to active members.</p>
    </section>
  );
}

function RecordCard({ item, setEditing, removeItem, setToast, canEdit, canDelete }: { item: RecordItem; setEditing: (item: RecordItem) => void; removeItem: (item: RecordItem) => void; setToast: (value: string) => void; canEdit: boolean; canDelete: boolean }) {
  if (item.section === "products") {
    const posterUrl = item.data.posterUrl || PRODUCT_IMAGE_BY_TITLE[item.title];
    return (
      <article className="record-card product-card">
        {posterUrl ? <div className="product-poster-frame"><img className="product-poster" src={posterUrl} alt={`${item.title} poster`} /></div> : <div className="product-poster-frame"><div className="poster-placeholder">PRODUCT</div></div>}
        <div className="card-top"><span className="record-avatar">DS</span><div><h3>{item.title}</h3><p>{item.data.sku || item.subtitle}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} canEdit={canEdit} canDelete={canDelete} /></div>
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
        <div className="card-top"><span className="record-avatar">PM</span><div><h3>{item.title}</h3><p>{item.subtitle ? `SKU · ${item.subtitle}` : "SKU not added"}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} canEdit={canEdit} canDelete={canDelete} /></div>
        <div className="promotion-prices"><div><span>Online price</span><strong>{item.data.onlinePrice || "—"}</strong></div><div><span>Shopee price</span><strong>{item.data.shopeePrice || "—"}</strong></div></div>
        <div className="package-details"><span>Package details</span><p>{item.data.packageDetails || "No package details added yet."}</p></div>
        <div className="card-footer"><span className="status-chip">{item.data.status || "Active"}</span><button onClick={() => copyText(`${item.data.promotionName || "Promotion"}\n${item.title}\nSKU: ${item.subtitle || "—"}\nOnline: ${item.data.onlinePrice}\nShopee: ${item.data.shopeePrice}\n${item.data.packageDetails}`, "Promotion", setToast)}>Copy details</button></div>
      </article>
    );
  }
  if (item.section === "pharmacies") {
    const state = pharmacyState(item);
    const location = item.subtitle || item.data.city || "";
    return (
      <article className="record-card pharmacy-card">
        <div className="card-top"><span className="record-avatar">＋</span><div><h3>{item.title}</h3><p>{location && location !== state ? `${location} · ${state}` : state}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} canEdit={canEdit} canDelete={canDelete} /></div>
        <div className="contact-row"><span>Phone</span><strong>{item.data.phone || "—"}</strong><button onClick={() => copyText(item.data.phone, "Phone number", setToast)}>Copy</button></div>
        <div className="address-block"><span>Full address {item.data.postcode ? `· ${item.data.postcode}` : ""}</span><p>{item.data.address || "—"}</p><button onClick={() => copyText(item.data.address, "Address", setToast)}>Copy full address</button></div>
      </article>
    );
  }
  if (item.section === "payments") {
    return (
      <article className="record-card payment-card">
        <div className="card-top"><span className="payment-logo">{item.title.slice(0, 2).toUpperCase()}</span><div><h3>{item.title}</h3><p>{item.subtitle}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} canEdit={canEdit} canDelete={canDelete} /></div>
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
        <div className="faq-number">Q</div><div className="faq-content"><span>{item.data.category || item.subtitle}</span><h3>{item.title}</h3><details><summary>View answer</summary><p>{item.data.answer}</p></details><button onClick={() => copyText(item.data.answer, "Answer", setToast)}>Copy answer</button></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} canEdit={canEdit} canDelete={canDelete} />
      </article>
    );
  }
  return (
    <article className="record-card point-card">
      {item.data.posterUrl && <div className="point-poster-frame"><img className="point-poster" src={item.data.posterUrl} alt={`${item.title} reward`} /></div>}
      <div className="card-top"><span className="record-avatar">PT</span><div><h3>{item.title}</h3><p>{item.subtitle}</p></div><CardMenu item={item} setEditing={setEditing} removeItem={removeItem} canEdit={canEdit} canDelete={canDelete} /></div>
      <div className="point-value"><strong>{item.data.points || "—"}</strong><span>Redeem</span></div>
      <p>{item.data.terms}</p><div className="card-footer"><span className="status-chip">{item.data.status || "Active"}</span><button onClick={() => copyText(`${item.title}: ${item.data.points} = ${item.data.value}. ${item.data.terms}`, "Reward details", setToast)}>Copy details</button></div>
    </article>
  );
}

function CardMenu({ item, setEditing, removeItem, canEdit, canDelete }: { item: RecordItem; setEditing: (item: RecordItem) => void; removeItem: (item: RecordItem) => void; canEdit: boolean; canDelete: boolean }) {
  if (!canEdit && !canDelete) return null;
  return <div className="card-menu">{canEdit && <button onClick={() => setEditing(structuredClone(item))}>Edit</button>}{canDelete && <button className="delete" onClick={() => removeItem(item)}>Delete</button>}</div>;
}

function PaymentStudio({ setToast, canManage }: { setToast: (value: string) => void; canManage: boolean }) {
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
      {canManage && <div className="studio-actions">
        <button onClick={() => copyText(`${gateway} payment • RM ${amount || "0.00"} • ${reference || "No reference"}`, "Payment brief", setToast)}>Copy brief</button>
        <a href={portal} target="_blank" rel="noreferrer">Continue in {gateway} ↗</a>
      </div>}
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
    pharmacies: [["phone", "Phone number", "text"], ["address", "Full address", "textarea"]],
    payments: [["details", "Payment instructions", "textarea"], ["link", "Payment link", "text"], ["portal", "Portal link", "text"], ["status", "Status", "text"]],
    faq: [["category", "Category", "text"], ["answer", "Answer", "textarea"], ["source", "Source", "text"]],
    calendar: [["location", "Location", "text"], ["details", "Event details / remark", "textarea"], ["status", "Status", "text"]],
    broadcasts: [],
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
      form.append("section", item.section);
      form.append("action", item.id ? "edit" : "add");
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
      <form className={`modal ${item.section === "calendar" || item.section === "broadcasts" ? "calendar-modal" : ""}`} onSubmit={onSave}>
        <div className="modal-heading"><div><p className="eyebrow">{item.id ? "Update item" : "New item"}</p><h2>{item.id ? item.title : `Add to ${menus.find((menu) => menu.id === item.section)?.label}`}</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div>
        <div className="form-grid">
          <label className="full"><span>{item.section === "faq" ? "Question" : item.section === "pharmacies" ? "Shop name" : item.section === "promotions" ? "Title A · Package Name" : item.section === "calendar" ? "Event name" : item.section === "broadcasts" ? "Broadcast title" : "Name"}</span><input required value={item.title} onChange={(event) => setItem({ ...item, title: event.target.value })} placeholder={item.section === "promotions" ? "e.g. 配套A - 美白牙粉x2" : item.section === "calendar" ? "e.g. DrSmile Roadshow" : item.section === "broadcasts" ? "e.g. August VIP Repurchase" : "Enter a clear name"} /></label>
          {item.section !== "broadcasts" && <label className="full"><span>{item.section === "pharmacies" ? "Area / location" : item.section === "promotions" ? "SKU" : item.section === "calendar" ? "Event type" : "Short description"}</span><input value={item.subtitle} onChange={(event) => setItem({ ...item, subtitle: event.target.value })} placeholder={item.section === "promotions" ? "e.g. 8A26" : item.section === "calendar" ? "e.g. Roadshow, training or campaign" : "Optional supporting detail"} /></label>}
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
            <>
              <div className="calendar-schedule-fields full">
                <div className="date-range-field">
                  <label><span>Start date</span><input required type="date" value={item.data.date || ""} onChange={(event) => { const next = event.target.value; setItem({ ...item, data: { ...item.data, date: next, endDate: !item.data.endDate || item.data.endDate < next ? next : item.data.endDate } }); }} /></label>
                  <i>→</i>
                  <label><span>End date</span><input required type="date" min={item.data.date || undefined} value={item.data.endDate || item.data.date || ""} onChange={(event) => updateData("endDate", event.target.value)} /></label>
                </div>
                <TimeField value={item.data.time || ""} onChange={(value) => updateData("time", value)} />
              </div>
              <div className="multi-people-fields full">
                <MultiNameField label="PIC" value={item.data.pic || ""} onChange={(value) => updateData("pic", value)} />
                <MultiNameField label="Who Attend" value={item.data.attendees || ""} onChange={(value) => updateData("attendees", value)} />
              </div>
            </>
          )}
          {item.section === "broadcasts" && (
            <>
              <div className="calendar-schedule-fields full"><div className="broadcast-date-time"><label><span>Broadcast date</span><input required type="date" value={item.data.date || ""} onChange={(event) => updateData("date", event.target.value)} /></label><TimeField value={item.data.time || ""} onChange={(value) => updateData("time", value)} required /></div></div>
              <BroadcastChannelField value={item.data.channel || ""} onChange={(value) => updateData("channel", value)} />
              <label className="full"><span>Description / BC content</span><textarea required value={item.data.description || ""} onChange={(event) => updateData("description", event.target.value)} placeholder="Type the broadcast message your team will send" /></label>
              <div className="full"><MultiNameField label="PIC" value={item.data.pic || ""} onChange={(value) => updateData("pic", value)} /></div>
            </>
          )}
          {item.section === "pharmacies" && (
            <label><span>State</span><select required value={item.data.regionState || pharmacyState(item)} onChange={(event) => updateData("regionState", event.target.value)}><option value="">Choose state</option>{PHARMACY_STATE_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.states.map((state) => <option key={state} value={state}>{state}</option>)}</optgroup>)}</select></label>
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

function MultiNameField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState("");
  const names = value.split(",").map((name) => name.trim()).filter(Boolean);
  function addName(selected = draft) {
    const name = selected.trim();
    if (!name) return;
    if (!names.some((existing) => existing.toLowerCase() === name.toLowerCase())) onChange([...names, name].join(", "));
    setDraft("");
  }
  function removeName(name: string) { onChange(names.filter((entry) => entry !== name).join(", ")); }
  return (
    <label className="multi-name-field">
      <span>{label} · Multiple selection</span>
      <div className="name-chips">{names.map((name) => <span key={name}>{name}<button type="button" onClick={() => removeName(name)} aria-label={`Remove ${name}`}>×</button></span>)}</div>
      <select className="team-select" value="" onChange={(event) => addName(event.target.value)}><option value="">＋ Select from Admin team</option>{ADMIN_TEAM.filter((member) => !names.includes(member.name)).map((member) => <option key={member.name} value={member.name}>{member.name} · {member.role}</option>)}</select>
      <div className="name-entry"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addName(); } }} placeholder="Or enter another name" /><button type="button" onClick={() => addName()}>＋ Add</button></div>
    </label>
  );
}

function BroadcastChannelField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = value.split(",").map((channel) => channel.trim()).filter(Boolean);
  function toggle(channel: string) { onChange(selected.includes(channel) ? selected.filter((item) => item !== channel).join(", ") : [...selected, channel].join(", ")); }
  return <fieldset className="broadcast-channel-field full"><legend>Channel · Multiple selection</legend>{["Facebook", "WhatsApp"].map((channel) => <label key={channel} className={selected.includes(channel) ? "active" : ""}><input type="checkbox" checked={selected.includes(channel)} onChange={() => toggle(channel)} /><span>{channel === "Facebook" ? "FB" : "WA"}</span><strong>{channel}</strong></label>)}</fieldset>;
}

function TimeField({ value, onChange, required = false }: { value: string; onChange: (value: string) => void; required?: boolean }) {
  const parsedHour = value ? Number(value.split(":")[0]) : 9;
  const [hour, setHour] = useState(value ? String(parsedHour % 12 || 12).padStart(2, "0") : "");
  const [minute, setMinute] = useState(value ? (value.split(":")[1] || "00") : "");
  const [period, setPeriod] = useState<"AM" | "PM">(parsedHour >= 12 ? "PM" : "AM");

  useEffect(() => {
    if (!value) return;
    const [nextHour, nextMinute = "00"] = value.split(":");
    const hourNumber = Number(nextHour);
    setHour(String(hourNumber % 12 || 12).padStart(2, "0"));
    setMinute(nextMinute.padStart(2, "0"));
    setPeriod(hourNumber >= 12 ? "PM" : "AM");
  }, [value]);

  function commit(nextHour = hour, nextMinute = minute, nextPeriod = period) {
    const hourNumber = Number(nextHour);
    const minuteNumber = Number(nextMinute);
    if (!nextHour || !nextMinute || hourNumber < 1 || hourNumber > 12 || minuteNumber < 0 || minuteNumber > 59) { onChange(""); return; }
    const hour24 = (hourNumber % 12) + (nextPeriod === "PM" ? 12 : 0);
    onChange(`${String(hour24).padStart(2, "0")}:${String(minuteNumber).padStart(2, "0")}`);
  }

  return (
    <div className="custom-time-field">
      <span>{required ? "Broadcast time" : "Start time"}<small>{required ? "Required" : "Optional"}</small></span>
      <div className="time-control">
        <input inputMode="numeric" maxLength={2} value={hour} onChange={(event) => { const next = event.target.value.replace(/\D/g, "").slice(0, 2); setHour(next); commit(next, minute, period); }} onBlur={() => hour && setHour(hour.padStart(2, "0"))} placeholder="09" aria-label="Hour" />
        <b>:</b>
        <input inputMode="numeric" maxLength={2} value={minute} onChange={(event) => { const next = event.target.value.replace(/\D/g, "").slice(0, 2); setMinute(next); commit(hour, next, period); }} onBlur={() => minute && setMinute(minute.padStart(2, "0"))} placeholder="00" aria-label="Minute" />
        <div className="period-toggle"><button type="button" className={period === "AM" ? "active" : ""} onClick={() => { setPeriod("AM"); commit(hour, minute, "AM"); }}>AM</button><button type="button" className={period === "PM" ? "active" : ""} onClick={() => { setPeriod("PM"); commit(hour, minute, "PM"); }}>PM</button></div>
      </div>
    </div>
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
