import { useState, useEffect, useRef } from "react";
import {
  LayoutGrid, Store, CheckCircle2, Share2, Plus, Pencil, Trash2, X,
  Check, Clock, MapPin, AlertTriangle, ArrowUp, Printer, Copy, Star,
  ChevronRight, History, User, Lock, LogOut, Cloud, Music,
} from "lucide-react";
import { HISTORICAL_RAW } from "./historicalSeasons.js";
import { supabase, supabaseEnabled } from "./supabaseClient.js";

/* ---------------- constants ---------------- */

const LKEY = "enrichment-board-v2";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const CATS = ["STEM", "Art", "Movement", "Academic"];
const CAT_LABEL = { STEM: "STEM / Chess", Art: "Art", Movement: "Movement", Academic: "Academic" };
const BALANCE = ["Art", "STEM", "Movement"];
const GRADES = ["K", "1", "2", "3", "4", "5"];

const CAT_STYLE = {
  STEM:     { bar: "bg-blue-500",    dot: "bg-blue-500",    soft: "bg-blue-50 text-blue-700 border-blue-200" },
  Art:      { bar: "bg-rose-500",    dot: "bg-rose-500",    soft: "bg-rose-50 text-rose-700 border-rose-200" },
  Movement: { bar: "bg-emerald-500", dot: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Academic: { bar: "bg-violet-500",  dot: "bg-violet-500",  soft: "bg-violet-50 text-violet-700 border-violet-200" },
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
  const g = (x) => (x.toUpperCase() === "K" ? 0 : /^[0-5]$/.test(x) ? Number(x) : null);
  const m = b.replace(/\s/g, "").match(/^([Kk0-5])-([Kk0-5])$/);
  if (m) return [g(m[1]), g(m[2])];
  const one = g(b.trim());
  return one == null ? [null, null] : [one, one];
}
function gradeText(c) {
  const f = c.gradeFrom, t = c.gradeTo;
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
    if (k === raw) return null; // already exact
    const kn = normV(k);
    let sc;
    if (kn === n) sc = 1;
    else if (kn.includes(n) || n.includes(kn)) sc = 0.88;
    else sc = 1 - lev(n, kn) / Math.max(n.length, kn.length);
    if (sc > score) { score = sc; best = k; }
  }
  return score >= 0.72 ? best : null;
}

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
const newEditableSeason = () => ({ id: genId(), name: "Fall 2026", editable: true, classes: [] });
const editableOf = (d) => d.seasons.filter((s) => s.editable);

function combine(editableSeasons, activeSeasonId) {
  const seasons = [...historicalSeasons(), ...editableSeasons];
  if (!seasons.find((s) => s.id === activeSeasonId)) activeSeasonId = editableSeasons[0]?.id || seasons[0].id;
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
  return combine([newEditableSeason()], null);
}
function persistLocal(d) {
  try { localStorage.setItem(LKEY, JSON.stringify({ editableSeasons: editableOf(d), activeSeasonId: d.activeSeasonId })); } catch (_) {}
}
async function cloudLoad(canWrite) {
  const { data: row } = await supabase.from("board_state").select("data").eq("id", "main").maybeSingle();
  if (row && row.data && Array.isArray(row.data.editableSeasons) && row.data.editableSeasons.length) {
    return combine(row.data.editableSeasons, row.data.activeSeasonId);
  }
  const ed = newEditableSeason();
  if (canWrite) await supabase.from("board_state").upsert({ id: "main", data: { editableSeasons: [ed], activeSeasonId: ed.id } });
  return combine([ed], ed.id);
}
async function cloudSave(d) {
  await supabase.from("board_state").upsert({ id: "main", data: { editableSeasons: editableOf(d), activeSeasonId: d.activeSeasonId }, updated_at: new Date().toISOString() });
}

