import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Play, ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/courses/$courseId")({
  component: CourseDetail,
});

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  duration: number | null;
  duration_min: number | null;
  video_url: string | null;
  content: string | null;
  is_free: boolean | null;
  module_id: string | null;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  position: number;
};

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["course", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [c, m, l, p] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("modules").select("*").eq("course_id", courseId).order("position"),
        supabase.from("lessons").select("*").eq("course_id", courseId).order("position"),
        supabase.from("lesson_progress").select("lesson_id").eq("user_id", user!.id),
      ]);
      if (c.error) throw c.error;
      if (l.error) throw l.error;
      const done = new Set((p.data ?? []).map((x) => x.lesson_id));
      return {
        course: c.data,
        modules: (m.data ?? []) as Module[],
        lessons: (l.data ?? []) as Lesson[],
        done,
      };
    },
  });

  useEffect(() => {
    if (data?.lessons.length && !activeLessonId) {
      setActiveLessonId(data.lessons[0].id);
    }
  }, [data, activeLessonId]);

  const toggle = useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase
          .from("lesson_progress")
          .delete()
          .eq("user_id", user!.id)
          .eq("lesson_id", lessonId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lesson_progress")
          .insert({ user_id: user!.id, lesson_id: lessonId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (error || !data) return <div className="text-sm text-red-400">Erro ao carregar curso.</div>;

  const { course, modules, lessons, done } = data;
  const total = lessons.length;
  const completed = lessons.filter((l) => done.has(l.id)).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0];

  // group lessons by module, plus orphans (no module_id)
  const orphans = lessons.filter((l) => !l.module_id);
  const grouped: Array<{ mod: Module | null; items: Lesson[] }> = [
    ...modules.map((mod) => ({ mod, items: lessons.filter((l) => l.module_id === mod.id) })),
    ...(orphans.length ? [{ mod: null as Module | null, items: orphans }] : []),
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <Link to="/courses" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <header className="glass-strong rounded-2xl p-6">
        {course.tag && <span className="text-[10px] uppercase tracking-wider text-primary">{course.tag}</span>}
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">{course.title}</h1>
        {course.description && <p className="text-sm text-muted-foreground mt-2">{course.description}</p>}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full gradient-primary" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{completed}/{total} • {progress}%</span>
        </div>
      </header>

      {total === 0 ? (
        <div className="glass rounded-2xl p-8 text-sm text-muted-foreground text-center">
          Este curso ainda não possui aulas. Adicione aulas em <span className="text-foreground">Admin → Módulos & Aulas</span>.
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Player + content */}
          <div className="space-y-4 min-w-0">
            <LessonPlayer lesson={activeLesson} />

            <div className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">
                    Aula {(activeLesson.position ?? 0) + 1}
                    {activeLesson.duration || activeLesson.duration_min
                      ? ` • ${activeLesson.duration ?? activeLesson.duration_min} min`
                      : ""}
                  </div>
                  <h2 className="text-lg font-semibold mt-1">{activeLesson.title}</h2>
                </div>
                <button
                  onClick={() =>
                    toggle.mutate({ lessonId: activeLesson.id, completed: done.has(activeLesson.id) })
                  }
                  disabled={toggle.isPending}
                  className={`shrink-0 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
                    done.has(activeLesson.id)
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "gradient-primary text-primary-foreground"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  {done.has(activeLesson.id) ? "Concluída" : "Marcar como concluída"}
                </button>
              </div>

              {activeLesson.description && (
                <p className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap">
                  {activeLesson.description}
                </p>
              )}
              {activeLesson.content && (
                <div className="mt-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {activeLesson.content}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar com módulos/aulas */}
          <aside className="glass rounded-2xl p-3 h-fit lg:sticky lg:top-4">
            <div className="px-2 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Conteúdo do curso
            </div>
            <div className="space-y-3">
              {grouped.map(({ mod, items }) => (
                <div key={mod?.id ?? "orphans"}>
                  {mod && (
                    <div className="px-2 pt-2 pb-1 text-xs font-medium text-foreground/80">
                      {mod.title}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {items.map((l, i) => {
                      const isDone = done.has(l.id);
                      const isActive = l.id === activeLesson.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => setActiveLessonId(l.id)}
                          className={`w-full text-left px-2 py-2 rounded-lg flex items-center gap-3 transition ${
                            isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div
                            className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
                              isDone
                                ? "gradient-primary text-primary-foreground"
                                : isActive
                                  ? "bg-primary/20 text-primary"
                                  : "bg-white/5 text-muted-foreground"
                            }`}
                          >
                            {isDone ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3 w-3" fill="currentColor" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                              {String(i + 1).padStart(2, "0")} · {l.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {l.duration ?? l.duration_min ?? 0} min
                            </div>
                          </div>
                          {l.is_free && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase">
                              Free
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const url = lesson.video_url?.trim();
  const embed = url ? toEmbedUrl(url) : null;

  if (!url) {
    return (
      <div className="aspect-video w-full rounded-2xl glass flex flex-col items-center justify-center text-center p-6">
        <Lock className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <div className="text-sm font-medium">Sem vídeo cadastrado</div>
        <div className="text-xs text-muted-foreground mt-1">
          Adicione a URL do vídeo em <span className="text-foreground">Admin → Módulos & Aulas → Editar aula</span>.
        </div>
      </div>
    );
  }

  if (embed) {
    return (
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10">
        <iframe
          key={embed}
          src={embed}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  // direct video file (mp4/webm etc)
  return (
    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10">
      <video key={url} src={url} controls className="w-full h-full" />
    </div>
  );
}

function toEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname.startsWith("/embed/")) return raw;
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/shorts/")) {
        const sid = u.pathname.split("/")[2];
        return sid ? `https://www.youtube.com/embed/${sid}` : null;
      }
    }

    // Vimeo
    if (host.endsWith("vimeo.com")) {
      if (host === "player.vimeo.com") return raw;
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }

    // Loom
    if (host.endsWith("loom.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("share");
      const id = idx >= 0 ? parts[idx + 1] : parts[parts.length - 1];
      return id ? `https://www.loom.com/embed/${id}` : null;
    }

    // Bunny / iframe-ready providers — passa direto
    if (host.includes("mediadelivery.net") || host.includes("iframe.mediadelivery") || host.includes("b-cdn.net")) {
      return raw;
    }

    // arquivos diretos: deixa o <video> tratar
    if (/\.(mp4|webm|ogg|mov|m3u8)$/i.test(u.pathname)) return null;

    // fallback: tenta como iframe
    return raw;
  } catch {
    return null;
  }
}
