import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import {
  MessageCircle, Heart, Trash2, Send, Image as ImageIcon,
  X, ChevronDown, ChevronUp, CornerDownRight, Bookmark,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MembersSidebar } from "@/components/members/MembersSidebar";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { notifyUser } from "@/lib/notify";
import { useSavedPosts, useToggleSave } from "@/hooks/use-saved-posts";
import { useAddXp, getLevel, useXp } from "@/hooks/use-xp";

export const Route = createFileRoute("/_app/community")({
  component: CommunityPage,
  head: () => ({ meta: [{ title: "Comunidade — Membros" }] }),
});

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author: { full_name: string | null; avatar_url: string | null; instagram: string | null; xp?: number | null } | null;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author: { full_name: string | null; avatar_url: string | null; instagram: string | null; xp?: number | null } | null;
  likes: number;
  liked: boolean;
  comments: Comment[];
  commentCount: number;
};

const MAX = 2000;
const db = supabase as any;

function CommunityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: savedPosts = [] } = useSavedPosts();
  const toggleSave = useToggleSave();
  const addXp = useAddXp();
  const { data: myXp = 0 } = useXp();

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("community-realtime")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "posts" }, () => {
        qc.invalidateQueries({ queryKey: ["posts"] });
      })
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "comments" }, () => {
        qc.invalidateQueries({ queryKey: ["posts"] });
      })
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "post_likes" }, () => {
        qc.invalidateQueries({ queryKey: ["posts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Post[]> => {
      const [pRes, lRes, cRes, profRes] = await Promise.all([
        db.from("posts").select("*").order("created_at", { ascending: false }).limit(50),
        db.from("post_likes").select("post_id, user_id"),
        db.from("comments").select("*").order("created_at", { ascending: true }),
        db.from("profiles").select("id, full_name, avatar_url, instagram, xp"),
      ]);
      if (pRes.error) throw pRes.error;
      const profs = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
      const likes = lRes.data ?? [];
      const comments = (cRes.data ?? []).map((c: any) => ({
        ...c,
        author: profs.get(c.user_id) ?? null,
      }));
      return (pRes.data ?? []).map((p: any) => {
        const postComments = comments.filter((c: any) => c.post_id === p.id);
        return {
          ...p,
          author: profs.get(p.user_id) ?? null,
          likes: likes.filter((l: any) => l.post_id === p.id).length,
          liked: likes.some((l: any) => l.post_id === p.id && l.user_id === user!.id),
          comments: postComments,
          commentCount: postComments.length,
        };
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const create = useMutation({
    mutationFn: async () => {
      const content = text.trim();
      if (!content && !imageFile) return;
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("community").upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("community").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }
      const { error } = await db.from("posts").insert({
        user_id: user!.id,
        content: content || null,
        image_url,
      });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); removeImage(); qc.invalidateQueries({ queryKey: ["posts"] }); toast.success("Publicado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        await db.from("post_likes").delete().eq("post_id", postId).eq("user_id", user!.id);
      } else {
        await db.from("post_likes").insert({ post_id: postId, user_id: user!.id });
        const post = posts.find((p) => p.id === postId);
        if (post) {
          const actorName = (user?.user_metadata as any)?.full_name || user?.email?.split("@")[0] || "Alguém";
          notifyUser({ recipientId: post.user_id, actorId: user!.id, title: "Nova curtida no seu post", content: `${actorName} curtiu seu post na comunidade` });
        }
        addXp.mutate("like");
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
    mutationFn: async (id: string) => { await db.from("posts").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const initials = ((user?.user_metadata as any)?.full_name || user?.email || "M").slice(0, 2).toUpperCase();
  const remaining = MAX - text.length;

  return (
    <div className="flex justify-center gap-6 max-w-7xl mx-auto px-4">
      {/* Coluna Esquerda: Perfil & XP */}
      <div className="hidden lg:block w-64 shrink-0">
        <ProfileSidebarWidget />
      </div>

      {/* Coluna Central: Feed */}
      <div className="flex-1 max-w-2xl space-y-5 py-2 min-w-0">
        {/* Header */}
        <div className="text-center space-y-1 pb-2">
          <div className="inline-flex items-center gap-2 text-xs text-primary/80 font-medium">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{posts.length} publicações</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Comunidade</h1>
          <p className="text-sm text-muted-foreground">Compartilhe, conecte-se e inspire.</p>
        </div>

        {/* Composer */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <Avatar initials={initials} xp={myXp} />
              <span className="text-sm font-medium text-foreground/80">Nova publicação</span>
            </div>
            <RichTextEditor
              content={text}
              onChange={(html) => setText(html.slice(0, MAX))}
              placeholder="O que está pensando?"
              minHeight="80px"
            />
          </div>

          {imagePreview && (
            <div className="relative mx-5 mb-3 rounded-xl overflow-hidden border border-white/10 max-h-56">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover max-h-56" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
            <div className="flex gap-1 text-muted-foreground">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageSelect} />
              <button type="button" onClick={() => fileRef.current?.click()} className="p-2 rounded-xl hover:bg-white/5 hover:text-foreground transition" title="Imagem">
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] tabular-nums ${remaining < 100 ? "text-amber-400" : "text-muted-foreground/40"}`}>{remaining}</span>
              <button
                onClick={() => create.mutate()}
                disabled={(!text.trim() && !imageFile) || create.isPending}
                className="gradient-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-medium flex items-center gap-2 disabled:opacity-40 transition shadow-[0_4px_16px_-4px_oklch(0.65_0.22_290/0.5)]"
              >
                <Send className="h-3.5 w-3.5" />
                {create.isPending ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 h-36 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" strokeWidth={1.2} />
            <div className="text-sm font-medium">Nenhuma publicação ainda</div>
            <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a compartilhar algo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                userId={user!.id}
                saved={savedPosts.some((s) => s.post_id === p.id)}
                onLike={() => toggleLike.mutate({ postId: p.id, liked: p.liked })}
                onDelete={() => { if (confirm("Apagar publicação?")) remove.mutate(p.id); }}
                onSave={() => toggleSave.mutate({ postId: p.id, postType: "community", saved: savedPosts.some((s) => s.post_id === p.id) })}
              />
            ))}
          </div>
        )}
      </div>
      <MembersSidebar />
    </div>
  );
}

/* ─── ProfileSidebarWidget ─── */

function ProfileSidebarWidget() {
  const { user } = useAuth();
  const { data: xp = 0 } = useXp();

  const { data: myProfile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, instagram, plan")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const name = myProfile?.full_name || user?.user_metadata?.full_name || "Membro";
  const initials = name.slice(0, 2).toUpperCase();
  const levelInfo = getLevel(xp);

  const getRankColor = (lvl: number) => {
    if (lvl >= 8) return "from-yellow-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]";
    if (lvl >= 7) return "from-fuchsia-500 to-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.4)]";
    if (lvl >= 6) return "from-violet-500 to-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.4)]";
    if (lvl >= 5) return "from-blue-500 to-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]";
    if (lvl >= 4) return "from-teal-500 to-emerald-500";
    if (lvl >= 3) return "from-emerald-500 to-green-500";
    if (lvl >= 2) return "from-orange-500 to-red-500";
    return "from-slate-500 to-slate-600";
  };

  const rankColor = getRankColor(levelInfo.level);

  return (
    <div className="sticky top-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden shadow-xl">
      {/* Banner Capa */}
      <div className="h-20 w-full bg-gradient-to-r from-violet-600/30 via-primary/30 to-pink-600/30 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
      </div>

      {/* Avatar flutuante e Informações básicas */}
      <div className="relative px-4 pb-4 pt-10 text-center flex flex-col items-center border-b border-white/[0.06]">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          {myProfile?.avatar_url ? (
            <img
              src={myProfile.avatar_url}
              alt={name}
              className="h-16 w-16 rounded-2xl object-cover border-2 border-background shadow-lg ring-2 ring-white/10"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center text-xl font-bold text-white border-2 border-background shadow-lg ring-2 ring-white/10">
              {initials}
            </div>
          )}
        </div>

        <h3 className="text-sm font-semibold truncate max-w-full text-foreground/90">{name}</h3>
        {myProfile?.instagram && (
          <a
            href={`https://instagram.com/${myProfile.instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-pink-400/80 hover:text-pink-400 transition mt-0.5 flex items-center gap-1"
          >
            @{myProfile.instagram.replace("@", "")}
          </a>
        )}
        {myProfile?.plan && myProfile.plan !== "Free" && (
          <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-semibold text-primary uppercase tracking-wider">
            {myProfile.plan}
          </span>
        )}
      </div>

      {/* XP e Gamificação */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r ${rankColor}`}>
              Nível {levelInfo.level}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground/80">{levelInfo.title}</span>
          </div>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">
            {levelInfo.currentXp} / {levelInfo.nextLevelXp} XP
          </span>
        </div>

        {/* Barra de Progresso */}
        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden border border-white/[0.04] p-[1px]">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${rankColor} transition-all duration-500`}
            style={{ width: `${Math.min(100, (levelInfo.currentXp / levelInfo.nextLevelXp) * 100)}%` }}
          />
        </div>

        <p className="text-[10px] text-muted-foreground/50 text-center leading-normal">
          Ganhe XP interagindo na comunidade e completando aulas!
        </p>
      </div>
    </div>
  );
}

/* ─── Avatar ─── */

function LevelBadge({ xp }: { xp: number }) {
  const levelInfo = getLevel(xp);
  const getRankColor = (lvl: number) => {
    if (lvl >= 8) return "from-yellow-400/20 to-amber-500/20 text-amber-300 border-amber-500/30";
    if (lvl >= 7) return "from-fuchsia-500/20 to-purple-600/20 text-purple-300 border-purple-500/30";
    if (lvl >= 6) return "from-violet-500/20 to-indigo-600/20 text-indigo-300 border-indigo-500/30";
    if (lvl >= 5) return "from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30";
    if (lvl >= 4) return "from-teal-500/20 to-emerald-500/20 text-emerald-300 border-teal-500/30";
    if (lvl >= 3) return "from-emerald-500/20 to-green-500/20 text-green-300 border-emerald-500/30";
    if (lvl >= 2) return "from-orange-500/20 to-red-500/20 text-orange-300 border-orange-500/30";
    return "from-slate-500/10 to-slate-600/10 text-slate-400 border-slate-500/20";
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-semibold bg-gradient-to-r ${getRankColor(levelInfo.level)}`}>
      Lv. {levelInfo.level} • {levelInfo.title}
    </span>
  );
}

function Avatar({ initials, size = "md", xp = 0 }: { initials: string; size?: "sm" | "md"; xp?: number }) {
  const levelInfo = getLevel(xp);
  const cls = size === "sm" ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-xs";

  const getRingColor = (lvl: number) => {
    if (lvl >= 8) return "ring-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
    if (lvl >= 7) return "ring-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.3)]";
    if (lvl >= 6) return "ring-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.3)]";
    if (lvl >= 5) return "ring-blue-500/30 shadow-[0_0_6px_rgba(59,130,246,0.25)]";
    if (lvl >= 4) return "ring-teal-500/30";
    if (lvl >= 3) return "ring-emerald-500/30";
    if (lvl >= 2) return "ring-orange-500/30";
    return "ring-white/10";
  };

  const ringCls = getRingColor(levelInfo.level);

  return (
    <div className={`${cls} rounded-full gradient-primary flex items-center justify-center font-semibold text-primary-foreground shrink-0 ring-2 ${ringCls}`}>
      {initials}
    </div>
  );
}

/* ─── Post Card ─── */

function PostCard({ post, userId, saved, onLike, onDelete, onSave }: { post: Post; userId: string; saved: boolean; onLike: () => void; onDelete: () => void; onSave: () => void }) {
  const [showComments, setShowComments] = useState(false);
  const name = post.author?.full_name || "Membro";
  const initial = name.slice(0, 2).toUpperCase();
  const mine = post.user_id === userId;
  const xpValue = post.author?.xp ?? 0;

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-sm overflow-hidden hover:bg-white/[0.02] hover:border-white/[0.09] hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] transition-all duration-300 group">
      {/* Author header */}
      <div className="px-5 pt-5 pb-0 flex items-center gap-3 relative">
        {showComments && (
          <div className="absolute top-[52px] bottom-0 left-[39px] w-[1.5px] bg-white/5" />
        )}
        <Avatar initials={initial} xp={xpValue} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground/90 truncate">{name}</span>
            <LevelBadge xp={xpValue} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground/70">{formatTime(post.created_at)}</span>
            {post.author?.instagram && (
              <a href={`https://instagram.com/${post.author.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-pink-400/70 hover:text-pink-400 transition">
                @{post.author.instagram.replace("@", "")}
              </a>
            )}
          </div>
        </div>
        {mine && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-all"
            aria-label="Apagar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-5 pt-3 pb-1">
          <div className="text-[14px] leading-[1.7] break-words prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
      )}

      {/* Image */}
      {post.image_url && (
        <div className="mt-3 mx-5 rounded-xl overflow-hidden border border-white/[0.06]">
          <img
            src={post.image_url}
            alt="Post"
            className="w-full max-h-[420px] object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-3 mt-2 flex items-center gap-2">
        <button
          onClick={onLike}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
            post.liked
              ? "text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
          }`}
        >
          <Heart className={`h-4 w-4 transition-transform duration-200 ${post.liked ? "scale-110" : ""}`} fill={post.liked ? "currentColor" : "none"} />
          <span className="tabular-nums">{post.likes || ""}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border duration-200 hover:scale-105 active:scale-95 ${
            showComments
              ? "text-foreground bg-white/5 border-white/10"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">{post.commentCount || ""}</span>
          {post.commentCount > 0 && (showComments ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />)}
        </button>
        <button
          onClick={onSave}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border duration-200 hover:scale-105 active:scale-95 ml-auto ${
            saved
              ? "text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent"
          }`}
        >
          <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentSection postId={post.id} postOwnerId={post.user_id} comments={post.comments} userId={userId} />
      )}
    </article>
  );
}

/* ─── Comment Section ─── */

function CommentSection({ postId, postOwnerId, comments, userId }: { postId: string; postOwnerId: string; comments: Comment[]; userId: string }) {
  const [text, setText] = useState("");
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const addXp = useAddXp();

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  };

  const clearImg = () => {
    setImgFile(null);
    if (imgPreview) URL.revokeObjectURL(imgPreview);
    setImgPreview(null);
    if (imgRef.current) imgRef.current.value = "";
  };

  const addComment = useMutation({
    mutationFn: async () => {
      const content = text.trim();
      if (!content && !imgFile) return;

      let image_url: string | null = null;
      if (imgFile) {
        const ext = imgFile.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("community").upload(path, imgFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("community").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      const { error } = await (supabase as any).from("comments").insert({
        post_id: postId,
        user_id: userId,
        content: content || null,
        image_url,
      });
      if (error) throw error;

      // Notificar o autor do post
      const { data: profile } = await db.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      const actorName = profile?.full_name || "Alguém";
      notifyUser({ recipientId: postOwnerId, actorId: userId, title: "Novo comentário no seu post", content: `${actorName} comentou no seu post` });
    },
    onSuccess: () => { setText(""); clearImg(); qc.invalidateQueries({ queryKey: ["posts"] }); addXp.mutate("comment"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => { await (supabase as any).from("comments").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment.mutate(); }
  };

  return (
    <div className="border-t border-white/[0.06] bg-white/[0.01]">
      {comments.length > 0 && (
        <div className="px-5 py-4 space-y-4 max-h-[360px] overflow-y-auto">
          {comments.map((c, index) => {
            const cName = c.author?.full_name || "Membro";
            const cInit = cName.slice(0, 2).toUpperCase();
            const isMine = c.user_id === userId;
            const cXp = c.author?.xp ?? 0;
            return (
              <div key={c.id} className="flex gap-2.5 group/comment relative">
                <div className="flex flex-col items-center shrink-0 relative">
                  <Avatar initials={cInit} size="sm" xp={cXp} />
                  {index !== comments.length - 1 && (
                    <div className="absolute top-8 bottom-0 w-[1.5px] bg-white/5" />
                  )}
                </div>
                <div className="flex-1 min-w-0 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground/90">{cName}</span>
                      <LevelBadge xp={cXp} />
                      <span className="text-[10px] text-muted-foreground/50">{formatTime(c.created_at)}</span>
                    </div>
                    {isMine && (
                      <button
                        onClick={() => deleteComment.mutate(c.id)}
                        className="opacity-0 group-hover/comment:opacity-100 text-muted-foreground hover:text-red-400 p-0.5 rounded transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {c.content && <p className="text-xs text-muted-foreground/90 mt-1 leading-relaxed">{c.content}</p>}
                  {c.image_url && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-white/[0.06] max-h-40">
                      <img src={c.image_url} alt="" className="w-full max-h-40 object-cover" loading="lazy" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comment composer */}
      <div className="px-5 py-3 border-t border-white/[0.06]">
        {imgPreview && (
          <div className="relative mb-2 ml-9 rounded-lg overflow-hidden border border-white/10 max-h-32 w-fit">
            <img src={imgPreview} alt="Preview" className="max-h-32 object-cover" />
            <button onClick={clearImg} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            onKeyDown={handleKeyDown}
            placeholder="Escreva um comentário..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40"
          />
          <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImg} />
          <button onClick={() => imgRef.current?.click()} className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition">
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => addComment.mutate()}
            disabled={(!text.trim() && !imgFile) || addComment.isPending}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30 transition"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
