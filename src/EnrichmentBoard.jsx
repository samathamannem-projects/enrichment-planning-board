import { useState, useEffect, useRef, Fragment } from "react";
import {
  LayoutGrid, Store, CheckCircle2, Share2, Plus, Pencil, Trash2, X, Check, Clock,
  MapPin, AlertTriangle, ArrowUp, Printer, Copy, Star, ChevronRight, History, User,
  Lock, LogOut, Cloud, Music, DoorOpen, GraduationCap, Scale, MessageSquare, Search, ChevronDown,
} from "lucide-react";
import { HISTORICAL_RAW } from "./historicalSeasons.js";
import { supabase, supabaseEnabled } from "./supabaseClient.js";

/* ---------------- constants ---------------- */

const LKEY = "enrichment-board-v3";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const CATS = ["STEM", "Art", "Movement", "Music", "Academic"];
const CAT_LABEL = { STEM: "STEM / Chess", Art: "Art", Movement: "Movement", Music: "Music", Academic: "Academic" };
const BALANCE = ["Art", "STEM", "Movement"];
const GRADES = ["K", "1", "2", "3", "4", "5"];

const CARD = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const INPUT = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
const BTN = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40";
const BTN_GHOST = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50";

const CAT_STYLE = {
  STEM:     { bar: "bg-blue-500",    dot: "bg-blue-500" },
  Art:      { bar: "bg-rose-500",    dot: "bg-rose-500" },
  Movement: { bar: "bg-emerald-500", dot: "bg-emerald-500" },
  Music:    { bar: "bg-amber-500",   dot: "bg-amber-500" },
  Academic: { bar: "bg-violet-500",  dot: "bg-violet-500" },
};
const cs = (t) => CAT_STYLE[t] ?? CAT_STYLE.Academic;

