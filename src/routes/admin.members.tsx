import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Trash2, Edit3, Download, Plus, MoreVertical, Shield, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/members")({ component: Page });

type Member = { id: string; full_name: string | null; avatar_url: string | null; plan: string | null; status: string; created_at: string; last_seen_at: string | null; bio: string | null };

function Page() {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [editing, setEditing] = useState<Member | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (planFilter !== "all" && (r.plan ?? "Free") !== planFilter) return false;
    if (q && !(r.full_name ?? "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "active" ? "Membro reativado" : "Membro suspenso");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este perfil? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Membro excluído");
    load();
  };

  const exportCsv = () => {
    const head = "Nome,Plano,Status,Cadastro\n";
    const body = filtered.map((r) => `"${r.full_name ?? ""}","${r.plan ?? "Free"}","${r.status}","${r.created_at}"`).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "membros.csv"; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} de {rows.length} membros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="glass px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-white/10"><Download className="h-4 w-4" />CSV</button>
          <button className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2"><Plus className="h-4 w-4" />Adicionar</button>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm">
          <option value="all">Todos status</option><option value="active">Ativo</option><option value="suspended">Suspenso</option><option value="pending">Pendente</option>
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm">
          <option value="all">Todos planos</option><option>Free</option><option>Pro</option><option>Premium</option>
        </select>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-white/[0.02] sticky top-0">
              <tr>
                <th className="text-left font-medium px-4 py-3">Membro</th>
                <th className="text-left font-medium px-4 py-3">Plano</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Cadastro</th>
                <th className="text-left font-medium px-4 py-3">Último acesso</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-xs">Nenhum membro encontrado</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                        {(r.full_name ?? "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="font-medium">{r.full_name ?? "Sem nome"}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-md bg-white/5">{r.plan ?? "Free"}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-md ${r.status === "active" ? "bg-emerald-500/10 text-emerald-400" : r.status === "suspended" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg hover:bg-white/10" title="Editar"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setStatus(r.id, r.status === "active" ? "suspended" : "active")} className="p-1.5 rounded-lg hover:bg-white/10" title="Suspender/Reativar">
                        {r.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <EditModal member={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditModal({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ full_name: member.full_name ?? "", plan: member.plan ?? "Free", bio: member.bio ?? "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", member.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Membro atualizado");
    onSaved();
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-md animate-in fade-in" onClick={onClose}>
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="glass-strong rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Editar membro</h2>
        <div className="space-y-3">
          <Field label="Nome"><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></Field>
          <Field label="Plano">
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm">
              <option>Free</option><option>Pro</option><option>Premium</option>
            </select>
          </Field>
          <Field label="Bio"><textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" /></Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
        </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>{children}</div>;
}