/* ---------------- atoms ---------------- */

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";
const Field = ({ label, children }) => (
  <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>
);
const StatusBadge = ({ status }) => {
  const s = STATUS[status] ?? STATUS.idea;
  return <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
};
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4" style={{ backgroundColor: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className={`mt-8 w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl bg-white shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- catalog picker + class form ---------------- */

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
      <input className={inputCls + " bg-white"} placeholder="Search past classes or vendors…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {rows.map((e) => (
          <button key={e.key} onClick={() => onPick(e)} className="flex w-full items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 text-left hover:border-blue-300 hover:bg-blue-50">
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

function ClassForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial);
  const [note, setNote] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.name.trim() && f.gradeTo >= f.gradeFrom && (!f.end || !f.start || f.end > f.start);
  const pick = (e) => {
    setF((p) => ({ ...p, name: e.name, type: e.type, gradeFrom: e.gradeFrom ?? 0, gradeTo: e.gradeTo ?? 5,
      vendors: e.vendors.map((n) => ({ id: genId(), name: n, status: "to_contact", preferredDays: [], contact: "", notes: "" })) }));
    setNote(e.vendors.length
      ? `Loaded “${e.name}” — ${e.vendors.length} past vendor${e.vendors.length > 1 ? "s" : ""} added as candidate${e.vendors.length > 1 ? "s" : ""} to contact. Set the day, time, and room below.`
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
        <div className="col-span-2"><Field label="Class name"><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Watercolor Painting" /></Field></div>
        <Field label="Activity type"><select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}>{CATS.map((t) => <option key={t} value={t}>{CAT_LABEL[t]}</option>)}</select></Field>
        <Field label="Day"><select className={inputCls} value={f.day} onChange={(e) => set("day", e.target.value)}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Grade from"><select className={inputCls} value={f.gradeFrom} onChange={(e) => set("gradeFrom", Number(e.target.value))}>{GRADES.map((g, i) => <option key={g} value={i}>{g}</option>)}</select></Field>
        <Field label="Grade to"><select className={inputCls} value={f.gradeTo} onChange={(e) => set("gradeTo", Number(e.target.value))}>{GRADES.map((g, i) => <option key={g} value={i}>{g}</option>)}</select></Field>
        <Field label="Start time"><input type="time" className={inputCls} value={f.start} onChange={(e) => set("start", e.target.value)} /></Field>
        <Field label="End time"><input type="time" className={inputCls} value={f.end} onChange={(e) => set("end", e.target.value)} /></Field>
        <Field label="Room"><input className={inputCls} value={f.room} onChange={(e) => set("room", e.target.value)} placeholder="e.g. Art Room" /></Field>
        <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.keys(STATUS).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}</select></Field>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">Vendors</span>
          <button onClick={vAdd} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"><Plus size={12} /> Add vendor</button>
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
                  <input className={inputCls + " flex-1"} placeholder="Vendor name" value={v.name} onChange={(e) => vUpd(v.id, { ...v, name: e.target.value })} />
                  <select value={v.status} onChange={(e) => vUpd(v.id, { ...v, status: e.target.value })} className={`shrink-0 rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium ${V_STATUS[v.status].cls}`}>{V_ORDER.map((s) => <option key={s} value={s}>{V_STATUS[s].label}</option>)}</select>
                  <button onClick={() => vRm(v.id)} className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                {sugg && <div className="mt-0.5 pl-6 text-xs text-slate-500">Did you mean <button onClick={() => vUpd(v.id, { ...v, name: sugg })} className="font-medium text-blue-600 underline">{sugg}</button>?</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button disabled={!valid} onClick={() => onSave({ ...f, name: f.name.trim() })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">{f.id ? "Save changes" : "Add class"}</button>
      </div>
    </Modal>
  );
}

/* ---------------- cards ---------------- */

