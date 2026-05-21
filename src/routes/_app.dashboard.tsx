import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Clock, Award, Flame, Play, ArrowRight, BookOpen, Sparkles, Zap, Target, Trophy, Lock } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";
import { useAuth } from "@/hooks/use-auth";
import { useMemberProgress } from "@/hooks/use-member-progress";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Membros" }] }),
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function Dashboard() {
  const { user } = useAuth();
  const { data: courses = [], isLoading } = useCourses();
  const { data: memberProgress } = useMemberProgress();
  const name = ((user?.user_metadata as any)?.full_name || user?.email?.split("@")[0] || "Membro").split(" ")[0];

  const totalLessons = courses.reduce((s, c) => s + c.totalLessons, 0);
  const completedLessons = courses.reduce((s, c) => s + c.completedLessons, 0);
  const overall = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100);
  const completed = courses.filter((c) => c.progress === 100).length;
  const notStarted = courses.filter((c) => c.progress === 0);

  const streak = memberProgress?.streak;
  const achievements = memberProgress?.achievements ?? [];
  const lastLesson = memberProgress?.lastLesson;

  const stats = [
    { label: "Progresso geral", value: `${overall}%`, icon: TrendingUp, hint: `${completedLessons} de ${totalLessons} aulas`, accent: "primary" as const },
    { label: "Aulas concluídas", value: completedLessons, icon: Clock, hint: "no total", accent: "cyan" as const },
    { label: "Cursos completos", value: completed, icon: Award, hint: completed === 1 ? "concluído" : "concluídos", accent: "emerald" as const },
    { label: "Em andamento", value: inProgress.length, icon: Flame, hint: "continue!", accent: "amber" as const },
  ];

  return (
    <div className="space-y-6 stagger-enter">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-primary/[0.08] via-white/[0.02] to-transparent p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/[0.12] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 animate-[ambient-pulse_12s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/[0.06] rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4 animate-[ambient-pulse_15s_ease-in-out_infinite_2s]" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary/80 mb-2">
              <Sparkles className="h-3 w-3" />Visão geral
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {getGreeting()}, {name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
              {inProgress.length > 0
                ? `Você tem ${inProgress.length} ${inProgress.length === 1 ? "curso" : "cursos"} em andamento. Continue de onde parou.`
                : "Comece um novo curso e construa o hábito de aprender todo dia."}
            </p>
            {lastLesson && (
              <Link
                to="/courses/$courseId"
                params={{ courseId: lastLesson.courseId }}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] hover:shadow-[0_12px_32px_-8px_oklch(0.65_0.22_290/0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <Play className="h-3.5 w-3.5" fill="currentColor" />
                Continuar "{lastLesson.lessonTitle}"
              </Link>
            )}
            {!lastLesson && inProgress[0] && (
              <Link
                to="/courses/$courseId"
                params={{ courseId: inProgress[0].id }}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] hover:shadow-[0_12px_32px_-8px_oklch(0.65_0.22_290/0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <Play className="h-3.5 w-3.5" fill="currentColor" />
                Continuar "{inProgress[0].title}"
              </Link>
            )}
          </div>

          {/* Streak Widget */}
          {streak && (
            <div className="shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 min-w-[180px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Flame className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-xl font-bold tabular-nums">{streak.currentStreak}</div>
                  <div className="text-[10px] text-muted-foreground -mt-0.5">dias seguidos</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {streak.weekDays.map((day, i) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-medium transition-all ${
                        day.active
                          ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
                          : "bg-white/[0.04] text-muted-foreground/40"
                      }`}
                    >
                      {day.active ? "✓" : DAY_LABELS[new Date(day.date + "T12:00:00").getDay()]}
                    </div>
                  </div>
                ))}
              </div>
              {!streak.todayDone && streak.currentStreak > 0 && (
                <p className="text-[10px] text-amber-400/70 mt-2 text-center">Estude hoje para manter o streak!</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          const accentStyles = {
            primary: { bg: "bg-primary/10", text: "text-primary", glow: "group-hover:shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.3)]" },
            cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", glow: "group-hover:shadow-[0_8px_24px_-8px_oklch(0.7_0.15_200/0.3)]" },
            emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "group-hover:shadow-[0_8px_24px_-8px_oklch(0.7_0.15_160/0.3)]" },
            amber: { bg: "bg-amber-500/10", text: "text-amber-400", glow: "group-hover:shadow-[0_8px_24px_-8px_oklch(0.7_0.15_80/0.3)]" },
          }[s.accent];
          return (
            <div
              key={s.label}
              className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 ${accentStyles.glow}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`absolute -top-8 -right-8 w-20 h-20 rounded-full ${accentStyles.bg} blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${accentStyles.bg} ring-1 ring-white/[0.06]`}>
                    <Icon className={`h-4 w-4 ${accentStyles.text}`} />
                  </div>
                  <div className={`h-1.5 w-1.5 rounded-full ${accentStyles.bg} ${accentStyles.text} animate-pulse`} />
                </div>
                <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
                <div className="text-[10px] text-muted-foreground/50 mt-0.5">{s.hint}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Achievements */}
      {achievements.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <h2 className="text-base font-semibold">Conquistas</h2>
              <span className="text-[10px] text-muted-foreground/60 ml-1">
                {achievements.filter((a) => a.unlocked).length}/{achievements.length}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`relative rounded-xl border p-3 text-center transition-all duration-300 ${
                  a.unlocked
                    ? "border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
                    : "border-white/[0.06] bg-white/[0.02] opacity-60"
                }`}
              >
                <div className="text-2xl mb-1.5">{a.icon}</div>
                <div className="text-[11px] font-medium leading-tight">{a.title}</div>
                {!a.unlocked && a.progress !== undefined && (
                  <div className="mt-2">
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full gradient-primary rounded-full" style={{ width: `${a.progress}%` }} />
                    </div>
                    <div className="text-[9px] text-muted-foreground/50 mt-0.5">{a.current}/{a.target}</div>
                  </div>
                )}
                {a.unlocked && (
                  <div className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="text-[8px]">✓</span>
                  </div>
                )}
                {!a.unlocked && (
                  <Lock className="absolute top-1.5 right-1.5 h-3 w-3 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Last lesson detail + Continue */}
      {lastLesson && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-base font-semibold">Última atividade</h2>
            </div>
          </div>
          <Link
            to="/courses/$courseId"
            params={{ courseId: lastLesson.courseId }}
            className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 hover:shadow-[0_8px_32px_-12px_oklch(0.65_0.22_290/0.2)]"
          >
            <div className="h-14 w-14 shrink-0 rounded-xl gradient-primary flex items-center justify-center shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.5)] group-hover:scale-105 transition-transform duration-300">
              <Play className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground/60 mb-0.5">
                {lastLesson.courseTitle}{lastLesson.moduleName ? ` · ${lastLesson.moduleName}` : ""}
              </div>
              <div className="font-medium text-sm truncate">{lastLesson.lessonTitle}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Concluída {formatDistanceToNow(new Date(lastLesson.completedAt), { addSuffix: true, locale: ptBR })}
              </div>
            </div>
            <div className="shrink-0 text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Continuar <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        </section>
      )}

      {/* Continue where you left off */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <BookOpen className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <h2 className="text-base font-semibold">Cursos em andamento</h2>
          </div>
          <Link to="/courses" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors group">
            Ver todos <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        {isLoading ? (
          <SkeletonGrid />
        ) : inProgress.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-primary/60" />
            </div>
            <div className="text-sm font-medium">Nenhum curso em andamento</div>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">Explore o catálogo e comece sua jornada de aprendizado.</p>
            <Link to="/courses" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-xs font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all">
              Explorar cursos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {inProgress.slice(0, 4).map((c, i) => (
              <CourseProgressCard key={c.id} course={c} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Start a new course */}
      {notStarted.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <h2 className="text-base font-semibold">Comece um novo</h2>
            </div>
            <Link to="/courses" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 group">
              Ver todos <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notStarted.slice(0, 3).map((c, i) => (
              <NewCourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CourseProgressCard({ course, index }: { course: ReturnType<typeof useCourses>["data"] extends Array<infer T> | undefined ? T : never; index: number }) {
  const c = course!;
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: c.id }}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-4 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 hover:shadow-[0_8px_32px_-12px_oklch(0.65_0.22_290/0.2)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="h-14 w-14 shrink-0 rounded-xl gradient-primary flex items-center justify-center shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.5)] group-hover:scale-105 group-hover:shadow-[0_12px_32px_-8px_oklch(0.65_0.22_290/0.6)] transition-all duration-300">
        <Play className="h-5 w-5 text-primary-foreground" fill="currentColor" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate group-hover:text-foreground transition-colors">{c.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {c.completedLessons} de {c.totalLessons} aulas
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${c.progress}%` }} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums w-8 text-right">{c.progress}%</span>
        </div>
      </div>
    </Link>
  );
}

function NewCourseCard({ course, index }: { course: ReturnType<typeof useCourses>["data"] extends Array<infer T> | undefined ? T : never; index: number }) {
  const c = course!;
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: c.id }}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] hover:shadow-[0_8px_32px_-12px_oklch(0.65_0.22_290/0.15)] transition-all duration-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="aspect-[16/9] relative overflow-hidden">
        {c.cover_url && (
          <img src={c.cover_url} alt={c.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${c.gradient_from || "#6366f1"}, ${(c.gradient_to || "#8b5cf6")}00)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {c.tag && (
          <span className="absolute top-3 left-3 bg-black/40 backdrop-blur-md text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg font-medium border border-white/[0.08]">
            {c.tag}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center shadow-[0_8px_24px_-4px_oklch(0.65_0.22_290/0.6)] scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="h-5 w-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="font-medium text-sm leading-tight group-hover:text-foreground transition-colors">{c.title}</div>
        <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.description}</div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {c.totalLessons} aulas
          </span>
          <span className="inline-flex items-center gap-1 text-primary font-medium group-hover:gap-1.5 transition-all">
            Começar <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 h-24 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
              <div className="h-2 w-1/3 rounded bg-white/[0.04]" />
              <div className="h-1.5 w-full rounded-full bg-white/[0.04]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
