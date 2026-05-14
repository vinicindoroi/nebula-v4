import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle, Heart, Trash2, Send, Users, Image as ImageIcon, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/community")({
  component: CommunityPage,
  head: () => ({ meta: [{ title: "Comunidade — Membros" }] }),
});

type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: { full_name: string | null; avatar_url: string | null } | null;
  likes: number;
  liked: boolean;
  comments: number;
};

const MAX = 2000;

function CommunityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Post[]> => {
      const [pRes, lRes, cRes, profRes] = await Promise.all([
        supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("post_likes").select("post_id, user_id"),
        supabase.from("comments").select("post_id"),
        supabase.from("profiles").select("id, full_name, avatar_url"),
      ]);
      if (pRes.error) throw pRes.error;
      const profs = new Map((profRes.data ?? []).map((p) => [p.id, p]));
      const likes = lRes.data ?? [];
      const comments = cRes.data ?? [];
      return (pRes.data ?? []).map((p) => ({
        ...p,
        author: profs.get(p.user_id) ?? null,
        likes: likes.filter((l) => l.post_id === p.id).length,
        liked: likes.some((l) => l.post_id === p.id && l.user_id === user!.id),
        comments: comments.filter((c) => c.post_id === p.id).length,
      }));
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const content = text.trim();
      if (!content) return;
      const { error } = await supabase.from("posts").insert({ user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Publicado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user!.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, liked }) => {
      await qc.cancelQueries({ queryKey: ["posts"] });
      const prev = qc.getQueryData<Post[]>(["posts", user?.id]);
      qc.setQueryData<Post[]>(["posts", user?.id], (old) =>
        (old ?? []).map((p) => (p.id === postId ? { ...p, liked: !liked, likes: p.likes + (liked ? -1 : 1) } : p))
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => ctx?.prev && qc.setQueryData(["posts", user?.id], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const initials = ((user?.user_metadata as any)?.full_name || user?.email || "M").slice(0, 2).toUpperCase();
  const remaining = MAX - text.length;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comunidade</h1>
          <p className="text-sm text-muted-foreground mt-1">Compartilhe ideias e conecte-se com outros membros.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{posts.length} {posts.length === 1 ? "publicação" : "publicações"}</span>
        </div>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              placeholder="O que você quer compartilhar?"
              rows={3}
              className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
              <div className="flex gap-1 text-muted-foreground">
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-white/5 hover:text-foreground transition"
                  title="Em breve"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-white/5 hover:text-foreground transition"
                  title="Em breve"
                >
                  <Smile className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[11px] tabular-nums ${remaining < 100 ? "text-amber-400" : "text-muted-foreground/60"}`}>
                  {remaining}
                </span>
                <button
                  onClick={() => create.mutate()}
                  disabled={!text.trim() || create.isPending}
                  className="gradient-primary text-primary-foreground rounded-xl px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 transition"
                >
                  <Send className="h-3.5 w-3.5" />
                  {create.isPending ? "Enviando..." : "Publicar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
          <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" strokeWidth={1.5} />
          <div className="text-sm font-medium">Silêncio total por aqui</div>
          <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a publicar algo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const name = p.author?.full_name || "Membro";
            const initial = name[0]?.toUpperCase() || "M";
            const time = formatTime(p.created_at);
            const mine = p.user_id === user?.id;
            return (
              <article
                key={p.id}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:border-white/10 transition group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{name}</div>
                    <div className="text-[11px] text-muted-foreground">{time}</div>
                  </div>
                  {mine && (
                    <button
                      onClick={() => { if (confirm("Apagar publicação?")) remove.mutate(p.id); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
                      aria-label="Apagar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{p.content}</p>
                <div className="flex items-center gap-1 mt-4">
                  <button
                    onClick={() => toggleLike.mutate({ postId: p.id, liked: p.liked })}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition ${
                      p.liked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <Heart className="h-3.5 w-3.5" fill={p.liked ? "currentColor" : "none"} />
                    <span className="tabular-nums">{p.likes}</span>
                  </button>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{p.comments}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