function EditableCard({ cls, onEdit, onDelete, onToggleConfirm, onDrag }) {
  const fc = firstChoice(cls);
  return (
    <div draggable onDragStart={() => onDrag(cls.id)} className="cursor-grab rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm active:cursor-grabbing">
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold leading-tight text-slate-800">{cls.name}</span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button onClick={() => onToggleConfirm(cls.id)} title={cls.status === "confirmed" ? "Un-confirm" : "Confirm for season"} className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"><Check size={13} /></button>
          <button onClick={() => onEdit(cls)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><Pencil size={13} /></button>
          <button onClick={() => onDelete(cls.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{gradeText(cls)}</span>
        <StatusBadge status={cls.status} />
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(cls.start)}</span>
        {cls.room && <span className="flex items-center gap-1"><MapPin size={11} />{cls.room}</span>}
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
    <div className={`rounded-lg border p-2.5 ${cancelled ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`} style={cancelled ? { opacity: 0.65 } : undefined}>
      <div className="flex items-start justify-between gap-1">
        <span className={`text-sm font-semibold leading-tight text-slate-800 ${cancelled ? "line-through" : ""}`}>{cls.name}</span>
        {cancelled && <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">Cancelled</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-400">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{gradeText(cls)}</span>
        <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(cls.start)}</span>
        {cls.room && <span className="flex items-center gap-1"><MapPin size={11} />{cls.room}</span>}
      </div>
      {cls.instructor && <div className="mt-1 flex items-center gap-1 text-xs text-slate-400"><User size={11} />{cls.instructor}</div>}
      <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-50 pt-1.5 text-xs">
        <span className="truncate text-slate-600">{fc ? fc.name : "—"}</span>
        {!cancelled && cls.capacity > 0 && <span className="ml-auto shrink-0 text-slate-400">{cls.enrolled}/{cls.capacity} enrolled</span>}
      </div>
      {cls.feedback && <div className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{cls.feedback}</div>}
    </div>
  );
}

function ReferenceCard({ cls }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2">
      <div className="flex items-center gap-1">
        <Music size={11} className="shrink-0 text-slate-400" />
        <span className="text-sm font-medium text-slate-600">{cls.name}</span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span>{gradeText(cls)}</span>
        {cls.start && <span className="flex items-center gap-1"><Clock size={10} />{fmtTime(cls.start)}</span>}
        {cls.room && <span className="flex items-center gap-1"><MapPin size={10} />{cls.room}</span>}
      </div>
      <div className="mt-0.5 text-xs font-medium text-slate-400">year-round music</div>
    </div>
  );
}

/* ---------------- plan board ---------------- */

function PlanBoard({ classes, readOnly, reference, setDragId, onDropCell, onAdd, onEdit, onDelete, onToggleConfirm }) {
  const [over, setOver] = useState(null);
  const cell = (day, type) => classes.filter((c) => c.day === day && c.type === type);
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 900 }}>
        <div className="grid" style={{ gridTemplateColumns: "120px repeat(5, 1fr)" }}>
          <div />
          {DAYS.map((d) => {
            const have = new Set([...classes, ...(reference || [])].filter((c) => c.day === d).map((c) => c.type));
            return (
              <div key={d} className="px-1 pb-2 text-center">
                <div className="text-sm font-semibold text-slate-700">{d}</div>
                <div className="mt-1 flex justify-center gap-1">
                  {BALANCE.map((t) => <span key={t} title={CAT_LABEL[t]} className={`h-1.5 w-1.5 rounded-full ${have.has(t) ? cs(t).bar : "bg-slate-200"}`} />)}
                </div>
              </div>
            );
          })}
        </div>
        {CATS.map((type) => (
          <div key={type} className="grid border-t border-slate-100" style={{ gridTemplateColumns: "120px repeat(5, 1fr)" }}>
            <div className="flex items-center gap-2 py-3 pr-2">
              <span className={`h-3 w-1 rounded-full ${cs(type).bar}`} />
              <span className="text-sm font-medium text-slate-600">{CAT_LABEL[type]}</span>
            </div>
            {DAYS.map((day) => {
              const items = cell(day, type);
              const refItems = (reference || []).filter((c) => c.day === day && c.type === type);
              const isOver = over === `${day}-${type}`;
              const dnd = readOnly ? {} : {
                onDragOver: (e) => { e.preventDefault(); setOver(`${day}-${type}`); },
                onDragLeave: () => setOver(null),
                onDrop: () => { onDropCell(day, type); setOver(null); },
              };
              return (
                <div key={day} {...dnd} className={`space-y-1.5 border-l border-slate-100 p-1.5 ${isOver ? "bg-blue-50" : ""}`} style={{ minHeight: 84 }}>
                  {refItems.map((c) => <ReferenceCard key={c.id} cls={c} />)}
                  {items.map((c) => readOnly
                    ? <ReadOnlyCard key={c.id} cls={c} />
                    : <EditableCard key={c.id} cls={c} onEdit={onEdit} onDelete={onDelete} onToggleConfirm={onToggleConfirm} onDrag={setDragId} />)}
                  {!readOnly && (
                    <button onClick={() => onAdd(day, type)} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 py-1.5 text-xs text-slate-400 hover:border-blue-300 hover:text-blue-500"><Plus size={12} /> Add</button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {!readOnly && <p className="mt-3 text-xs text-slate-400">Drag a card to a different day or activity row to rebalance. Dots under each day show whether Art / STEM / Movement is covered.</p>}
    </div>
  );
}

/* ---------------- vendors pipeline ---------------- */

function VendorRow({ v, first, onUpdate, onRemove, onPromote }) {
  const toggleDay = (d) => {
    const has = v.preferredDays.includes(d);
    onUpdate({ ...v, preferredDays: has ? v.preferredDays.filter((x) => x !== d) : [...v.preferredDays, d] });
  };
  const sugg = suggestVendor(v.name);
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2">
        {first ? <Star size={14} className="shrink-0 fill-amber-400 text-amber-400" title="First choice" />
          : <button onClick={onPromote} title="Make first choice" className="shrink-0 rounded p-0.5 text-slate-300 hover:text-amber-500"><ArrowUp size={14} /></button>}
        <input className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm font-medium text-slate-800 focus:border-blue-300 focus:outline-none" value={v.name} onChange={(e) => onUpdate({ ...v, name: e.target.value })} />
        <select value={v.status} onChange={(e) => onUpdate({ ...v, status: e.target.value })} className={`rounded px-2 py-1 text-xs font-medium ${V_STATUS[v.status].cls}`}>{V_ORDER.map((s) => <option key={s} value={s}>{V_STATUS[s].label}</option>)}</select>
        <button onClick={onRemove} className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
      </div>
      {sugg && <div className="mt-1 pl-6 text-xs text-slate-500">Did you mean <button onClick={() => onUpdate({ ...v, name: sugg })} className="font-medium text-blue-600 underline">{sugg}</button>?</div>}
      <div className="mt-2 flex flex-wrap items-center gap-1 pl-6">
        <span className="text-xs text-slate-400">Prefers:</span>
        {DAYS.map((d) => <button key={d} onClick={() => toggleDay(d)} className={`rounded px-1.5 py-0.5 text-xs ${v.preferredDays.includes(d) ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>{d}</button>)}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
        <input className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none" placeholder="Contact (email / phone)" value={v.contact} onChange={(e) => onUpdate({ ...v, contact: e.target.value })} />
        <input className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none" placeholder="Notes" value={v.notes} onChange={(e) => onUpdate({ ...v, notes: e.target.value })} />
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
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
      <button onClick={add} className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"><Plus size={13} /> Add candidate vendor</button>
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
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-medium text-slate-500">Show:</span>
        {V_ORDER.map((s) => (
          <button key={s} onClick={() => toggle(s)} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${show.has(s) ? V_STATUS[s].cls + " border-transparent" : "border-slate-200 text-slate-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${show.has(s) ? V_STATUS[s].dot : "bg-slate-300"}`} />{V_STATUS[s].label}
          </button>
        ))}
        <button onClick={() => setShow(new Set(["responded", "agreed"]))} className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-700">Responded &amp; agreed only</button>
      </div>
      {needsSourcing.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
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
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
          <button onClick={() => setMode("proposed")} className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "proposed" ? "bg-blue-600 text-white" : "text-slate-600"}`}>Proposed schedule</button>
          <button onClick={() => setMode("principal")} className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === "principal" ? "bg-blue-600 text-white" : "text-slate-600"}`}>Principal roster</button>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><Copy size={14} /> {copied ? "Copied!" : "Copy as text"}</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><Printer size={14} /> Print</button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-bold text-slate-800">{seasonName} — {mode === "principal" ? "Confirmed Enrichment Classes" : "Proposed Enrichment Schedule"}</h3>
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
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600"><History size={15} /> {season.yearLong ? "Year-round music program — read only." : "Historical season — read only."}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Classes offered" value={cls.length} />
        <Stat label="Completed" value={completed.length} />
        <Stat label="Cancelled" value={cancelled.length} />
        <Stat label="Seats filled" value={`${fill}%`} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><PlanBoard classes={cls} readOnly /></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
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

  useEffect(() => {
    if (!supabaseEnabled) return;
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // cloud load whenever auth resolves or session changes (anon can read, too)
  useEffect(() => {
    if (!supabaseEnabled || !authReady) return;
    let cancelled = false;
    setData(null);
    cloudLoad(!!session).then((d) => { if (!cancelled) setData(d); }).catch(() => { if (!cancelled) setData(combine([newEditableSeason()], null)); });
    return () => { cancelled = true; };
  }, [authReady, session]);

  // save (only when signed in)
  useEffect(() => {
    if (!data) return;
    if (!supabaseEnabled) { persistLocal(data); return; }
    if (session) { clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => { cloudSave(data).catch(() => {}); }, 800); }
  }, [data]);

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

  const currentSeason = data.seasons.find((s) => s.editable);
  const season = data.seasons.find((s) => s.id === data.activeSeasonId) || currentSeason || data.seasons[data.seasons.length - 1];
  const classes = season.classes;
  const isCurrent = season.editable;
  const canEdit = isCurrent && (!supabaseEnabled || !!session);
  const musicRef = (data.seasons.find((s) => s.yearLong)?.classes) || [];
  const setClasses = (updater) => setData((d) => ({ ...d, seasons: d.seasons.map((s) => (s.id === season.id ? { ...s, classes: updater(s.classes) } : s)) }));

  const upsert = (c) => { setClasses((list) => (list.some((x) => x.id === c.id) ? list.map((x) => (x.id === c.id ? c : x)) : [...list, { ...c, id: genId() }])); setForm(null); };
  const remove = (id) => { if (window.confirm("Delete this class?")) setClasses((list) => list.filter((x) => x.id !== id)); };
  const toggleConfirm = (id) => setClasses((list) => list.map((c) => (c.id === id ? { ...c, status: c.status === "confirmed" ? "proposed" : "confirmed" } : c)));
  const setClassVendors = (id, vendors) => setClasses((list) => list.map((c) => (c.id === id ? { ...c, vendors } : c)));
  const dropCell = (day, type) => { if (dragId) setClasses((list) => list.map((c) => (c.id === dragId ? { ...c, day, type } : c))); setDragId(null); };
  const blank = (day, type) => ({ name: "", type: type || "Art", gradeFrom: 0, gradeTo: 5, day: day || "Mon", start: "16:00", end: "17:00", room: "", status: "proposed", vendors: [] });
  const addToCell = (day, type) => setForm(blank(day, type));
  const resetSeason = () => { if (window.confirm("Reset the current season back to empty?")) { const ed = newEditableSeason(); setData({ seasons: [...historicalSeasons(), ed], activeSeasonId: ed.id }); } };

  const needVendor = canEdit ? classes.filter((c) => (c.vendors || []).length === 0).length : 0;

  const TabBtn = ({ id, icon: Icon, label, badge }) => (
    <button onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
      <Icon size={16} /> {label}
      {badge > 0 && <span className={`rounded-full px-1.5 text-xs ${tab === id ? "bg-blue-500 text-white" : "bg-amber-100 text-amber-700"}`}>{badge}</span>}
    </button>
  );

  const signInBar = (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <Lock size={16} className="shrink-0 text-blue-600" />
      <span className="text-sm text-blue-800">You're viewing the current season read-only. Sign in to plan and edit.</span>
      <div className="ml-auto flex items-center gap-2">
        {linkSent ? <span className="text-sm text-emerald-700">Check your email for the link.</span> : (
          <>
            <input className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none" type="email" placeholder="you@school.org" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendLink()} />
            <button onClick={sendLink} disabled={busy} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Sending…" : "Sign in"}</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-800">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white"><LayoutGrid size={18} /></span>
              Enrichment Planning Board
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              {isCurrent ? "Planning the upcoming season" : "Mann Elementary · past season"}
              {supabaseEnabled && session && isCurrent && <span className="flex items-center gap-1 text-emerald-600"><Cloud size={13} /> synced</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select value={data.activeSeasonId} onChange={(e) => { setData((d) => ({ ...d, activeSeasonId: e.target.value })); setTab("plan"); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-blue-400 focus:outline-none">
              {data.seasons.map((s) => <option key={s.id} value={s.id}>{s.name}{s.editable ? "  (current)" : ""}</option>)}
            </select>
            {supabaseEnabled && (session
              ? <button onClick={signOut} title={session.user?.email} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><LogOut size={15} /> Sign out</button>
              : <button onClick={() => currentSeason && setData((d) => ({ ...d, activeSeasonId: currentSeason.id }))} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><Lock size={15} /> Staff sign-in</button>)}
          </div>
        </div>

        {!isCurrent ? (
          <HistoricalSeason season={season} />
        ) : canEdit ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <TabBtn id="plan" icon={LayoutGrid} label="Plan" />
              <TabBtn id="vendors" icon={Store} label="Vendors" badge={needVendor} />
              <TabBtn id="season" icon={CheckCircle2} label="Season" />
              <TabBtn id="share" icon={Share2} label="Share" />
            </div>
            {tab === "plan" && (
              <div>
                <div className="mb-3 flex justify-end">
                  <button onClick={() => setForm(blank())} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"><Plus size={15} /> Add class</button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  {classes.length === 0 && <p className="mb-2 text-center text-sm text-slate-400">Empty season — add classes into the day/activity cells below to start planning.</p>}
                  <PlanBoard classes={classes} reference={musicRef} setDragId={setDragId} onDropCell={dropCell} onAdd={addToCell} onEdit={setForm} onDelete={remove} onToggleConfirm={toggleConfirm} />
                </div>
              </div>
            )}
            {tab === "vendors" && <VendorsView classes={classes} onClassVendors={setClassVendors} onEdit={setForm} />}
            {tab === "season" && <SeasonView classes={classes} />}
            {tab === "share" && <ShareView classes={classes} seasonName={season.name} />}
          </>
        ) : (
          <div className="space-y-4">
            {signInBar}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              {classes.length === 0 && <p className="mb-2 text-center text-sm text-slate-400">This season doesn't have any classes yet.</p>}
              <PlanBoard classes={classes} readOnly reference={musicRef} />
            </div>
          </div>
        )}

        {canEdit && (
          <div className="mt-6 flex justify-end">
            <button onClick={resetSeason} className="text-xs text-slate-400 hover:text-slate-600">Reset current season</button>
          </div>
        )}
      </div>

      {form && <ClassForm initial={form} onSave={upsert} onClose={() => setForm(null)} />}
    </div>
  );
}
