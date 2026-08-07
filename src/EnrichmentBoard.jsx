import { useState, useEffect, useMemo } from "react";
import {
  LayoutGrid, Store, CheckCircle2, Share2, Plus, Pencil, Trash2, X,
  Check, Clock, MapPin, GraduationCap, AlertTriangle, ArrowUp, Printer,
  Copy, Star, Phone, ChevronRight,
} from "lucide-react";

/* ---------------- constants ---------------- */

const KEY = "enrichment-board-v1";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TYPES = ["Art", "STEM", "Movement", "Other"];
const TYPE_LABEL = { Art: "Art", STEM: "STEM / Chess", Movement: "Movement", Other: "Other" };
const BANDS = ["K–2", "3–5", "All"];

const TYPE_STYLE = {
  Art:      { bar: "bg-rose-500",    soft: "bg-rose-50 border-rose-200 text-rose-700",       dot: "bg-rose-500" },
  STEM:     { bar: "bg-blue-500",    soft: "bg-blue-50 border-blue-200 text-blue-700",       dot: "bg-blue-500" },
  Movement: { bar: "bg-emerald-500", soft: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500" },
  Other:    { bar: "bg-violet-500",  soft: "bg-violet-50 border-violet-200 text-violet-700",  dot: "bg-violet-500" },
};
const ts = (t) => TYPE_STYLE[t] ?? TYPE_STYLE.Other;

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

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`;
};
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------------- seed (a season mid-planning, with gaps on purpose) ---------------- */

function seed() {
  const v = (name, status, preferredDays = [], contact = "", notes = "") => ({ id: genId(), name, status, preferredDays, contact, notes });
  const c = (o) => ({ id: genId(), room: "", time: "15:15", vendors: [], ...o });
  return {
    classes: [
      c({ name: "Watercolor Painting", type: "Art", band: "K–2", day: "Mon", room: "Art Room", status: "proposed",
        vendors: [ v("Little Brushes Studio", "contacted", ["Mon", "Wed"], "hello@littlebrushes.com"), v("Creative Kids Co.", "to_contact") ] }),
      c({ name: "Chess Club", type: "STEM", band: "3–5", day: "Mon", room: "Room 5", status: "confirmed",
        vendors: [ v("Checkmate Academy", "agreed", ["Mon"], "coach@checkmate.org", "Confirmed rate for 10 weeks") ] }),
      c({ name: "Kids Yoga", type: "Movement", band: "All", day: "Tue", room: "Gym", status: "proposed",
        vendors: [ v("Bendy Kids", "responded", ["Tue", "Thu"], "team@bendykids.com", "Wants to know class size") ] }),
      c({ name: "Junior Coders", type: "STEM", band: "3–5", day: "Wed", room: "Computer Lab", status: "proposed",
        vendors: [ v("CodeSprouts", "contacted", ["Wed"]), v("TechTykes", "to_contact") ] }),
      c({ name: "Clay & Sculpture", type: "Art", band: "3–5", day: "Thu", room: "Art Room", status: "idea", vendors: [] }),
      c({ name: "Dance Party", type: "Movement", band: "K–2", day: "Fri", room: "Gym", status: "proposed",
        vendors: [ v("MoveMakers", "contacted", ["Fri"]), v("Groove Studio", "declined", [], "", "No Friday availability") ] }),
      c({ name: "Spanish Games", type: "Other", band: "K–2", day: "Wed", time: "14:30", room: "Room 5", status: "confirmed",
        vendors: [ v("Lingo Lab", "agreed", ["Wed"], "info@lingolab.com") ] }),
    ],
  };
}

/* ---------------- persistence (localStorage) ---------------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return seed();
}
function persist(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
}

/* ---------------- atoms ---------------- */

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>;
}

function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.idea;
  return <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

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

/* ---------------- class add/edit form ---------------- */

function ClassForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.name.trim();
  return (
    <Modal title={f.id ? "Edit class" : "Add class"} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Class name"><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Watercolor Painting" /></Field>
        </div>
        <Field label="Activity type">
          <select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select>
        </Field>
        <Field label="Grade band">
          <select className={inputCls} value={f.band} onChange={(e) => set("band", e.target.value)}>{BANDS.map((b) => <option key={b}>{b}</option>)}</select>
        </Field>
        <Field label="Day">
          <select className={inputCls} value={f.day} onChange={(e) => set("day", e.target.value)}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select>
        </Field>
        <Field label="Time"><input type="time" className={inputCls} value={f.time} onChange={(e) => set("time", e.target.value)} /></Field>
        <Field label="Room / location"><input className={inputCls} value={f.room} onChange={(e) => set("room", e.target.value)} placeholder="e.g. Art Room" /></Field>
        <Field label="Status">
          <select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}>
            {Object.keys(STATUS).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button disabled={!valid} onClick={() => onSave({ ...f, name: f.name.trim() })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">
          {f.id ? "Save changes" : "Add class"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- plan board (Day × Activity type) ---------------- */

function firstChoice(cls) {
  const live = cls.vendors.filter((v) => v.status !== "declined");
  return live[0] || cls.vendors[0] || null;
}

function ClassCard({ cls, onEdit, onDelete, onToggleConfirm, onDrag }) {
  const fc = firstChoice(cls);
  return (
    <div
      draggable
      onDragStart={() => onDrag(cls.id)}
      className="group cursor-grab rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold leading-tight text-slate-800">{cls.name}</span>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button onClick={() => onToggleConfirm(cls.id)} title={cls.status === "confirmed" ? "Un-confirm" : "Confirm for season"} className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"><Check size={13} /></button>
          <button onClick={() => onEdit(cls)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><Pencil size={13} /></button>
          <button onClick={() => onDelete(cls.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{cls.band}</span>
        <StatusBadge status={cls.status} />
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(cls.time)}</span>
        {cls.room && <span className="flex items-center gap-1"><MapPin size={11} />{cls.room}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-50 pt-1.5 text-xs">
        {fc ? (
          <>
            <span className={`h-2 w-2 shrink-0 rounded-full ${V_STATUS[fc.status].dot}`} />
            <span className="truncate text-slate-600">{fc.name}</span>
            <span className="ml-auto shrink-0 text-slate-400">{V_STATUS[fc.status].label}</span>
          </>
        ) : (
          <span className="flex items-center gap-1 text-amber-600"><AlertTriangle size={11} /> Needs a vendor</span>
        )}
      </div>
    </div>
  );
}

function PlanView({ classes, dragId, setDragId, onDropCell, onAdd, onEdit, onDelete, onToggleConfirm }) {
  const [over, setOver] = useState(null);
  const cell = (day, type) => classes.filter((c) => c.day === day && c.type === type);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 860 }}>
        {/* day headers with coverage */}
        <div className="grid" style={{ gridTemplateColumns: "120px repeat(5, 1fr)" }}>
          <div />
          {DAYS.map((d) => {
            const have = new Set(classes.filter((c) => c.day === d).map((c) => c.type));
            return (
              <div key={d} className="px-1 pb-2 text-center">
                <div className="text-sm font-semibold text-slate-700">{d}</div>
                <div className="mt-1 flex justify-center gap-1">
                  {["Art", "STEM", "Movement"].map((t) => (
                    <span key={t} title={TYPE_LABEL[t]} className={`h-1.5 w-1.5 rounded-full ${have.has(t) ? ts(t).bar : "bg-slate-200"}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {/* type rows */}
        {TYPES.map((type) => (
          <div key={type} className="grid border-t border-slate-100" style={{ gridTemplateColumns: "120px repeat(5, 1fr)" }}>
            <div className="flex items-center gap-2 py-3 pr-2">
              <span className={`h-3 w-1 rounded-full ${ts(type).bar}`} />
              <span className="text-sm font-medium text-slate-600">{TYPE_LABEL[type]}</span>
            </div>
            {DAYS.map((day) => {
              const items = cell(day, type);
              const isOver = over === `${day}-${type}`;
              return (
                <div
                  key={day}
                  onDragOver={(e) => { e.preventDefault(); setOver(`${day}-${type}`); }}
                  onDragLeave={() => setOver(null)}
                  onDrop={() => { onDropCell(day, type); setOver(null); }}
                  className={`space-y-1.5 border-l border-slate-100 p-1.5 ${isOver ? "bg-blue-50" : ""}`}
                  style={{ minHeight: 84 }}
                >
                  {items.map((c) => (
                    <ClassCard key={c.id} cls={c} onEdit={onEdit} onDelete={onDelete} onToggleConfirm={onToggleConfirm} onDrag={setDragId} />
                  ))}
                  <button onClick={() => onAdd(day, type)} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 py-1.5 text-xs text-slate-400 hover:border-blue-300 hover:text-blue-500">
                    <Plus size={12} /> Add
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">Drag a card to a different day or activity row to rebalance. Faint dots under each day show whether Art / STEM / Movement is covered.</p>
    </div>
  );
}

/* ---------------- vendors pipeline ---------------- */

function VendorRow({ v, first, onUpdate, onRemove, onPromote }) {
  const [dayInput, setDayInput] = useState("");
  const toggleDay = (d) => {
    const has = v.preferredDays.includes(d);
    onUpdate({ ...v, preferredDays: has ? v.preferredDays.filter((x) => x !== d) : [...v.preferredDays, d] });
  };
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2">
        {first ? <Star size={14} className="shrink-0 fill-amber-400 text-amber-400" title="First choice" /> : (
          <button onClick={onPromote} title="Make first choice" className="shrink-0 rounded p-0.5 text-slate-300 hover:text-amber-500"><ArrowUp size={14} /></button>
        )}
        <input className="flex-1 rounded border border-transparent px-1 py-0.5 text-sm font-medium text-slate-800 hover:border-slate-200 focus:border-blue-300 focus:outline-none" value={v.name} onChange={(e) => onUpdate({ ...v, name: e.target.value })} />
        <select value={v.status} onChange={(e) => onUpdate({ ...v, status: e.target.value })} className={`rounded px-2 py-1 text-xs font-medium ${V_STATUS[v.status].cls}`}>
          {V_ORDER.map((s) => <option key={s} value={s}>{V_STATUS[s].label}</option>)}
        </select>
        <button onClick={onRemove} className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1 pl-6">
        <span className="text-xs text-slate-400">Prefers:</span>
        {DAYS.map((d) => (
          <button key={d} onClick={() => toggleDay(d)} className={`rounded px-1.5 py-0.5 text-xs ${v.preferredDays.includes(d) ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>{d}</button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
        <input className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none" placeholder="Contact (email / phone)" value={v.contact} onChange={(e) => onUpdate({ ...v, contact: e.target.value })} />
        <input className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none" placeholder="Notes" value={v.notes} onChange={(e) => onUpdate({ ...v, notes: e.target.value })} />
      </div>
    </div>
  );
}

function VendorsView({ classes, onClassVendors, onEdit }) {
  const needsSourcing = classes.filter((c) => c.vendors.length === 0);
  const withVendors = classes.filter((c) => c.vendors.length > 0);

  const updateVendor = (cls, vid, next) => onClassVendors(cls.id, cls.vendors.map((v) => (v.id === vid ? next : v)));
  const removeVendor = (cls, vid) => onClassVendors(cls.id, cls.vendors.filter((v) => v.id !== vid));
  const addVendor = (cls) => onClassVendors(cls.id, [...cls.vendors, { id: genId(), name: "New vendor", status: "to_contact", preferredDays: [], contact: "", notes: "" }]);
  const promote = (cls, vid) => {
    const v = cls.vendors.find((x) => x.id === vid);
    onClassVendors(cls.id, [v, ...cls.vendors.filter((x) => x.id !== vid)]);
  };

  const ClassBlock = ({ c }) => {
    const fc = firstChoice(c);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${ts(c.type).dot}`} />
          <span className="font-semibold text-slate-800">{c.name}</span>
          <span className="text-xs text-slate-400">{TYPE_LABEL[c.type]} · {c.band} · {c.day}</span>
          <StatusBadge status={c.status} />
          {fc && <span className="ml-auto text-xs text-slate-500">1st choice: <span className="font-medium text-slate-700">{fc.name}</span></span>}
        </div>
        <div className="mt-3 space-y-2">
          {c.vendors.map((v, i) => (
            <VendorRow key={v.id} v={v} first={i === 0} onUpdate={(n) => updateVendor(c, v.id, n)} onRemove={() => removeVendor(c, v.id)} onPromote={() => promote(c, v.id)} />
          ))}
        </div>
        <button onClick={() => addVendor(c)} className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"><Plus size={13} /> Add candidate vendor</button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {needsSourcing.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle size={15} /> {needsSourcing.length} class{needsSourcing.length > 1 ? "es" : ""} still need a vendor</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {needsSourcing.map((c) => (
              <button key={c.id} onClick={() => onEdit(c)} className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-amber-300">
                <span className={`h-2 w-2 rounded-full ${ts(c.type).dot}`} /> {c.name} <ChevronRight size={12} className="text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      )}
      {withVendors.map((c) => <ClassBlock key={c.id} c={c} />)}
      {needsSourcing.map((c) => <ClassBlock key={c.id} c={c} />)}
    </div>
  );
}

/* ---------------- confirmed / season ---------------- */

function ConfirmedView({ classes }) {
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
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${ts(c.type).dot}`} />
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <span className="ml-auto text-xs text-slate-500">{c.day} · {fmtTime(c.time)}</span>
                </div>
                <p className="mt-1 pl-4 text-xs text-slate-500">{c.band} · {c.room || "no room"}{fc ? ` · ${fc.name}` : ""}</p>
              </div>
            );
          })}
          {confirmed.length === 0 && <p className="text-sm text-slate-400">Nothing confirmed yet. Hit the ✓ on a card in the Plan to lock it in.</p>}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-500">Still in planning ({pending.length})</p>
        <div className="flex flex-wrap gap-2">
          {pending.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
              <span className={`h-2 w-2 rounded-full ${ts(c.type).dot}`} /> {c.name} <StatusBadge status={c.status} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- share views ---------------- */

function ShareView({ classes }) {
  const [mode, setMode] = useState("proposed");
  const [copied, setCopied] = useState(false);
  const rows = mode === "principal"
    ? classes.filter((c) => c.status === "confirmed")
    : classes.filter((c) => c.status !== "idea");
  const ordered = [...rows].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || (a.time || "").localeCompare(b.time || ""));

  const asText = () => {
    const title = mode === "principal" ? "Confirmed Enrichment Classes" : "Proposed Enrichment Schedule (for review)";
    const lines = ordered.map((c) => {
      const fc = firstChoice(c);
      return `${c.day}  ${fmtTime(c.time)}  ${c.name} (${TYPE_LABEL[c.type]}, ${c.band}) — ${c.room || "TBD"}${fc ? ` — ${fc.name}` : ""} [${STATUS[c.status].label}]`;
    });
    return `${title}\n\n${lines.join("\n")}`;
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
          <button onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Copy size={14} /> {copied ? "Copied!" : "Copy as text"}
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><Printer size={14} /> Print</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-bold text-slate-800">{mode === "principal" ? "Confirmed Enrichment Classes" : "Proposed Enrichment Schedule"}</h3>
        <p className="mb-4 text-xs text-slate-400">{mode === "principal" ? "Locked in for the season." : "Draft for review — subject to vendor confirmation."}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-3 font-medium">Day</th>
              <th className="py-2 pr-3 font-medium">Time</th>
              <th className="py-2 pr-3 font-medium">Class</th>
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 font-medium">Grades</th>
              <th className="py-2 pr-3 font-medium">Room</th>
              <th className="py-2 pr-3 font-medium">Vendor</th>
              {mode === "proposed" && <th className="py-2 font-medium">Status</th>}
            </tr>
          </thead>
          <tbody>
            {ordered.map((c) => {
              const fc = firstChoice(c);
              return (
                <tr key={c.id} className="border-b border-slate-50">
                  <td className="py-2 pr-3 font-medium text-slate-700">{c.day}</td>
                  <td className="py-2 pr-3 text-slate-500">{fmtTime(c.time)}</td>
                  <td className="py-2 pr-3 font-medium text-slate-800">{c.name}</td>
                  <td className="py-2 pr-3"><span className="inline-flex items-center gap-1 text-slate-500"><span className={`h-2 w-2 rounded-full ${ts(c.type).dot}`} />{TYPE_LABEL[c.type]}</span></td>
                  <td className="py-2 pr-3 text-slate-500">{c.band}</td>
                  <td className="py-2 pr-3 text-slate-500">{c.room || "TBD"}</td>
                  <td className="py-2 pr-3 text-slate-500">{fc ? fc.name : "—"}</td>
                  {mode === "proposed" && <td className="py-2"><StatusBadge status={c.status} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        {ordered.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nothing to show here yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- main ---------------- */

export default function EnrichmentBoard() {
  const [data, setData] = useState(load);
  const [tab, setTab] = useState("plan");
  const [dragId, setDragId] = useState(null);
  const [form, setForm] = useState(null);

  useEffect(() => { persist(data); }, [data]);

  const classes = data?.classes ?? [];
  const counts = useMemo(() => ({
    total: classes.length,
    confirmed: classes.filter((c) => c.status === "confirmed").length,
    needVendor: classes.filter((c) => c.vendors.length === 0).length,
  }), [classes]);

  /* mutations */
  const upsert = (c) => {
    setData((d) => {
      const exists = d.classes.some((x) => x.id === c.id);
      return { ...d, classes: exists ? d.classes.map((x) => (x.id === c.id ? c : x)) : [...d.classes, { ...c, id: genId() }] };
    });
    setForm(null);
  };
  const remove = (id) => { if (window.confirm("Delete this class?")) setData((d) => ({ ...d, classes: d.classes.filter((x) => x.id !== id) })); };
  const toggleConfirm = (id) => setData((d) => ({ ...d, classes: d.classes.map((c) => c.id === id ? { ...c, status: c.status === "confirmed" ? "proposed" : "confirmed" } : c) }));
  const setClassVendors = (id, vendors) => setData((d) => ({ ...d, classes: d.classes.map((c) => c.id === id ? { ...c, vendors } : c) }));
  const dropCell = (day, type) => { if (dragId) setData((d) => ({ ...d, classes: d.classes.map((c) => c.id === dragId ? { ...c, day, type } : c) })); setDragId(null); };
  const addToCell = (day, type) => setForm({ name: "", type, band: "All", day, time: "15:15", room: "", status: "proposed", vendors: [] });
  const reset = () => { if (window.confirm("Reset to sample season?")) setData(seed()); };

  const TabBtn = ({ id, icon: Icon, label, badge }) => (
    <button onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
      <Icon size={16} /> {label}
      {badge > 0 && <span className={`rounded-full px-1.5 text-xs ${tab === id ? "bg-blue-500 text-white" : "bg-amber-100 text-amber-700"}`}>{badge}</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-800">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white"><LayoutGrid size={18} /></span>
              Season Planning Board
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{counts.total} classes · {counts.confirmed} confirmed · {counts.needVendor} awaiting a vendor</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <TabBtn id="plan" icon={LayoutGrid} label="Plan" />
            <TabBtn id="vendors" icon={Store} label="Vendors" badge={counts.needVendor} />
            <TabBtn id="confirmed" icon={CheckCircle2} label="Season" />
            <TabBtn id="share" icon={Share2} label="Share" />
          </div>
        </div>

        {tab === "plan" && (
          <div>
            <div className="mb-3 flex justify-end">
              <button onClick={() => setForm({ name: "", type: "Art", band: "All", day: "Mon", time: "15:15", room: "", status: "proposed", vendors: [] })} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"><Plus size={15} /> Add class</button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <PlanView classes={classes} dragId={dragId} setDragId={setDragId} onDropCell={dropCell} onAdd={addToCell} onEdit={setForm} onDelete={remove} onToggleConfirm={toggleConfirm} />
            </div>
          </div>
        )}
        {tab === "vendors" && <VendorsView classes={classes} onClassVendors={setClassVendors} onEdit={setForm} />}
        {tab === "confirmed" && <ConfirmedView classes={classes} />}
        {tab === "share" && <ShareView classes={classes} />}

        <div className="mt-6 flex justify-end">
          <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">Reset to sample season</button>
        </div>
      </div>

      {form && <ClassForm initial={form} onSave={upsert} onClose={() => setForm(null)} />}
    </div>
  );
}
