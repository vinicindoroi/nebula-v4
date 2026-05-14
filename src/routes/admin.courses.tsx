import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit3, Trash2, BookOpen, X, ImageIcon, Tag as TagIcon, DollarSign, FileText, Folder, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/courses")({ component: Page });

type Course = { id: string; title: string; description: string | null; tag: string | null; cover_url: string | null; status: string; price: number | null; category_id: string | null };
type Cat = { id: string; name: string };

function Page() {
  const [rows, setRows] = useState<Course[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [editing, setEditing] = useState<Partial<Course> | null>(null);

  const load = async () => {
    const [{ data: c }, { data: ct }] = await Promise.all([
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name"),
    ]);
    setRows((c ?? []) as any); setCats((ct ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir este curso?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Curso excluído"); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">Cursos</h1><p className="text-sm text-muted-foreground">{rows.length} cursos</p></div>
        <button onClick={() => setEditing({})} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2"><Plus className="h-4 w-4" />Novo curso</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <div key={c.id} className="glass rounded-2xl p-5 hover:bg-white/[0.07] transition group">
            <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4 flex items-center justify-center">
              {c.cover_url ? <img src={c.cover_url} className="w-full h-full object-cover rounded-xl" /> : <BookOpen className="h-8 w-8 text-primary/60" />}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${c.status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{c.status}</span>
              {c.tag && <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-muted-foreground">{c.tag}</span>}
            </div>
            <h3 className="font-medium leading-tight mb-1">{c.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{c.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">R$ {Number(c.price ?? 0).toFixed(2)}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-white/10"><Edit3 className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground col-span-full">Nenhum curso. Clique em "Novo curso".</div>}
      </div>

      {editing && <CourseModal initial={editing} cats={cats} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CourseModal({ initial, cats, onClose, onSaved }: { initial: Partial<Course>; cats: Cat[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: initial.title ?? "", description: initial.description ?? "", tag: initial.tag ?? "",
    status: initial.status ?? "draft", price: Number(initial.price ?? 0), category_id: initial.category_id ?? "",
    cover_url: initial.cover_url ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const save = async () => {
    if (!f.title.trim()) return toast.error("Informe um título");
    setSaving(true);
    const payload: any = { ...f, category_id: f.category_id || null };
    const { error } = initial.id
      ? await supabase.from("courses").update(payload).eq("id", initial.id)
      : await supabase.from("courses").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Curso salvo"); onSaved();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-md"
      style={{ animation: "modal-overlay-in 0.18s ease-out both" }}
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[oklch(0.16_0.015_270)] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] overflow-hidden"
          style={{ animation: "modal-card-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative px-6 pt-5 pb-4 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/80 mb-1">
                  {initial.id ? "Editar" : "Criar"}
                </div>
                <h2 className="text-xl font-semibold tracking-tight">{initial.id ? "Editar curso" : "Novo curso"}</h2>
                <p className="text-xs text-muted-foreground mt-1">Defina os detalhes do curso. Você pode editar tudo depois.</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 h-9 w-9 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[min(70vh,640px)] overflow-y-auto">
            <Field label="Título" icon={FileText} required>
              <input
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                placeholder="Ex: Design Systems do zero"
                className="modal-inp"
                autoFocus
              />
            </Field>

            <Field label="Descrição" icon={FileText}>
              <textarea
                value={f.description}
                onChange={(e) => setF({ ...f, description: e.target.value })}
                rows={3}
                placeholder="Resumo curto sobre o que o aluno vai aprender..."
                className="modal-inp resize-none"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Categoria" icon={Folder}>
                <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} className="modal-inp">
                  <option value="">Sem categoria</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>

              <Field label="Status" icon={Eye}>
                <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="modal-inp">
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                </select>
              </Field>

              <Field label="Tag" icon={TagIcon}>
                <input
                  value={f.tag}
                  onChange={(e) => setF({ ...f, tag: e.target.value })}
                  placeholder="Ex: Design"
                  className="modal-inp"
                />
              </Field>

              <Field label="Preço (R$)" icon={DollarSign}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={f.price}
                  onChange={(e) => setF({ ...f, price: Number(e.target.value) })}
                  className="modal-inp"
                />
              </Field>
            </div>

            <Field label="URL da capa" icon={ImageIcon}>
              <input
                value={f.cover_url}
                onChange={(e) => setF({ ...f, cover_url: e.target.value })}
                placeholder="https://..."
                className="modal-inp"
              />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>Recomendado: <span className="text-foreground">1280 × 720 px</span> (16:9, desktop)</span>
                <span>Mobile: <span className="text-foreground">750 × 422 px</span> (16:9, 2x)</span>
                <span>Máx. 1 MB · JPG ou WebP</span>
              </div>
              {f.cover_url && (
                <div className="mt-2 aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]">
                  <img src={f.cover_url} alt="" className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                </div>
              )}
            </Field>
          </div>

          <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground">
              {f.status === "published" ? "Será publicado ao salvar" : "Salvo como rascunho"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm border border-white/10 hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] transition"
              >
                {saving ? "Salvando..." : initial.id ? "Salvar alterações" : "Criar curso"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modal-overlay-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modal-card-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        .modal-inp {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: inherit;
          outline: none;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .modal-inp::placeholder { color: oklch(0.7 0.02 270 / 0.5) }
        .modal-inp:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12) }
        .modal-inp:focus {
          background: rgba(255,255,255,0.06);
          border-color: oklch(0.65 0.22 290 / 0.5);
          box-shadow: 0 0 0 3px oklch(0.65 0.22 290 / 0.15);
        }
        select.modal-inp { color-scheme: dark; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>"); background-repeat: no-repeat; background-position: right 0.75rem center; padding-right: 2rem; }
        select.modal-inp option { background: oklch(0.18 0.015 270); color: oklch(0.98 0.005 270); }
      `}</style>
    </div>,
    document.body
  );
}

function Field({ label, icon: Icon, required, children }: { label: string; icon?: typeof FileText; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
        {required && <span className="text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}