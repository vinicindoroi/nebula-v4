import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Clock, Award, Flame, Play, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Membros" }] }),
});

function Dashboard() {
  const { user } = useAuth();
  const { data: courses = [], isLoading } = useCourses();
  const name = ((user?.user_metadata as any)?.full_name || user?.email?.split("@")[0] || "Membro").split(" ")[0];

  const totalLessons = courses.reduce((s, c) => s + c.totalLessons, 0);
  const completedLessons = courses.reduce((s, c) => s + c.completedLessons, 0);
  const overall = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100);
  const completed = courses.filter((c) => c.progress === 100).length;
  const notStarted = courses.filter((c) => c.progress === 0);

  const stats = [
    { label: "Progresso geral", value: `${overall}%`, icon: TrendingUp, hint: `${completedLessons} de ${totalLessons} aulas`, accent: "primary" as const },
    { label: "Aulas concluídas", value: completedLessons, icon: Clock, hint: "no total", accent: "cyan" as const },
    { label: "Cursos completos", value: completed, icon: Award, hint: completed === 1 ? "concluído" : "concluídos", accent: "emerald" as const },
    { label: "Em andamento", value: inProgress.length, icon: Flame, hint: "continue!", accent: "amber" as const },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-primary/10 via-white/[0.02] to-transparent p-6 md:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary/80 mb-2">
            <Sparkles className="h-3 w-3" />Visão geral
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Olá, {name}</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            {inProgress.length > 0
              ? `Você tem ${inProgress.length} ${inProgress.length === 1 ? "curso" : "cursos"} em andamento. Continue de onde parou.`
              : "Comece um novo curso e construa o hábito de aprender todo dia."}
          </p>
          {inProgress[0] && (
            <Link
              to="/courses/$courseId"
              params={{ courseId: inProgress[0].id }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              Continuar "{inProgress[0].title}"
            </Link>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          const cls =
            s.accent === "emerald" ? "bg-emerald-500/10 text-emerald-400"
            : s.accent === "amber" ? "bg-amber-500/10 text-amber-400"
            : s.accent === "cyan" ? "bg-cyan-500/10 text-cyan-400"
            : "bg-primary/10 text-primary";
          return (
            <div key={s.label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 transition">
              <div className="flex items-center justify-between">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cls}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-semibold tabular-nums">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              <div className="text-[10px] text-muted-foreground/60 mt-0.5">{s.hint}</div>
            </div>
          );
        })}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Continue de onde parou</h2>
          <Link to="/courses" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {isLoading ? (
          <SkeletonGrid />
        ) : inProgress.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <div className="text-sm font-medium">Nenhum curso em andamento</div>
            <p className="text-xs text-muted-foreground mt-1">Explore o catálogo e comece sua jornada.</p>
            <Link to="/courses" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-medium">
              Explorar cursos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {inProgress.slice(0, 4).map((c) => (
              <CourseProgressCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>

      {notStarted.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Comece um novo</h2>
            <Link to="/courses" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notStarted.slice(0, 3).map((c) => (
              <Link
                key={c.id}
                to="/courses/$courseId"
                params={{ courseId: c.id }}
                className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-white/10 transition group"
              >
                <div className="aspect-[16/9] gradient-primary relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {c.tag && (
                    <span className="absolute top-3 left-3 bg-black/40 backdrop-blur-md text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-medium">
                      {c.tag}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-medium text-sm leading-tight">{c.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{c.totalLessons} aulas</span>
                    <span className="inline-flex items-center gap-1 text-primary group-hover:gap-2 transition-all">
                      Começar <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CourseProgressCard({ course }: { course: ReturnType<typeof useCourses>["data"] extends Array<infer T> | undefined ? T : never }) {
  const c = course!;
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: c.id }}
      className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-4 hover:border-white/10 hover:bg-white/[0.04] transition group"
    >
      <div className="h-14 w-14 shrink-0 rounded-xl gradient-primary flex items-center justify-center shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.5)] group-hover:scale-105 transition-transform">
        <Play className="h-5 w-5 text-primary-foreground" fill="currentColor" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{c.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {c.completedLessons} de {c.totalLessons} aulas
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full gradient-primary transition-all" style={{ width: `${c.progress}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{c.progress}%</span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 h-24 animate-pulse" />
      ))}
    </div>
  );
}
