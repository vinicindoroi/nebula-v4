import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Play, ArrowLeft, Lock, Download, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useAddXp } from "@/hooks/use-xp";
import { NebulaPlayer, type Chapter } from "@/components/player/NebulaPlayer";
import { LessonComments } from "@/components/lessons/LessonComments";
import { getSignedVideoUrl, isStoragePath, getAttachmentDownloadUrl } from "@/lib/storage";
import {
  usePlayerSettings,
  useVideoProgress,
  useSaveVideoProgress,
  useBookmarks,
  useAddBookmark,
  useRemoveBookmark,
} from "@/hooks/use-player-settings";

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
  video_path: string | null;
  poster_url: string | null;
  captions_url: string | null;
  chapters: Chapter[] | null;
  content: string | null;
  is_free: boolean | null;
  is_premium: boolean | null;
  offer_id: string | null;
  module_id: string | null;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_premium: boolean | null;
  offer_id: string | null;
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
      const [c, m, l, p, o, prof] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("modules").select("*").eq("course_id", courseId).order("position"),
        supabase.from("lessons").select("*").eq("course_id", courseId).order("position"),
        supabase.from("lesson_progress").select("lesson_id").eq("user_id", user!.id),
        supabase.from("offers").select("*").eq("active", true),
        (supabase as any).from("profiles").select("plan").eq("id", user!.id).maybeSingle(),
      ]);
      if (c.error) throw c.error;
      if (l.error) throw l.error;
      const done = new Set((p.data ?? []).map((x) => x.lesson_id));
      return {
        course: c.data,
        modules: (m.data ?? []) as Module[],
        lessons: (l.data ?? []) as unknown as Lesson[],
        done,
        offers: (o.data ?? []) as Array<{ id: string; name: string; description: string | null; price: number; checkout_url: string; badge_text: string | null }>,
        userPlan: ((prof.data?.plan as string) ?? "free").toLowerCase(),
      };
    },
  });

  useEffect(() => {
    if (data?.lessons.length && !activeLessonId) {
      setActiveLessonId(data.lessons[0].id);
    }
  }, [data, activeLessonId]);

  const addXp = useAddXp();

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
        addXp.mutate("complete_lesson");
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

  const { course, modules, lessons, done, offers, userPlan } = data;
  const total = lessons.length;
  const completed = lessons.filter((l) => done.has(l.id)).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0];

  // Access level logic: check user plan against course access_level
  const planHierarchy: Record<string, number> = { free: 0, pro: 1, premium: 2 };
  const userLevel = planHierarchy[userPlan] ?? 0;
  const courseAccessLevel = (course.access_level ?? "free").toLowerCase();
  const courseLevel = planHierarchy[courseAccessLevel] ?? 0;
  const accessDenied = userLevel < courseLevel;

  // Premium offer logic (for individual lessons/modules with offer_id)
  const getOffer = (offerId: string | null | undefined) => offers.find((o) => o.id === offerId);
  const activeModule = modules.find((m) => m.id === activeLesson?.module_id);
  const modulePremium = activeModule?.is_premium && activeModule?.offer_id;
  const lessonPremium = activeLesson?.is_premium && activeLesson?.offer_id;
  const premiumOfferId = lessonPremium ? activeLesson.offer_id : modulePremium ? activeModule.offer_id : null;
  const premiumOffer = premiumOfferId ? getOffer(premiumOfferId) : null;
  const isLocked = accessDenied || !!premiumOffer;

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

      <header className="glass-strong rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0">
          {course.cover_url && (
            <img src={course.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${course.gradient_from || "#6366f1"}, ${(course.gradient_to || "#8b5cf6")}00)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        </div>
        <div className="relative p-6">
          {course.tag && <span className="text-[10px] uppercase tracking-wider text-primary bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full">{course.tag}</span>}
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1 text-white drop-shadow-lg">{course.title}</h1>
          {course.description && <p className="text-sm text-white/70 mt-2">{course.description}</p>}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full gradient-primary" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-white/80">{completed}/{total} • {progress}%</span>
          </div>
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
            {isLocked ? (
              <div className="aspect-video w-full rounded-2xl glass relative overflow-hidden flex flex-col items-center justify-center text-center p-8">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                    <Lock className="h-7 w-7 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {accessDenied ? `Conteúdo ${courseAccessLevel.charAt(0).toUpperCase() + courseAccessLevel.slice(1)}` : "Conteúdo Premium"}
                  </h3>
                  <p className="text-sm text-white/60 mt-2 max-w-sm">
                    {accessDenied
                      ? `Este curso requer o plano ${courseAccessLevel.charAt(0).toUpperCase() + courseAccessLevel.slice(1)}. Faça upgrade para desbloquear.`
                      : premiumOffer?.description || "Desbloqueie este conteúdo para ter acesso completo."}
                  </p>
                  {premiumOffer && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <span className="text-2xl font-bold text-white">R$ {Number(premiumOffer.price).toFixed(2)}</span>
                      {premiumOffer.badge_text && (
                        <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 font-medium">{premiumOffer.badge_text}</span>
                      )}
                      <a
                        href={premiumOffer.checkout_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 gradient-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] hover:scale-105 transition-transform"
                      >
                        Desbloquear agora
                      </a>
                    </div>
                  )}
                  {accessDenied && !premiumOffer && (
                    <div className="mt-4">
                      <a
                        href="/settings"
                        className="gradient-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] hover:scale-105 transition-transform inline-block"
                      >
                        Fazer upgrade
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <LessonPlayer
                lesson={activeLesson}
                lessons={lessons}
                onNextLesson={(nextId) => setActiveLessonId(nextId)}
              />
            )}

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

            {/* Comentários da aula */}
            <LessonAttachments lessonId={activeLesson.id} />
            <LessonComments lessonId={activeLesson.id} />
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
                    <div className="px-2 pt-2 pb-1 text-xs font-medium text-foreground/80 flex items-center gap-2">
                      {mod.title}
                      {mod.is_premium && <Lock className="h-3 w-3 text-amber-400" />}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {items.map((l, i) => {
                      const isDone = done.has(l.id);
                      const isActive = l.id === activeLesson.id;
                      const lMod = modules.find((m) => m.id === l.module_id);
                      const lLocked = accessDenied || (l.is_premium && l.offer_id) || (lMod?.is_premium && lMod?.offer_id);
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
                              lLocked
                                ? "bg-amber-500/10 text-amber-400"
                                : isDone
                                  ? "gradient-primary text-primary-foreground"
                                  : isActive
                                    ? "bg-primary/20 text-primary"
                                    : "bg-white/5 text-muted-foreground"
                            }`}
                          >
                            {lLocked ? <Lock className="h-3 w-3" /> : isDone ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3 w-3" fill="currentColor" />}
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
                          {lLocked && !l.is_free && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase">
                              Premium
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

function LessonPlayer({ lesson, lessons, onNextLesson }: { lesson: Lesson; lessons: Lesson[]; onNextLesson: (id: string) => void }) {
  const { user } = useAuth();
  const { data: settings, isLoading: settingsLoading } = usePlayerSettings();
  const { data: videoProgress } = useVideoProgress(lesson.id, user?.id);
  const saveProgress = useSaveVideoProgress();
  const { data: bookmarks = [] } = useBookmarks(lesson.id, user?.id);
  const addBookmark = useAddBookmark();
  const removeBookmark = useRemoveBookmark();
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolvedPoster, setResolvedPoster] = useState<string | null>(null);

  const url = lesson.video_url?.trim() || lesson.video_path?.trim();

  // Resolve signed URL for Supabase storage paths
  useEffect(() => {
    if (!url) { setResolvedUrl(null); return; }
    if (isStoragePath(url)) {
      getSignedVideoUrl(url).then(setResolvedUrl).catch(() => setResolvedUrl(null));
    } else {
      setResolvedUrl(url);
    }
  }, [url]);

  // Resolve poster URL
  useEffect(() => {
    const poster = lesson.poster_url?.trim();
    if (!poster) { setResolvedPoster(null); return; }
    if (isStoragePath(poster)) {
      getSignedVideoUrl(poster).then(setResolvedPoster).catch(() => setResolvedPoster(null));
    } else {
      setResolvedPoster(poster);
    }
  }, [lesson.poster_url]);

  const handleProgress = useCallback((time: number, duration: number) => {
    if (!user?.id || !lesson.id) return;
    saveProgress.mutate({
      userId: user.id,
      lessonId: lesson.id,
      currentTime: time,
      duration,
    });
  }, [user?.id, lesson.id, saveProgress]);

  const handleAddBookmark = useCallback((time: number) => {
    if (!user?.id) return;
    const label = prompt("Nome do marcador (opcional):");
    addBookmark.mutate({
      userId: user.id,
      lessonId: lesson.id,
      timeSeconds: time,
      label: label || undefined,
    });
    toast.success("Marcador adicionado");
  }, [user?.id, lesson.id, addBookmark]);

  const handleRemoveBookmark = useCallback((id: string) => {
    if (!user?.id) return;
    removeBookmark.mutate({ id, lessonId: lesson.id, userId: user.id });
  }, [user?.id, lesson.id, removeBookmark]);

  const handleEnded = useCallback(() => {
    if (!settings?.autoplay_next) return;
    const currentIdx = lessons.findIndex((l) => l.id === lesson.id);
    const next = lessons[currentIdx + 1];
    if (next) {
      onNextLesson(next.id);
      toast.info(`Avançando para: ${next.title}`);
    }
  }, [settings?.autoplay_next, lessons, lesson.id, onNextLesson]);

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

  // If it's an embeddable URL (YouTube, Vimeo, etc.), use iframe
  const embed = toEmbedUrl(url);
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

  // Custom player for direct video files
  if (!resolvedUrl) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-black border border-white/10 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando player...</div>
      </div>
    );
  }

  return (
    <NebulaPlayer
      src={resolvedUrl}
      poster={resolvedPoster}
      title={lesson.title}
      captionsUrl={lesson.captions_url}
      chapters={lesson.chapters}
      settings={settings!}
      startAt={videoProgress?.current_time ?? 0}
      bookmarks={bookmarks}
      onProgress={handleProgress}
      onAddBookmark={handleAddBookmark}
      onRemoveBookmark={handleRemoveBookmark}
      onEnded={handleEnded}
    />
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

function LessonAttachments({ lessonId }: { lessonId: string }) {
  type Attachment = { id: string; file_name: string; file_path: string; file_size: number; mime_type: string | null };
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("lesson_attachments")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at")
      .then(({ data }) => setAttachments((data ?? []) as Attachment[]));
  }, [lessonId]);

  if (attachments.length === 0) return null;

  const handleDownload = async (att: Attachment) => {
    setDownloading(att.id);
    try {
      const url = await getAttachmentDownloadUrl(att.file_path);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.file_name;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      toast.error("Erro ao baixar arquivo");
    } finally {
      setDownloading(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Materiais para download</h3>
      </div>
      <div className="space-y-2">
        {attachments.map((att) => (
          <button
            key={att.id}
            onClick={() => handleDownload(att)}
            disabled={downloading === att.id}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-primary/30 hover:bg-white/[0.05] transition text-left group disabled:opacity-50"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition">
              <Download className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{att.file_name}</div>
              <div className="text-[10px] text-muted-foreground">{formatSize(att.file_size)}</div>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
              {downloading === att.id ? "Baixando..." : "Download"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
