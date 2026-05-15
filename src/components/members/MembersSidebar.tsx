import { useQuery } from "@tanstack/react-query";
import { Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Member = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  instagram: string | null;
  last_seen_at: string | null;
  plan: string | null;
};

const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export function MembersSidebar() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["community-members"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url, instagram, last_seen_at, plan")
        .order("last_seen_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const now = Date.now();
  const online = members.filter((m) => m.last_seen_at && now - new Date(m.last_seen_at).getTime() < ONLINE_THRESHOLD);
  const offline = members.filter((m) => !m.last_seen_at || now - new Date(m.last_seen_at).getTime() >= ONLINE_THRESHOLD);

  return (
    <aside className="w-[260px] shrink-0 hidden xl:block">
      <div className="sticky top-4 space-y-4">
        {/* Online */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_oklch(0.7_0.2_160)]" />
            <span className="text-xs font-semibold">Online</span>
            <span className="text-[10px] text-muted-foreground/60 ml-auto">{online.length}</span>
          </div>
          <div className="p-2 max-h-[240px] overflow-y-auto">
            {isLoading ? (
              <div className="px-2 py-4 text-center text-[11px] text-muted-foreground">Carregando...</div>
            ) : online.length === 0 ? (
              <div className="px-2 py-4 text-center text-[11px] text-muted-foreground/60">Ninguém online</div>
            ) : (
              online.map((m) => <MemberRow key={m.id} member={m} online />)
            )}
          </div>
        </div>

        {/* Offline */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white/20" />
            <span className="text-xs font-semibold">Offline</span>
            <span className="text-[10px] text-muted-foreground/60 ml-auto">{offline.length}</span>
          </div>
          <div className="p-2 max-h-[320px] overflow-y-auto">
            {offline.length === 0 ? (
              <div className="px-2 py-4 text-center text-[11px] text-muted-foreground/60">Todos online!</div>
            ) : (
              offline.map((m) => <MemberRow key={m.id} member={m} online={false} />)
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function MemberRow({ member, online }: { member: Member; online: boolean }) {
  const name = member.full_name || "Membro";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition group">
      <div className="relative shrink-0">
        {member.avatar_url ? (
          <img src={member.avatar_url} alt={name} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
            {initials}
          </div>
        )}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
          online ? "bg-emerald-400" : "bg-white/20"
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{name}</div>
        {member.plan && member.plan !== "Free" && (
          <div className="text-[9px] text-primary/70">{member.plan}</div>
        )}
      </div>
      {member.instagram && (
        <a
          href={`https://instagram.com/${member.instagram}`}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/5 text-muted-foreground/50 hover:text-pink-400 transition"
          title={`@${member.instagram}`}
        >
          <Instagram className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
