import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award, Flame, Star, Trophy, Zap, Target, User, Mail, MapPin, Phone, FileText,
  Save, Calendar, BadgeCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/admin/Modal";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Perfil — Membros" }] }),
});

const badges = [
  { id: "streak", icon: Flame, label: "7 dias seguidos", color: "from-orange-500 to-pink-500", earned: true },
  { id: "first", icon: Star, label: "Primeiro curso", color: "from-yellow-400 to-orange-500", earned: true },
  { id: "top", icon: Trophy, label: "Top 10%", color: "from-purple-500 to-blue-500", earned: false },
  { id: "marathon", icon: Zap, label: "Maratona", color: "from-cyan-400 to-blue-500", earned: false },
  { id: "goal", icon: Target, label: "Meta atingida", color: "from-green-400 to-emerald-500", earned: false },
  { id: "mentor", icon: Award, label: "Mentor", color: "from-fuchsia-500 to-purple-500", earned: false },
];

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: courses = [] } = useCourses();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ full_name: "", bio: "", phone: "", location: "" });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        bio: profile.bio ?? "",
        phone: profile.phone ?? "",
        location: profile.location ?? "",
      });
      setDirty(false);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = (patch: Partial<typeof form>) => {
    setForm((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  const initials = (form.full_name || user?.email || "M").slice(0, 2).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "—";

  const completedCourses = courses.filter((c) => c.progress === 100).length;
  const totalCompletedLessons = courses.reduce((s, c) => s + c.completedLessons, 0);
  const earnedBadges = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações pessoais e veja seu progresso.</p>
        </div>
        {dirty && (
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
          >
            <Save className="h-4 w-4" />
            {save.isPending ? "Salvando..." : "Salvar alterações"}
          </button>
        )}
      </header>

      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-primary/10 via-white/[0.02] to-transparent p-6 md:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative">
            <div className="h-24 w-24 rounded-2xl gradient-primary flex items-center justify-center text-3xl font-semibold text-primary-foreground shadow-[0_16px_40px_-12px_oklch(0.65_0.22_290/0.6)]">
              {initials}
            </div>
            {profile?.plan && profile.plan !== "Free" && (
              <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                <BadgeCheck className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate">{form.full_name || "Sem nome"}</h2>
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />Desde {memberSince}
              </span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 text-[11px] font-medium">
                Plano {profile?.plan ?? "Free"}
              </span>
            </div>
            {form.bio && <p className="text-sm text-muted-foreground mt-3 max-w-xl">{form.bio}</p>}
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-3 gap-3 pt-6 border-t border-white/5">
          <MiniStat label="Cursos completos" value={completedCourses} />
          <MiniStat label="Aulas assistidas" value={totalCompletedLessons} />
          <MiniStat label="Conquistas" value={`${earnedBadges}/${badges.length}`} />
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold">Informações pessoais</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Atualize seus dados de contato e bio.</p>
          </div>
          <div className="p-5 grid sm:grid-cols-2 gap-4">
            <Field label="Nome completo" icon={User}>
              <input
                value={form.full_name}
                onChange={(e) => update({ full_name: e.target.value })}
                className={inputClass}
                placeholder="Seu nome"
              />
            </Field>
            <Field label="Email" icon={Mail}>
              <input
                value={user?.email ?? ""}
                disabled
                className={`${inputClass} opacity-60 cursor-not-allowed`}
              />
            </Field>
            <Field label="Telefone" icon={Phone}>
              <input
                value={form.phone}
                onChange={(e) => update({ phone: e.target.value })}
                className={inputClass}
                placeholder="(11) 99999-9999"
              />
            </Field>
            <Field label="Localização" icon={MapPin}>
              <input
                value={form.location}
                onChange={(e) => update({ location: e.target.value })}
                className={inputClass}
                placeholder="Cidade, País"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Bio" icon={FileText} hint="Conte um pouco sobre você.">
                <textarea
                  value={form.bio}
                  onChange={(e) => update({ bio: e.target.value })}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Designer, dev, curioso por novas tecnologias..."
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Conquistas</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{earnedBadges} de {badges.length} desbloqueadas</p>
            </div>
            <Trophy className="h-4 w-4 text-amber-400" />
          </div>
          <div className="p-4 grid grid-cols-3 gap-2">
            {badges.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.id}
                  className={`rounded-xl border p-3 flex flex-col items-center text-center transition ${
                    b.earned
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-white/5 bg-white/[0.01] opacity-40 grayscale"
                  }`}
                  title={b.label}
                >
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center mb-1.5 shadow-lg`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{b.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