const STATUS = {
  idea:      { label: "Idea",      cls: "bg-slate-100 text-slate-500 border-slate-200" },
  proposed:  { label: "Proposed",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};
const V_STATUS = {
  to_contact: { label: "To contact", cls: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  contacted:  { label: "Contacted",  cls: "bg-blue-100 text-blue-700",   dot: "bg-blue-500" },
  responded:  { label: "Responded",  cls: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  agreed:     { label: "Agreed",     cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  declined:   { label: "Declined",   cls: "bg-red-100 text-red-600",     dot: "bg-red-500" },
};
const V_ORDER = ["to_contact", "contacted", "responded", "agreed", "declined"];

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
const firstChoice = (c) => {
  const v = c.vendors || [];
  return v.filter((x) => x.status !== "declined")[0] || v[0] || null;
};

/* grades */
function parseBand(b) {
  if (!b) return [null, null];
  const g = (x) => {
    x = x.trim().toLowerCase();
    if (x.startsWith("k")) return 0;                 // K, Kinder, Kindergarten
    const m = x.match(/[0-5]/); return m ? Number(m[0]) : null;  // 1, 2nd, "grade 3"
  };
  const parts = String(b).replace(/[–—]/g, "-").split(/\s*(?:-|to|through|thru|&)\s*/i).filter(Boolean);
  if (parts.length >= 2) {
    const a = g(parts[0]), z = g(parts[parts.length - 1]);
    if (a != null && z != null) return [Math.min(a, z), Math.max(a, z)];
  }
  const one = g(String(b));
  return one == null ? [null, null] : [one, one];
}
// Effective grade span for a class: prefer explicit fields, else re-derive from the band.
// This is why a K–2 class always covers Kindergarten even if older records never stored gradeFrom.
function gradeRange(c) {
  if (c.gradeFrom != null && c.gradeTo != null) return [c.gradeFrom, c.gradeTo];
  return parseBand(c.band);
}
function gradeText(c) {
  const [f, t] = gradeRange(c);
  if (f == null || t == null) return c.band || "—";
  return f === t ? GRADES[f] : `${GRADES[f]}–${GRADES[t]}`;
}

/* fuzzy vendor matching */
const KNOWN_VENDORS = [...new Set(HISTORICAL_RAW.flatMap((s) => s.classes.map((c) => c.provider)).filter(Boolean))];
const normV = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function suggestVendor(name) {
  const raw = (name || "").trim();
  const n = normV(raw);
  if (n.length < 3) return null;
  let best = null, score = 0;
  for (const k of KNOWN_VENDORS) {
    if (k === raw) return null;
    const kn = normV(k);
    let sc;
    if (kn === n) sc = 1;
    else if (kn.includes(n) || n.includes(kn)) sc = 0.88;
    else sc = 1 - lev(n, kn) / Math.max(n.length, kn.length);
    if (sc > score) { score = sc; best = k; }
  }
  return score >= 0.72 ? best : null;
}

/* rooms + conflicts + preference tiers */
const toMin = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const sameRoom = (x, y) => !!x && !!y && x.trim().toLowerCase() === y.trim().toLowerCase();
function timesOverlap(a, b) {
  const as = toMin(a.start), ae = toMin(a.end), bs = toMin(b.start), be = toMin(b.end);
  if (as == null || ae == null || bs == null || be == null) return true;
  return as < be && bs < ae;
}
function roomConflicts(classes) {
  const list = []; const withRoom = classes.filter((c) => c.room && c.day);
  for (let i = 0; i < withRoom.length; i++) for (let j = i + 1; j < withRoom.length; j++) {
    const a = withRoom[i], b = withRoom[j];
    if (a.day === b.day && sameRoom(a.room, b.room) && timesOverlap(a, b)) list.push([a, b]);
  }
  return list;
}
const KNOWN_ROOMS = [...new Set(HISTORICAL_RAW.flatMap((s) => s.classes.map((c) => c.room)).map((r) => (r || "").trim()).filter(Boolean))].sort();
const PREFERRED_ROOMS = ["118", "Art Room", "Gym", "Library", "Portable Class", "Field"];
const TIER_LABELS = ["Preferred", "Second choice", "Last resort", "Other"];
function roomTier(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("118") || n.includes("art room") || n.includes("gym")) return 0;
  if (n.includes("library") || n.includes("portable") || n.includes("field")) return 1;
  if (n.includes("pod")) return 2;
  return 3;
}
const byTier = (a, b) => roomTier(a) - roomTier(b) || a.localeCompare(b);

/* ---------------- data sources ---------------- */

function historicalSeasons() {
  return HISTORICAL_RAW.map((s) => ({
    id: genId(), name: s.name, editable: false, yearLong: !!s.yearLong,
    classes: s.classes.map((c) => {
      const [gf, gt] = parseBand(c.band);
      return {
        id: genId(), ...c, gradeFrom: gf, gradeTo: gt, status: "confirmed",
        vendors: c.provider ? [{ id: genId(), name: c.provider, status: "agreed", preferredDays: c.day ? [c.day] : [], contact: "", notes: "" }] : [],
      };
    }),
  }));
}
const newEnrichmentSeason = () => ({ id: genId(), name: "Fall 2026", editable: true, kind: "enrichment", classes: [] });
const newMusicSeason = () => ({ id: genId(), name: "Music 2026–27", editable: true, kind: "music", classes: [] });
const newEditableSeasons = () => [newEnrichmentSeason(), newMusicSeason()];
const editableOf = (d) => d.seasons.filter((s) => s.editable);

// Music classes seed once into the music-planning season (editable, so days/times can change).
function seedMusic(season) {
  if (season.kind !== "music" || season.musicSeeded) return season;
  const raw = HISTORICAL_RAW.find((s) => s.yearLong);
  const musicClasses = (raw ? raw.classes : []).map((c) => {
    const [gf, gt] = parseBand(c.band);
    const vName = c.provider || c.instructor || "";
    return {
      id: genId(), name: c.name, type: c.type, gradeFrom: gf, gradeTo: gt,
      day: c.day, start: c.start, end: c.end, room: c.room, status: "confirmed",
      vendors: vName ? [{ id: genId(), name: vName, status: "agreed", preferredDays: c.day ? [c.day] : [], contact: "", notes: "" }] : [],
    };
  });
  return { ...season, musicSeeded: true, classes: [...musicClasses, ...(season.classes || [])] };
}
const uniq = (a) => [...new Set(a)];
const MUSIC_NAMES = new Set((HISTORICAL_RAW.find((s) => s.yearLong)?.classes || []).map((c) => c.name));
function prepareSeason(season) {
  let s = seedMusic(season);
  // Migration: music now has its own type + its own season (single source of truth).
  if (s.kind === "music" && !s.musicRetyped) {
    s = { ...s, musicRetyped: true, classes: s.classes.map((c) => (MUSIC_NAMES.has(c.name) && c.type !== "Music" ? { ...c, type: "Music" } : c)) };
  }
  if (s.kind !== "music" && !s.musicMovedOut) {
    // Drop stale auto-seeded music copies from the enrichment season; the Music season now supplies them.
    s = { ...s, musicMovedOut: true, classes: (s.classes || []).filter((c) => !MUSIC_NAMES.has(c.name)) };
  }
  if (!s.rooms) s = { ...s, rooms: uniq([...PREFERRED_ROOMS, ...KNOWN_ROOMS]) };
  if (!s.roomsMigrated) s = { ...s, roomsMigrated: true, rooms: uniq([...(s.rooms || []), ...PREFERRED_ROOMS]) };
  return s;
}

function combine(editableSeasons, activeSeasonId) {
  let seeded = editableSeasons.map(prepareSeason);
  if (!seeded.some((s) => s.kind === "music")) seeded = [...seeded, prepareSeason(newMusicSeason())];
  if (!seeded.some((s) => s.kind === "enrichment" || !s.kind)) seeded = [prepareSeason(newEnrichmentSeason()), ...seeded];
  const seasons = [...historicalSeasons(), ...seeded];
  if (!seasons.find((s) => s.id === activeSeasonId)) activeSeasonId = seeded[0]?.id || seasons[0].id;
  return { seasons, activeSeasonId };
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(LKEY);
    if (raw) {
      const p = JSON.parse(raw);
      const editable = p.editableSeasons || (p.seasons ? p.seasons.filter((s) => s.editable) : null);
      if (editable && editable.length) return combine(editable, p.activeSeasonId);
    }
  } catch (_) {}
  return combine(newEditableSeasons(), null);
}
function persistLocal(d) {
  try { localStorage.setItem(LKEY, JSON.stringify({ editableSeasons: editableOf(d), activeSeasonId: d.activeSeasonId })); } catch (_) {}
}
async function cloudLoad(canWrite) {
  const { data: row } = await supabase.from("board_state").select("data").eq("id", "main").maybeSingle();
  if (row && row.data && Array.isArray(row.data.editableSeasons) && row.data.editableSeasons.length) {
    return combine(row.data.editableSeasons, row.data.activeSeasonId);
  }
  const eds = newEditableSeasons();
  if (canWrite) await supabase.from("board_state").upsert({ id: "main", data: { editableSeasons: eds, activeSeasonId: eds[0].id } });
  return combine(eds, eds[0].id);
}
async function cloudSave(d) {
  await supabase.from("board_state").upsert({ id: "main", data: { editableSeasons: editableOf(d), activeSeasonId: d.activeSeasonId }, updated_at: new Date().toISOString() });
}

/* ---------------- atoms ---------------- */

const Field = ({ label, children }) => (
  <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>
);
const StatusBadge = ({ status }) => {
  const s = STATUS[status] ?? STATUS.idea;
  return <span className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
};
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4" style={{ backgroundColor: "rgba(15,23,42,0.5)" }} onClick={onClose}>
      <div className={`mt-8 w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl bg-white shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
function SectionHead({ icon: Icon, title, hint }) {
  return (
    <div className="mb-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon size={15} className="text-indigo-500" /> {title}</h3>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/* ---------------- catalog + class form ---------------- */

function buildCatalog() {
  const map = new Map();
  for (const s of HISTORICAL_RAW) for (const c of s.classes) {
    const key = `${c.name}||${c.type}||${c.band}`;
    if (!map.has(key)) {
      const [gf, gt] = parseBand(c.band);
      map.set(key, { key, name: c.name, type: c.type, band: c.band, gradeFrom: gf, gradeTo: gt, vendors: new Set() });
    }
    if (c.provider) map.get(key).vendors.add(c.provider);
  }
  return [...map.values()].map((e) => ({ ...e, vendors: [...e.vendors] }))
    .sort((a, b) => CATS.indexOf(a.type) - CATS.indexOf(b.type) || a.name.localeCompare(b.name));
}
const CATALOG = buildCatalog();

function CatalogPicker({ onPick }) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const rows = CATALOG.filter((e) => !ql || e.name.toLowerCase().includes(ql) || e.vendors.join(" ").toLowerCase().includes(ql) || CAT_LABEL[e.type].toLowerCase().includes(ql));
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reuse from past seasons</span>
        <span className="text-xs text-slate-400">{rows.length} classes</span>
      </div>
      <input className={INPUT} placeholder="Search past classes or vendors…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {rows.map((e) => (
          <button key={e.key} onClick={() => onPick(e)} className="flex w-full items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-left hover:border-indigo-300 hover:bg-indigo-50">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cs(e.type).dot}`} title={CAT_LABEL[e.type]} />
            <span className="text-sm font-medium text-slate-800">{e.name}</span>
            <span className="text-xs text-slate-400">{gradeText(e)}</span>
            <span className="ml-auto truncate pl-2 text-xs text-slate-400">{e.vendors.length ? e.vendors.join(", ") : "no vendor"}</span>
          </button>
        ))}
        {rows.length === 0 && <p className="px-1 py-2 text-sm text-slate-400">No matches.</p>}
      </div>
    </div>
  );
}

function RoomSelect({ value, rooms, onChange }) {
  return (
    <select className={INPUT} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— none —</option>
      {value && !(rooms || []).includes(value) && <option value={value}>{value}</option>}
      {TIER_LABELS.map((label, ti) => {
        const group = (rooms || []).filter((r) => roomTier(r) === ti).sort((a, b) => a.localeCompare(b));
        return group.length ? <optgroup key={label} label={label}>{group.map((r) => <option key={r} value={r}>{r}</option>)}</optgroup> : null;
      })}
    </select>
  );
}

