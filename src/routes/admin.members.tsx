import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Trash2, Edit3, Download, Plus, MoreVertical, Shield, Pause, Play, UserPlus, Mail, User, FileText, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, Field, inputClass, selectClass, selectStyle } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/members")({ component: Page });

type Member = { id: string; full_name: string | null; avatar_url: string | null; plan: string | null; status: string; created_at: string; last_seen_at: string | null; bio: string | null };

function Page() {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const bulkUpdatePlan = async (plan: string) => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ plan }).in("id", selectedIds);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Plano atualizado para ${selectedIds.length} membros!`);
      setSelectedIds([]);
      load();
    }
    setLoading(false);
  };

  const bulkUpdateStatus = async (status: string) => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ status }).in("id", selectedIds);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Status atualizado para ${selectedIds.length} membros!`);
      setSelectedIds([]);
      load();
    }
    setLoading(false);
  };

  const bulkDelete = async () => {
    if (!confirm(`Excluir os ${selectedIds.length} membros selecionados? Esta ação não pode ser desfeita.`)) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").delete().in("id", selectedIds);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${selectedIds.length} membros excluídos com sucesso!`);
      setSelectedIds([]);
      load();
    }
    setLoading(false);
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
          <button onClick={() => setAdding(true)} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2"><Plus className="h-4 w-4" />Adicionar</button>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm cursor-pointer hover:bg-white/10 outline-none [&>option]:bg-[#121214] [&>option]:text-white" style={{ colorScheme: "dark" }}>
          <option value="all">Todos status</option><option value="active">Ativo</option><option value="suspended">Suspenso</option><option value="pending">Pendente</option>
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm cursor-pointer hover:bg-white/10 outline-none [&>option]:bg-[#121214] [&>option]:text-white" style={{ colorScheme: "dark" }}>
          <option value="all">Todos planos</option><option>Free</option><option>Pro</option><option>Premium</option>
        </select>
      </div>

      {selectedIds.length > 0 && (
        <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 animate-fade-in flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">{selectedIds.length} selecionados</span>
            <button onClick={() => setSelectedIds([])} className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer">Limpar seleção</button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Plano:</span>
              <select
                onChange={async (e) => {
                  const plan = e.target.value;
                  if (!plan) return;
                  await bulkUpdatePlan(plan);
                  e.target.value = "";
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs cursor-pointer hover:bg-white/10 outline-none [&>option]:bg-[#121214] [&>option]:text-white"
                style={{ colorScheme: "dark" }}
              >
                <option value="">Alterar...</option>
                <option value="Free">Free</option>
                <option value="Pro">Pro</option>
                <option value="Premium">Premium</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Status:</span>
              <select
                onChange={async (e) => {
                  const status = e.target.value;
                  if (!status) return;
                  await bulkUpdateStatus(status);
                  e.target.value = "";
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs cursor-pointer hover:bg-white/10 outline-none [&>option]:bg-[#121214] [&>option]:text-white"
                style={{ colorScheme: "dark" }}
              >
                <option value="">Alterar...</option>
                <option value="active">Ativo</option>
                <option value="pending">Pendente</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>

            <button
              onClick={bulkDelete}
              className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-white/[0.02] sticky top-0">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filtered.map(r => r.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="accent-primary rounded cursor-pointer scale-105"
                  />
                </th>
                <th className="text-left font-medium px-4 py-3">Membro</th>
                <th className="text-left font-medium px-4 py-3">Plano</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Cadastro</th>
                <th className="text-left font-medium px-4 py-3">Último acesso</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-xs">Nenhum membro encontrado</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className={`hover:bg-white/[0.02] transition ${selectedIds.includes(r.id) ? "bg-primary/[0.02]" : ""}`}>
                  <td className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, r.id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== r.id));
                        }
                      }}
                      className="accent-primary rounded cursor-pointer scale-105"
                    />
                  </td>
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
      {adding && <AddMemberModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
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
    <Modal
      open
      onClose={onClose}
      title="Editar membro"
      kicker="Edição"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome" icon={User} required>
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Plano" icon={Shield}>
          <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className={selectClass} style={selectStyle}>
            <option>Free</option><option>Pro</option><option>Premium</option>
          </select>
        </Field>
        <Field label="Bio" icon={FileText}>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
}

function AddMemberModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<"manual" | "invite">("manual");
  const [form, setForm] = useState({ full_name: "", email: "", plan: "Free", bio: "", status: "active" });
  const [saving, setSaving] = useState(false);

  const saveManual = async () => {
    if (!form.full_name.trim()) return toast.error("Nome é obrigatório");

    setSaving(true);
    const { error } = await supabase.from("profiles").insert({
      full_name: form.full_name.trim(),
      plan: form.plan,
      bio: form.bio.trim() || null,
      status: form.status,
    });
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success("Membro adicionado com sucesso");
    onSaved();
  };

  const sendInvite = async () => {
    if (!form.email.trim()) return toast.error("Email é obrigatório");
    if (!form.full_name.trim()) return toast.error("Nome é obrigatório");

    setSaving(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: crypto.randomUUID(),
      options: {
        data: { full_name: form.full_name.trim() },
      },
    });
    setSaving(false);

    if (error) return toast.error(error.message);

    // Update the profile with plan/status/bio if user was created
    if (data.user) {
      await supabase.from("profiles").update({
        plan: form.plan,
        status: form.status,
        bio: form.bio.trim() || null,
      }).eq("id", data.user.id);
    }

    toast.success("Membro criado! Um email de confirmação foi enviado.");
    onSaved();
  };

  const handleSave = () => (mode === "invite" ? sendInvite() : saveManual());

  return (
    <Modal
      open
      onClose={onClose}
      title="Adicionar membro"
      kicker="Novo membro"
      description="Escolha como deseja adicionar o membro à plataforma."
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm disabled:opacity-50">
            {saving ? "Salvando..." : mode === "invite" ? "Enviar convite" : "Adicionar"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${mode === "manual" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
          >
            Cadastro manual
          </button>
          <button
            onClick={() => setMode("invite")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${mode === "invite" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
          >
            Convite por email
          </button>
        </div>

        <Field label="Nome completo" icon={User} required>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Ex: João Silva"
            className={inputClass}
          />
        </Field>

        {mode === "invite" && (
          <Field label="Email" icon={Mail} required hint="Um convite será enviado para este email.">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="joao@email.com"
              className={inputClass}
            />
          </Field>
        )}

        <Field label="Plano" icon={Shield}>
          <select
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            className={selectClass}
            style={selectStyle}
          >
            <option value="Free">Free</option>
            <option value="Pro">Pro</option>
            <option value="Premium">Premium</option>
          </select>
        </Field>

        <Field label="Status" icon={Activity}>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className={selectClass}
            style={selectStyle}
          >
            <option value="active">Ativo</option>
            <option value="pending">Pendente</option>
            <option value="suspended">Suspenso</option>
          </select>
        </Field>

        <Field label="Bio" icon={FileText} hint="Opcional. Uma breve descrição sobre o membro.">
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            placeholder="Conte um pouco sobre este membro..."
            className={inputClass}
          />
        </Field>
      </div>
    </Modal>
  );
}