function ClassForm({ initial, onSave, onClose, rooms }) {
  const [f, setF] = useState(initial);
  const [note, setNote] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.name.trim() && f.gradeTo >= f.gradeFrom && (!f.end || !f.start || f.end > f.start);
  const pick = (e) => {
    setF((p) => ({ ...p, name: e.name, type: e.type, gradeFrom: e.gradeFrom ?? 0, gradeTo: e.gradeTo ?? 5,
      vendors: e.vendors.map((n) => ({ id: genId(), name: n, status: "to_contact", preferredDays: [], contact: "", notes: "" })) }));
    setNote(e.vendors.length
      ? `Loaded “${e.name}” — ${e.vendors.length} past vendor${e.vendors.length > 1 ? "s" : ""} added to contact. Set the day, time, and room below.`
      : `Loaded “${e.name}”. Set the day, time, and room below.`);
  };
  const vSet = (vs) => setF((p) => ({ ...p, vendors: vs }));
  const vUpd = (id, next) => vSet((f.vendors || []).map((v) => (v.id === id ? next : v)));
  const vAdd = () => vSet([...(f.vendors || []), { id: genId(), name: "", status: "to_contact", preferredDays: [], contact: "", notes: "" }]);
  const vRm = (id) => vSet((f.vendors || []).filter((v) => v.id !== id));
  const vPromote = (id) => { const v = (f.vendors || []).find((x) => x.id === id); vSet([v, ...(f.vendors || []).filter((x) => x.id !== id)]); };

  return (
    <Modal title={f.id ? "Edit class" : "Add class"} onClose={onClose} wide>
      {!f.id && <CatalogPicker onPick={pick} />}
      {note && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{note}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Class name"><input className={INPUT} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Watercolor Painting" /></Field></div>
        <Field label="Activity type"><select className={INPUT} value={f.type} onChange={(e) => set("type", e.target.value)}>{CATS.map((t) => <option key={t} value={t}>{CAT_LABEL[t]}</option>)}</select></Field>
        <Field label="Day"><select className={INPUT} value={f.day} onChange={(e) => set("day", e.target.value)}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Grade from"><select className={INPUT} value={f.gradeFrom} onChange={(e) => set("gradeFrom", Number(e.target.value))}>{GRADES.map((g, i) => <option key={g} value={i}>{g}</option>)}</select></Field>
        <Field label="Grade to"><select className={INPUT} value={f.gradeTo} onChange={(e) => set("gradeTo", Number(e.target.value))}>{GRADES.map((g, i) => <option key={g} value={i}>{g}</option>)}</select></Field>
        <Field label="Start time"><input type="time" className={INPUT} value={f.start} onChange={(e) => set("start", e.target.value)} /></Field>
        <Field label="End time"><input type="time" className={INPUT} value={f.end} onChange={(e) => set("end", e.target.value)} /></Field>
        <Field label="Room"><RoomSelect value={f.room} rooms={rooms} onChange={(v) => set("room", v)} /></Field>
        <Field label="Status"><select className={INPUT} value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.keys(STATUS).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}</select></Field>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">Vendors</span>
          <button onClick={vAdd} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"><Plus size={12} /> Add vendor</button>
        </div>
        {(f.vendors || []).length === 0 && <p className="text-xs text-slate-400">No vendor yet — add one here, or manage candidates later in the Vendors tab.</p>}
        <div className="space-y-1.5">
          {(f.vendors || []).map((v, i) => {
            const sugg = suggestVendor(v.name);
            return (
              <div key={v.id}>
                <div className="flex items-center gap-2">
                  {i === 0
                    ? <Star size={13} className="shrink-0 fill-amber-400 text-amber-400" title="First choice" />
                    : <button onClick={() => vPromote(v.id)} title="Make first choice" className="shrink-0 rounded p-0.5 text-slate-300 hover:text-amber-500"><ArrowUp size={13} /></button>}
                  <input className={INPUT + " flex-1"} placeholder="Vendor name" value={v.name} onChange={(e) => vUpd(v.id, { ...v, name: e.target.value })} />
                  <select value={v.status} onChange={(e) => vUpd(v.id, { ...v, status: e.target.value })} className={`shrink-0 rounded-xl border border-slate-200 px-2 py-2 text-xs font-medium ${V_STATUS[v.status].cls}`}>{V_ORDER.map((s) => <option key={s} value={s}>{V_STATUS[s].label}</option>)}</select>
                  <button onClick={() => vRm(v.id)} className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                {sugg && <div className="mt-0.5 pl-6 text-xs text-slate-500">Did you mean <button onClick={() => vUpd(v.id, { ...v, name: sugg })} className="font-medium text-indigo-600 underline">{sugg}</button>?</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button disabled={!valid} onClick={() => onSave({ ...f, name: f.name.trim() })} className={BTN + " px-4"}>{f.id ? "Save changes" : "Add class"}</button>
      </div>
    </Modal>
  );
}

/* ---------------- cards ---------------- */

function EditableCard({ cls, onEdit, onDelete, onToggleConfirm, onDrag, conflict }) {
  const fc = firstChoice(cls);
  return (
    <div draggable onDragStart={() => onDrag(cls.id)} className={`group cursor-grab rounded-xl border bg-white p-2.5 shadow-sm transition active:cursor-grabbing ${conflict ? "border-red-300 ring-1 ring-red-200" : "border-slate-200 hover:border-indigo-200 hover:shadow"}`}>
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold leading-tight text-slate-800">{cls.name}</span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button onClick={() => onToggleConfirm(cls.id)} title={cls.status === "confirmed" ? "Un-confirm" : "Confirm for season"} className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"><Check size={13} /></button>
          <button onClick={() => onEdit(cls)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><Pencil size={13} /></button>
          <button onClick={() => onDelete(cls.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{gradeText(cls)}</span>
        <StatusBadge status={cls.status} />
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(cls.start)}</span>
        {cls.room && <span className={`flex items-center gap-1 ${conflict ? "font-medium text-red-500" : ""}`}><MapPin size={11} />{cls.room}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-50 pt-1.5 text-xs">
        {fc ? (
          <><span className={`h-2 w-2 shrink-0 rounded-full ${V_STATUS[fc.status].dot}`} /><span className="truncate text-slate-600">{fc.name}</span><span className="ml-auto shrink-0 text-slate-400">{V_STATUS[fc.status].label}</span></>
        ) : <span className="flex items-center gap-1 text-amber-600"><AlertTriangle size={11} /> Needs a vendor</span>}
      </div>
    </div>
  );
}

function ReadOnlyCard({ cls }) {
  const fc = firstChoice(cls);
  const cancelled = cls.outcome === "Cancelled";
  return (
    <div className={`rounded-xl border p-2.5 ${cancelled ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`} style={cancelled ? { opacity: 0.65 } : undefined}>
      <div className="flex items-start justify-between gap-1">
        <span className={`text-sm font-semibold leading-tight text-slate-800 ${cancelled ? "line-through" : ""}`}>{cls.name}</span>
        {cancelled && <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">Cancelled</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-400">
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{gradeText(cls)}</span>
        <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(cls.start)}</span>
        {cls.room && <span className="flex items-center gap-1"><MapPin size={11} />{cls.room}</span>}
      </div>
      {cls.instructor && <div className="mt-1 flex items-center gap-1 text-xs text-slate-400"><User size={11} />{cls.instructor}</div>}
      <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-50 pt-1.5 text-xs">
        <span className="truncate text-slate-600">{fc ? fc.name : "—"}</span>
        {!cancelled && cls.capacity > 0 && <span className="ml-auto shrink-0 text-slate-400">{cls.enrolled}/{cls.capacity} enrolled</span>}
      </div>
      {cls.feedback && <div className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">{cls.feedback}</div>}
    </div>
  );
}

/* ---------------- plan board (single grid = aligned columns) ---------------- */

function PlanBoard({ classes, readOnly, setDragId, onDropCell, onAdd, onEdit, onDelete, onToggleConfirm, conflictIds }) {
  const [over, setOver] = useState(null);
  const cids = conflictIds || new Set();
  return (
    <div className="overflow-x-auto">
      <div className="grid" style={{ gridTemplateColumns: "132px repeat(5, minmax(148px, 1fr))" }}>
        <div className="sticky left-0 z-10 bg-white" />
        {DAYS.map((d) => {
          const have = new Set(classes.filter((c) => c.day === d).map((c) => c.type));
          return (
            <div key={d} className="border-b border-slate-100 px-2 pb-2 text-center">
              <div className="text-sm font-semibold text-slate-700">{d}</div>
              <div className="mt-1 flex justify-center gap-1">
                {BALANCE.map((t) => <span key={t} title={CAT_LABEL[t]} className={`h-1.5 w-1.5 rounded-full ${have.has(t) ? cs(t).bar : "bg-slate-200"}`} />)}
              </div>
            </div>
          );
        })}
        {CATS.map((type) => (
          <Fragment key={type}>
            <div className="sticky left-0 z-10 flex items-center gap-2 border-t border-slate-100 bg-white py-3 pr-2">
              <span className={`h-7 w-1.5 rounded-full ${cs(type).bar}`} />
              <span className="text-sm font-semibold text-slate-700">{CAT_LABEL[type]}</span>
            </div>
            {DAYS.map((day) => {
              const items = classes.filter((c) => c.day === day && c.type === type);
              const isOver = over === `${day}-${type}`;
              const dnd = readOnly ? {} : {
                onDragOver: (e) => { e.preventDefault(); setOver(`${day}-${type}`); },
                onDragLeave: () => setOver(null),
                onDrop: () => { onDropCell(day, type); setOver(null); },
              };
              return (
                <div key={day} {...dnd} className={`space-y-1.5 border-l border-t border-slate-100 p-1.5 transition-colors ${isOver ? "bg-indigo-50" : ""}`} style={{ minHeight: 92 }}>
                  {items.map((c) => readOnly
                    ? <ReadOnlyCard key={c.id} cls={c} />
                    : <EditableCard key={c.id} cls={c} conflict={cids.has(c.id)} onEdit={onEdit} onDelete={onDelete} onToggleConfirm={onToggleConfirm} onDrag={setDragId} />)}
                  {!readOnly && (
                    <button onClick={() => onAdd(day, type)} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 py-1.5 text-xs text-slate-400 hover:border-indigo-300 hover:text-indigo-500"><Plus size={12} /> Add</button>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      {!readOnly && <p className="mt-3 text-xs text-slate-400">Drag a card to another day or activity to rebalance. The dots under each day show whether Art, STEM, and Movement are covered.</p>}
    </div>
  );
}

/* ---------------- insights (room availability, coverage, balance) ---------------- */

function RoomRow({ name, onRename, onRemove }) {
  const [val, setVal] = useState(name);
  useEffect(() => setVal(name), [name]);
  const commit = () => { const v = val.trim(); if (v && v !== name) onRename(name, v); else setVal(name); };
  return (
    <div className="flex items-center gap-2">
      <input className={INPUT + " flex-1"} value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
      <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{TIER_LABELS[roomTier(name)]}</span>
      <button onClick={onRemove} className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
    </div>
  );
}

const DayHead = ({ extra }) => (
  <div className="grid" style={{ gridTemplateColumns: `150px repeat(5, minmax(0, 1fr))${extra || ""}` }}>
    <div />{DAYS.map((d) => <div key={d} className="pb-2 text-center text-sm font-semibold text-slate-600">{d}</div>)}
    {extra && <div className="pb-2 text-center text-xs font-semibold text-slate-400">Week</div>}
  </div>
);

/* Rooms tab: availability grid (by tier) + the full editable room list. */
function RoomsView({ classes, rooms, onRooms, onRename, canEdit }) {
  const [newRoom, setNewRoom] = useState("");
  const used = [...new Set(classes.map((c) => c.room).filter(Boolean))];
  const allRooms = [...new Set([...(rooms || []), ...used])].sort(byTier);
  const conflicts = roomConflicts(classes);
  const conflictIds = new Set();
  conflicts.forEach(([a, b]) => { conflictIds.add(a.id); conflictIds.add(b.id); });
  const addRoom = () => { const r = newRoom.trim(); if (r && !(rooms || []).some((x) => sameRoom(x, r))) onRooms([...(rooms || []), r]); setNewRoom(""); };
  const removeRoom = (i) => onRooms(rooms.filter((_, x) => x !== i));

  return (
    <div className="space-y-4">
      <div className={CARD + " p-4"}>
        <SectionHead icon={DoorOpen} title="Room availability" hint="Rooms grouped by your preference tiers. Green means free that day; red is a double-booking." />
        {conflicts.length > 0 && (
          <ul className="mb-3 space-y-0.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
            {conflicts.map(([a, b], i) => <li key={i}>“{a.name}” &amp; “{b.name}” — {a.room}, {a.day} ({fmtTime(a.start)}–{fmtTime(a.end)} vs {fmtTime(b.start)}–{fmtTime(b.end)})</li>)}
          </ul>
        )}
        <div className="overflow-x-auto"><div style={{ minWidth: 720 }}>
          <DayHead />
          {allRooms.length === 0 && <p className="py-2 text-sm text-slate-400">No rooms yet.</p>}
          {allRooms.map((room, idx) => {
            const tier = roomTier(room);
            const showLabel = idx === 0 || roomTier(allRooms[idx - 1]) !== tier;
            return (
              <Fragment key={room}>
                {showLabel && <div className="border-t border-slate-100 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{TIER_LABELS[tier]}</div>}
                <div className="grid border-t border-slate-50" style={{ gridTemplateColumns: "150px repeat(5, minmax(0, 1fr))" }}>
                  <div className="flex items-center py-2 pr-2 text-sm font-medium text-slate-600">{room}</div>
                  {DAYS.map((day) => {
                    const inCell = classes.filter((c) => sameRoom(c.room, room) && c.day === day);
                    const conflict = inCell.some((c) => conflictIds.has(c.id));
                    return (
                      <div key={day} className={`space-y-0.5 border-l border-slate-50 p-1.5 ${conflict ? "bg-red-50" : ""}`}>
                        {inCell.length === 0
                          ? <span className="text-xs font-medium text-emerald-500">free</span>
                          : inCell.map((c) => <div key={c.id} className={`truncate text-xs ${conflict ? "font-medium text-red-600" : "text-slate-600"}`}>{c.name} · {fmtTime(c.start)}</div>)}
                      </div>
                    );
                  })}
                </div>
              </Fragment>
            );
          })}
        </div></div>
      </div>

      <div className={CARD + " p-4"}>
        <SectionHead icon={LayoutGrid} title="All rooms" hint={canEdit ? "Every room you can assign, grouped by tier. Renaming one updates every class using it." : "Every room, grouped by preference tier."} />
        {canEdit ? (
          <>
            <div className="grid max-w-2xl gap-1.5 sm:grid-cols-2">
              {(rooms || []).slice().sort(byTier).map((r) => {
                const i = rooms.indexOf(r);
                return <RoomRow key={r + i} name={r} onRename={onRename} onRemove={() => removeRoom(i)} />;
              })}
              {(rooms || []).length === 0 && <p className="text-sm text-slate-400">No rooms yet.</p>}
            </div>
            <div className="mt-3 flex max-w-sm gap-2">
              <input className={INPUT} placeholder="Add a room…" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRoom()} />
              <button onClick={addRoom} className={BTN}>Add</button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {allRooms.map((r) => <span key={r} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-600"><span className="rounded bg-slate-100 px-1 text-xs text-slate-400">{TIER_LABELS[roomTier(r)]}</span>{r}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

/* Insights tab: grade coverage + category balance. */
function CoveragePanel({ classes }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={CARD + " p-4"}>
        <SectionHead icon={GraduationCap} title="Grade coverage" hint="Green where at least one class that day includes that grade." />
        <div className="overflow-x-auto"><div style={{ minWidth: 380 }}>
          <DayHead />
          {GRADES.map((g, gi) => (
            <div key={g} className="grid border-t border-slate-100" style={{ gridTemplateColumns: "150px repeat(5, minmax(0, 1fr))" }}>
              <div className="flex items-center py-2 pr-2 text-sm font-medium text-slate-600">Grade {g}</div>
              {DAYS.map((day) => {
                const ok = classes.some((c) => { const [gf, gt] = gradeRange(c); return c.day === day && gf != null && gt != null && gi >= gf && gi <= gt; });
                return (
                  <div key={day} className="flex items-center justify-center border-l border-slate-100 py-2">
                    {ok ? <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={12} /></span>
                        : <span className="grid h-5 w-5 place-items-center rounded-full bg-red-50 text-xs text-red-300">·</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div></div>
      </div>

      <div className={CARD + " p-4"}>
        <SectionHead icon={Scale} title="Category balance" hint="Classes per category each day, with the week's total. Zeros flag thin spots." />
        <div className="overflow-x-auto"><div style={{ minWidth: 420 }}>
          <DayHead extra=" 64px" />
          {CATS.map((cat) => {
            const total = classes.filter((c) => c.type === cat).length;
            return (
              <div key={cat} className="grid border-t border-slate-100" style={{ gridTemplateColumns: "150px repeat(5, minmax(0, 1fr)) 64px" }}>
                <div className="flex items-center gap-2 py-2 pr-2"><span className={`h-2.5 w-2.5 rounded-full ${cs(cat).dot}`} /><span className="text-sm font-medium text-slate-600">{CAT_LABEL[cat]}</span></div>
                {DAYS.map((day) => {
                  const n = classes.filter((c) => c.type === cat && c.day === day).length;
                  return <div key={day} className="flex items-center justify-center border-l border-slate-100 py-2 text-sm">{n > 0 ? <span className="font-medium text-slate-700">{n}</span> : <span className="text-slate-300">0</span>}</div>;
                })}
                <div className="flex items-center justify-center py-2 text-sm font-semibold text-slate-500">{total}</div>
              </div>
            );
          })}
        </div></div>
      </div>
    </div>
  );
}

/* Feedback tab (signed-in only): parent feedback per class — vendor, season, rating, comments. */
function Stars({ rating }) {
  if (rating == null) return <span className="text-xs text-slate-400">no rating</span>;
  return (
    <span className="inline-flex items-center gap-0.5" title={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} className={i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}
      <span className="ml-1 text-xs font-semibold text-slate-600">{rating.toFixed(1)}</span>
    </span>
  );
}
function FeedbackCard({ f }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={CARD + " p-4"}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-slate-800">{f.name}</span>
        <Stars rating={f.rating} />
        <span className="text-xs text-slate-400">{f.responses} response{f.responses === 1 ? "" : "s"}</span>
        {f.wouldRepeat != null && <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">{f.wouldRepeat}% would repeat</span>}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Store size={12} /> {f.vendor || "vendor not recorded"}</span>
        <span className="flex items-center gap-1"><History size={12} /> {f.seasons.join(", ")}</span>
      </div>
      {f.comments.length > 0 && (
        <>
          <button onClick={() => setOpen((o) => !o)} className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            <MessageSquare size={12} /> {f.comments.length} comment{f.comments.length === 1 ? "" : "s"} <ChevronDown size={12} className={open ? "rotate-180 transition" : "transition"} />
          </button>
          {open && (
            <ul className="mt-2 space-y-2 border-t border-slate-100 pt-2">
              {f.comments.map((c, i) => (
                <li key={i} className="text-sm text-slate-600">
                  <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{c.season}{c.rating ? ` · ★${c.rating}` : ""}</span>
                  “{c.text}”
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
function FeedbackView() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);   // null = loading
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabaseEnabled) { setRows([]); return; }
      const { data, error } = await supabase.from("class_feedback").select("*").order("rating", { ascending: false });
      if (!alive) return;
      if (error) { setErr(error.message); setRows([]); }
      else setRows((data || []).map((r) => ({ ...r, wouldRepeat: r.would_repeat, comments: r.comments || [] })));
    })();
    return () => { alive = false; };
  }, []);

  const ql = q.trim().toLowerCase();
  const list = rows || [];
  const shown = list.filter((f) => !ql || f.name.toLowerCase().includes(ql) || (f.vendor || "").toLowerCase().includes(ql) || (f.comments || []).some((c) => (c.text || "").toLowerCase().includes(ql)));

  return (
    <div className="space-y-4">
      <div className={CARD + " p-4"}>
        <SectionHead icon={MessageSquare} title="Parent feedback by class" hint="From the Fall 2025 and Winter 2026 family surveys. Private to signed-in staff; parent names and contact details removed." />
        <div className="relative max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
          <input className={INPUT + " pl-9"} placeholder="Search class, vendor, or a comment…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {rows === null && <p className="py-10 text-center text-slate-400">Loading feedback…</p>}
      {err && <div className={CARD + " p-4 text-sm text-red-600"}>Couldn't load feedback: {err}</div>}
      {rows !== null && !err && list.length === 0 && (
        <div className={CARD + " p-4 text-sm text-slate-500"}>
          No feedback loaded yet. Run the one-time <code className="rounded bg-slate-100 px-1">feedback_seed.sql</code> in your Supabase SQL editor to populate the private staff-only table.
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((f) => <FeedbackCard key={f.id ?? f.name} f={f} />)}
      </div>
      {rows !== null && list.length > 0 && shown.length === 0 && <p className="py-10 text-center text-slate-400">No feedback matches “{q}”.</p>}
    </div>
  );
}

/* ---------------- vendors ---------------- */

function VendorRow({ v, first, onUpdate, onRemove, onPromote }) {
  const toggleDay = (d) => {
    const has = v.preferredDays.includes(d);
    onUpdate({ ...v, preferredDays: has ? v.preferredDays.filter((x) => x !== d) : [...v.preferredDays, d] });
  };
  const sugg = suggestVendor(v.name);
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2">
        {first ? <Star size={14} className="shrink-0 fill-amber-400 text-amber-400" title="First choice" />
          : <button onClick={onPromote} title="Make first choice" className="shrink-0 rounded p-0.5 text-slate-300 hover:text-amber-500"><ArrowUp size={14} /></button>}
        <input className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-slate-800 focus:border-indigo-300 focus:outline-none" value={v.name} onChange={(e) => onUpdate({ ...v, name: e.target.value })} />
        <select value={v.status} onChange={(e) => onUpdate({ ...v, status: e.target.value })} className={`rounded-lg px-2 py-1 text-xs font-medium ${V_STATUS[v.status].cls}`}>{V_ORDER.map((s) => <option key={s} value={s}>{V_STATUS[s].label}</option>)}</select>
        <button onClick={onRemove} className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
      </div>
      {sugg && <div className="mt-1 pl-6 text-xs text-slate-500">Did you mean <button onClick={() => onUpdate({ ...v, name: sugg })} className="font-medium text-indigo-600 underline">{sugg}</button>?</div>}
      <div className="mt-2 flex flex-wrap items-center gap-1 pl-6">
        <span className="text-xs text-slate-400">Prefers:</span>
        {DAYS.map((d) => <button key={d} onClick={() => toggleDay(d)} className={`rounded px-1.5 py-0.5 text-xs ${v.preferredDays.includes(d) ? "bg-indigo-100 text-indigo-700" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>{d}</button>)}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
        <input className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none" placeholder="Contact (email / phone)" value={v.contact} onChange={(e) => onUpdate({ ...v, contact: e.target.value })} />
        <input className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none" placeholder="Notes" value={v.notes} onChange={(e) => onUpdate({ ...v, notes: e.target.value })} />
      </div>
    </div>
  );
}

function VendorClassBlock({ c, onClassVendors, show }) {
  const upd = (vid, next) => onClassVendors(c.id, c.vendors.map((v) => (v.id === vid ? next : v)));
  const rm = (vid) => onClassVendors(c.id, c.vendors.filter((v) => v.id !== vid));
  const add = () => onClassVendors(c.id, [...(c.vendors || []), { id: genId(), name: "", status: "to_contact", preferredDays: [], contact: "", notes: "" }]);
  const promote = (vid) => { const v = c.vendors.find((x) => x.id === vid); onClassVendors(c.id, [v, ...c.vendors.filter((x) => x.id !== vid)]); };
  const fc = firstChoice(c);
  const firstId = (c.vendors || [])[0]?.id;
  const shown = (c.vendors || []).filter((v) => show.has(v.status));
  return (
    <div className={CARD + " p-4"}>
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${cs(c.type).dot}`} />
        <span className="font-semibold text-slate-800">{c.name}</span>
        <span className="text-xs text-slate-400">{CAT_LABEL[c.type]} · {gradeText(c)} · {c.day}</span>
        <StatusBadge status={c.status} />
        {fc && <span className="ml-auto text-xs text-slate-500">1st choice: <span className="font-medium text-slate-700">{fc.name}</span></span>}
      </div>
      <div className="mt-3 space-y-2">
        {shown.map((v) => <VendorRow key={v.id} v={v} first={v.id === firstId} onUpdate={(n) => upd(v.id, n)} onRemove={() => rm(v.id)} onPromote={() => promote(v.id)} />)}
        {shown.length === 0 && <p className="text-xs text-slate-400">{(c.vendors || []).length ? "No vendors match the filter." : "No vendors yet."}</p>}
      </div>
      <button onClick={add} className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"><Plus size={13} /> Add candidate vendor</button>
    </div>
  );
}

function VendorsView({ classes, onClassVendors, onEdit }) {
  const [show, setShow] = useState(() => new Set(V_ORDER));
  const toggle = (s) => setShow((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const needsSourcing = classes.filter((c) => (c.vendors || []).length === 0);
  const withVendors = classes.filter((c) => (c.vendors || []).length > 0);
  return (
    <div className="space-y-4">
      <div className={CARD + " flex flex-wrap items-center gap-2 p-3"}>
        <span className="text-xs font-medium text-slate-500">Show:</span>
        {V_ORDER.map((s) => (
          <button key={s} onClick={() => toggle(s)} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${show.has(s) ? V_STATUS[s].cls + " border-transparent" : "border-slate-200 text-slate-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${show.has(s) ? V_STATUS[s].dot : "bg-slate-300"}`} />{V_STATUS[s].label}
          </button>
        ))}
        <button onClick={() => setShow(new Set(["responded", "agreed"]))} className="ml-auto text-xs font-medium text-indigo-600 hover:text-indigo-700">Responded &amp; agreed only</button>
      </div>
      {needsSourcing.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle size={15} /> {needsSourcing.length} class{needsSourcing.length > 1 ? "es" : ""} still need a vendor</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {needsSourcing.map((c) => <button key={c.id} onClick={() => onEdit(c)} className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-amber-300"><span className={`h-2 w-2 rounded-full ${cs(c.type).dot}`} /> {c.name} <ChevronRight size={12} className="text-slate-300" /></button>)}
          </div>
        </div>
      )}
      {withVendors.map((c) => <VendorClassBlock key={c.id} c={c} onClassVendors={onClassVendors} show={show} />)}
      {needsSourcing.map((c) => <VendorClassBlock key={c.id} c={c} onClassVendors={onClassVendors} show={show} />)}
      {classes.length === 0 && <p className="py-12 text-center text-slate-400">Add classes on the Plan tab, then line up vendors here.</p>}
    </div>
  );
}

/* ---------------- season + share ---------------- */

function SeasonView({ classes }) {
  const confirmed = classes.filter((c) => c.status === "confirmed");
  const pending = classes.filter((c) => c.status !== "confirmed");
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Confirmed for the season ({confirmed.length})</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {confirmed.map((c) => {
            const fc = firstChoice(c);
            return (
              <div key={c.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${cs(c.type).dot}`} /><span className="font-semibold text-slate-800">{c.name}</span><span className="ml-auto text-xs text-slate-500">{c.day} · {fmtTime(c.start)}</span></div>
                <p className="mt-1 pl-4 text-xs text-slate-500">{gradeText(c)} · {c.room || "no room"}{fc ? ` · ${fc.name}` : ""}</p>
              </div>
            );
          })}
          {confirmed.length === 0 && <p className="text-sm text-slate-400">Nothing confirmed yet. Hit the ✓ on a card in the Plan to lock it in.</p>}
        </div>
      </div>
      {pending.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-500">Still in planning ({pending.length})</p>
          <div className="flex flex-wrap gap-2">
            {pending.map((c) => <span key={c.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"><span className={`h-2 w-2 rounded-full ${cs(c.type).dot}`} /> {c.name} <StatusBadge status={c.status} /></span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function ClassTable({ rows, showStatus, historical }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
          <th className="py-2 pr-3 font-medium">Day</th>
          <th className="py-2 pr-3 font-medium">Time</th>
          <th className="py-2 pr-3 font-medium">Class</th>
          <th className="py-2 pr-3 font-medium">Type</th>
          <th className="py-2 pr-3 font-medium">Grades</th>
          <th className="py-2 pr-3 font-medium">Room</th>
          {historical && <th className="py-2 pr-3 font-medium">Instructor</th>}
          <th className="py-2 pr-3 font-medium">Vendor</th>
          {historical && <th className="py-2 pr-3 font-medium">Enrolled</th>}
          {historical && <th className="py-2 pr-3 font-medium">Outcome</th>}
          {historical && <th className="py-2 font-medium">Feedback</th>}
          {showStatus && <th className="py-2 font-medium">Status</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => {
          const fc = firstChoice(c);
          const cancelled = c.outcome === "Cancelled";
          return (
            <tr key={c.id} className="border-b border-slate-50" style={cancelled ? { opacity: 0.6 } : undefined}>
              <td className="py-2 pr-3 font-medium text-slate-700">{c.day}</td>
              <td className="py-2 pr-3 text-slate-500">{fmtTime(c.start)}</td>
              <td className="py-2 pr-3 font-medium text-slate-800">{c.name}</td>
              <td className="py-2 pr-3"><span className="inline-flex items-center gap-1 text-slate-500"><span className={`h-2 w-2 rounded-full ${cs(c.type).dot}`} />{CAT_LABEL[c.type]}</span></td>
              <td className="py-2 pr-3 text-slate-500">{gradeText(c)}</td>
              <td className="py-2 pr-3 text-slate-500">{c.room || "TBD"}</td>
              {historical && <td className="py-2 pr-3 text-slate-500">{c.instructor || "—"}</td>}
              <td className="py-2 pr-3 text-slate-500">{fc ? fc.name : "—"}</td>
              {historical && <td className="py-2 pr-3 text-slate-500">{c.capacity ? `${c.enrolled}/${c.capacity}` : "—"}</td>}
              {historical && <td className="py-2 pr-3"><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cancelled ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>{c.outcome}</span></td>}
              {historical && <td className="py-2 pr-3 text-slate-500">{c.feedback || "—"}</td>}
              {showStatus && <td className="py-2"><StatusBadge status={c.status} /></td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ShareView({ classes, seasonName }) {
  const [mode, setMode] = useState("proposed");
  const [copied, setCopied] = useState(false);
  const rows = mode === "principal" ? classes.filter((c) => c.status === "confirmed") : classes.filter((c) => c.status !== "idea");
  const ordered = [...rows].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || (a.start || "").localeCompare(b.start || ""));
  const asText = () => {
    const title = mode === "principal" ? `${seasonName} — Confirmed Enrichment Classes` : `${seasonName} — Proposed Enrichment Schedule (for review)`;
    return `${title}\n\n` + ordered.map((c) => {
      const fc = firstChoice(c);
      return `${c.day}  ${fmtTime(c.start)}  ${c.name} (${CAT_LABEL[c.type]}, ${gradeText(c)}) — ${c.room || "TBD"}${fc ? ` — ${fc.name}` : ""} [${STATUS[c.status].label}]`;
    }).join("\n");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(asText()); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch (_) { window.prompt("Copy the text below:", asText()); }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          <button onClick={() => setMode("proposed")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mode === "proposed" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>Proposed schedule</button>
          <button onClick={() => setMode("principal")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mode === "principal" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>Principal roster</button>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={copy} className={BTN_GHOST}><Copy size={14} /> {copied ? "Copied!" : "Copy as text"}</button>
          <button onClick={() => window.print()} className={BTN_GHOST}><Printer size={14} /> Print</button>
        </div>
      </div>
      <div className={CARD + " p-5"}>
        <h3 className="text-lg font-bold text-slate-900">{seasonName} — {mode === "principal" ? "Confirmed Enrichment Classes" : "Proposed Enrichment Schedule"}</h3>
        <p className="mb-4 text-xs text-slate-400">{mode === "principal" ? "Locked in for the season." : "Draft for review — subject to vendor confirmation."}</p>
        <div className="overflow-x-auto"><ClassTable rows={ordered} showStatus={mode === "proposed"} /></div>
        {ordered.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nothing to show yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- historical (read-only) ---------------- */

function HistoricalSeason({ season }) {
  const cls = season.classes;
  const completed = cls.filter((c) => c.outcome === "Completed");
  const cancelled = cls.filter((c) => c.outcome === "Cancelled");
  const enrolled = completed.reduce((a, c) => a + (c.enrolled || 0), 0);
  const cap = completed.reduce((a, c) => a + (c.capacity || 0), 0);
  const fill = cap ? Math.round((enrolled / cap) * 100) : 0;
  const ordered = [...cls].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || (a.start || "").localeCompare(b.start || ""));
  const Stat = ({ label, value }) => (
    <div className={CARD + " px-4 py-3"}>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
        {season.yearLong ? <Music size={15} /> : <History size={15} />} {season.yearLong ? "Year-round music program — read only." : "Historical season — read only."}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Classes offered" value={cls.length} />
        <Stat label="Completed" value={completed.length} />
        <Stat label="Cancelled" value={cancelled.length} />
        <Stat label="Seats filled" value={`${fill}%`} />
      </div>
      <div className={CARD + " p-4"}><PlanBoard classes={cls} readOnly /></div>
      <div className={CARD + " p-5"}>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">All classes</h3>
        <div className="overflow-x-auto"><ClassTable rows={ordered} historical /></div>
      </div>
    </div>
  );
}

/* ---------------- main ---------------- */

export default function EnrichmentBoard() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseEnabled);
  const [data, setData] = useState(supabaseEnabled ? null : loadLocal);
  const [tab, setTab] = useState("plan");
  const [dragId, setDragId] = useState(null);
  const [form, setForm] = useState(null);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef(null);
  const dataRef = useRef(data);
  const loadedUid = useRef("__init__");
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load cloud data only when the signed-in identity actually changes (initial, sign-in,
  // sign-out) — NOT on token refresh, which fires when the tab regains focus and would
  // otherwise discard in-progress edits.
  useEffect(() => {
    if (!supabaseEnabled || !authReady) return;
    const uid = session?.user?.id || "anon";
    if (loadedUid.current === uid) return;
    loadedUid.current = uid;
    let cancelled = false;
    setData(null);
    cloudLoad(!!session).then((d) => { if (!cancelled) setData(d); }).catch(() => { if (!cancelled) setData(combine(newEditableSeasons(), null)); });
    return () => { cancelled = true; };
  }, [authReady, session]);

  // Save (only when signed in), debounced.
  useEffect(() => {
    if (!data) return;
    if (!supabaseEnabled) { persistLocal(data); return; }
    if (session) { clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => { cloudSave(data).catch(() => {}); }, 700); }
  }, [data]);

  // Flush a save immediately when the tab is hidden, so nothing is lost on tab switch.
  useEffect(() => {
    if (!supabaseEnabled) return;
    const flush = () => { if (document.visibilityState === "hidden" && session && dataRef.current) cloudSave(dataRef.current).catch(() => {}); };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [session]);

  const sendLink = async () => {
    if (!email.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) alert(error.message); else setLinkSent(true);
  };
  const signOut = async () => { await supabase.auth.signOut(); setLinkSent(false); setEmail(""); };

  if (supabaseEnabled && !authReady) return <div className="flex h-64 items-center justify-center text-slate-400">Connecting…</div>;
  if (!data) return <div className="flex h-64 items-center justify-center text-slate-400">Syncing…</div>;

  const editableSeasons = data.seasons.filter((s) => s.editable);
  const firstEditable = editableSeasons[0];
  const season = data.seasons.find((s) => s.id === data.activeSeasonId) || firstEditable || data.seasons[data.seasons.length - 1];
  const isCurrent = season.editable;
  const canEdit = isCurrent && (!supabaseEnabled || !!session);

  // Music is a single source of truth (the music-planning season). It shows on its own
  // page AND merges into the enrichment board's Music row, so cards stay in sync.
  const musicSeason = data.seasons.find((s) => s.editable && s.kind === "music");
  const musicIds = new Set((musicSeason?.classes || []).map((c) => c.id));
  const mergeMusic = isCurrent && season.kind !== "music" && musicSeason;
  const classes = mergeMusic ? [...season.classes, ...musicSeason.classes] : season.classes;
  const ownerId = (id) => (musicSeason && musicIds.has(id) ? musicSeason.id : season.id);

  const conflicts = roomConflicts(classes);
  const conflictIds = new Set();
  conflicts.forEach(([a, b]) => { conflictIds.add(a.id); conflictIds.add(b.id); });

  const updateSeason = (sid, updater) => setData((d) => ({ ...d, seasons: d.seasons.map((s) => (s.id === sid ? { ...s, classes: updater(s.classes) } : s)) }));
  const upsert = (c) => {
    if (c.id) updateSeason(ownerId(c.id), (list) => list.map((x) => (x.id === c.id ? c : x)));
    else { const sid = c.type === "Music" && musicSeason ? musicSeason.id : season.id; updateSeason(sid, (list) => [...list, { ...c, id: genId() }]); }
    setForm(null);
  };
  const remove = (id) => { if (window.confirm("Delete this class?")) updateSeason(ownerId(id), (list) => list.filter((x) => x.id !== id)); };
  const toggleConfirm = (id) => updateSeason(ownerId(id), (list) => list.map((c) => (c.id === id ? { ...c, status: c.status === "confirmed" ? "proposed" : "confirmed" } : c)));
  const setClassVendors = (id, vendors) => updateSeason(ownerId(id), (list) => list.map((c) => (c.id === id ? { ...c, vendors } : c)));
  const setSeasonRooms = (rooms) => setData((d) => ({ ...d, seasons: d.seasons.map((s) => (s.id === season.id ? { ...s, rooms } : s)) }));
  const renameRoom = (oldName, newName) => {
    const nn = newName.trim(); if (!nn) return;
    setData((d) => ({ ...d, seasons: d.seasons.map((s) => {
      if (s.id !== season.id) return s;
      const rooms = uniq((s.rooms || []).map((r) => (r === oldName ? nn : r)));
      const cls = s.classes.map((c) => (sameRoom(c.room, oldName) ? { ...c, room: nn } : c));
      return { ...s, rooms, classes: cls };
    }) }));
  };
  const dropCell = (day, type) => {
    if (!dragId) { setDragId(null); return; }
    if (musicIds.has(dragId)) updateSeason(musicSeason.id, (list) => list.map((c) => (c.id === dragId ? { ...c, day } : c)));  // music stays Music
    else if (type !== "Music") updateSeason(season.id, (list) => list.map((c) => (c.id === dragId ? { ...c, day, type } : c)));
    setDragId(null);
  };
  const blank = (day, type) => ({ name: "", type: type || "Art", gradeFrom: 0, gradeTo: 5, day: day || "Mon", start: "16:00", end: "17:00", room: "", status: "proposed", vendors: [] });
  const addToCell = (day, type) => setForm(blank(day, type));

  const needVendor = canEdit ? classes.filter((c) => (c.vendors || []).length === 0).length : 0;
  const roomsForForm = uniq([...(season.rooms || []), ...(mergeMusic ? (musicSeason.rooms || []) : [])]);

  const TabBtn = ({ id, icon: Icon, label, badge }) => (
    <button onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${tab === id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
      <Icon size={15} /> {label}
      {badge > 0 && <span className={`rounded-full px-1.5 text-xs ${tab === id ? "bg-indigo-500 text-white" : "bg-amber-100 text-amber-700"}`}>{badge}</span>}
    </button>
  );

  const signInBar = (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
      <Lock size={16} className="shrink-0 text-indigo-600" />
      <span className="text-sm text-indigo-900">You're viewing this season read-only. Sign in to plan and edit.</span>
      <div className="ml-auto flex items-center gap-2">
        {linkSent ? <span className="text-sm text-emerald-700">Check your email for the link.</span> : (
          <>
            <input className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:outline-none" type="email" placeholder="you@school.org" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendLink()} />
            <button onClick={sendLink} disabled={busy} className={BTN + " py-1.5"}>{busy ? "Sending…" : "Sign in"}</button>
          </>
        )}
      </div>
    </div>
  );

  const subtitle = isCurrent
    ? (season.kind === "music" ? "Planning the year-round music program" : "Planning the upcoming enrichment season")
    : "Mann Elementary · read-only record";

  return (
    <div className="min-h-screen text-slate-800" style={{ background: "linear-gradient(180deg,#F7F8FC 0%,#EEF1F8 100%)" }}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm"><LayoutGrid size={20} /></span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Enrichment Planning Board</h1>
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                {subtitle}
                {supabaseEnabled && session && isCurrent && <span className="flex items-center gap-1 text-emerald-600"><Cloud size={13} /> synced</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={data.activeSeasonId} onChange={(e) => { setData((d) => ({ ...d, activeSeasonId: e.target.value })); setTab("plan"); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none">
              <optgroup label="Planning">
                {data.seasons.filter((s) => s.editable).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
              <optgroup label="History">
                {data.seasons.filter((s) => !s.editable).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            </select>
            {supabaseEnabled && (session
              ? <button onClick={signOut} title={session.user?.email} className={BTN_GHOST}><LogOut size={15} /> Sign out</button>
              : <button onClick={() => firstEditable && setData((d) => ({ ...d, activeSeasonId: firstEditable.id }))} className={BTN}><Lock size={15} /> Staff sign-in</button>)}
          </div>
        </header>

        {!isCurrent ? (
          <HistoricalSeason season={season} />
        ) : canEdit ? (
          <>
            <div className="mb-5 inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <TabBtn id="plan" icon={LayoutGrid} label="Plan" badge={conflicts.length} />
              <TabBtn id="rooms" icon={DoorOpen} label="Rooms" badge={conflicts.length} />
              <TabBtn id="insights" icon={Scale} label="Insights" />
              <TabBtn id="vendors" icon={Store} label="Vendors" badge={needVendor} />
              <TabBtn id="feedback" icon={MessageSquare} label="Feedback" />
              <TabBtn id="season" icon={CheckCircle2} label="Season" />
              <TabBtn id="share" icon={Share2} label="Share" />
            </div>
            {tab === "plan" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    {conflicts.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"><AlertTriangle size={15} /> {conflicts.length} room conflict{conflicts.length > 1 ? "s" : ""} — see the Rooms tab</span>
                    )}
                  </div>
                  <button onClick={() => setForm(blank())} className={BTN}><Plus size={15} /> Add class</button>
                </div>
                <div className={CARD + " p-4"}>
                  {classes.length === 0 && <p className="mb-2 text-center text-sm text-slate-400">Empty season — add classes into the day / activity cells below to start planning.</p>}
                  <PlanBoard classes={classes} conflictIds={conflictIds} setDragId={setDragId} onDropCell={dropCell} onAdd={addToCell} onEdit={setForm} onDelete={remove} onToggleConfirm={toggleConfirm} />
                  {mergeMusic && <p className="mt-2 text-xs text-slate-400">The Music row is shared with the Music 2026–27 season — edits sync to both.</p>}
                </div>
              </div>
            )}
            {tab === "rooms" && <RoomsView classes={classes} rooms={season.rooms || []} onRooms={setSeasonRooms} onRename={renameRoom} canEdit />}
            {tab === "insights" && <CoveragePanel classes={classes} />}
            {tab === "vendors" && <VendorsView classes={classes} onClassVendors={setClassVendors} onEdit={setForm} />}
            {tab === "feedback" && <FeedbackView />}
            {tab === "season" && <SeasonView classes={classes} />}
            {tab === "share" && <ShareView classes={classes} seasonName={season.name} />}
          </>
        ) : (
          <>
            <div className="mb-4">{signInBar}</div>
            <div className="mb-5 inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <TabBtn id="plan" icon={LayoutGrid} label="Plan" />
              <TabBtn id="rooms" icon={DoorOpen} label="Rooms" />
              <TabBtn id="insights" icon={Scale} label="Insights" />
            </div>
            {tab === "vendors" || tab === "feedback" || tab === "season" || tab === "share" ? <p className="text-sm text-slate-400">Sign in to view this.</p> : null}
            {tab === "plan" && (
              <div className={CARD + " p-4"}>
                {classes.length === 0 && <p className="mb-2 text-center text-sm text-slate-400">This season doesn't have any classes yet.</p>}
                <PlanBoard classes={classes} readOnly />
              </div>
            )}
            {tab === "rooms" && <RoomsView classes={classes} rooms={season.rooms || []} onRooms={() => {}} onRename={() => {}} canEdit={false} />}
            {tab === "insights" && <CoveragePanel classes={classes} />}
          </>
        )}
      </div>

      {form && <ClassForm initial={form} onSave={upsert} onClose={() => setForm(null)} rooms={roomsForForm.length ? roomsForForm : KNOWN_ROOMS} />}
    </div>
  );
}
