import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, GraduationCap, Users, User, Settings, Search, Bell,
  Menu, X, Orbit, LogOut, Shield, MessageSquare, Bookmark, GitBranch,
  PanelLeftClose, PanelLeftOpen, StickyNote, HelpCircle, Trello,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { usePresence } from "@/hooks/use-presence";
import { NotificationBell } from "@/components/members/NotificationBell";
import { TutorialWizard } from "@/components/tutorial/TutorialWizard";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/organizer", label: "Organização", icon: Trello },
    ],
  },
  {
    label: "Aprendizado",
    items: [
      { to: "/courses", label: "Cursos", icon: GraduationCap },
      { to: "/community", label: "Comunidade", icon: Users },
      { to: "/forum", label: "Fórum", icon: MessageSquare },
      { to: "/saved", label: "Salvos", icon: Bookmark },
      { to: "/notes", label: "Notas", icon: StickyNote },
      { to: "/funnels", label: "Funis", icon: GitBranch },
    ],
  },
  {
    label: "Conta",
    items: [
      { to: "/profile", label: "Perfil", icon: User },
      { to: "/settings", label: "Configurações", icon: Settings },
    ],
  },
];

const allNav: NavItem[] = navGroups.flatMap((g) => g.items);

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved === "true";
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  usePresence();

  // Auto-show tutorial on first visit
  useEffect(() => {
    const seen = localStorage.getItem("nebula_tutorial_seen");
    if (!seen) {
      const timer = setTimeout(() => setShowTutorial(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem("nebula_tutorial_seen", "true");
  };

  const isFunnelsPage = path === '/funnels' || path.startsWith('/funnels/');

  // Auto-collapse on funnels page
  useEffect(() => {
    if (isFunnelsPage && !collapsed) {
      setCollapsed(true);
    }
  }, [isFunnelsPage]);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  const email = user?.email ?? "";
  const name = (user?.user_metadata as any)?.full_name || email.split("@")[0] || "Membro";
  const initials = name.slice(0, 2).toUpperCase();
  const current = allNav.find((n) => path === n.to || path.startsWith(n.to + "/"))?.label ?? "Membros";

  const [siteSettings, setSiteSettings] = useState({ name: "Membros", logoUrl: "/nebula_logo.png", primaryColor: "#8b5cf6" });

  useEffect(() => {
    // Try to load from localStorage first for instant initial render
    try {
      const raw = localStorage.getItem("admin_settings_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.general) {
          setSiteSettings({
            name: parsed.general.name || "Membros",
            logoUrl: parsed.general.logoUrl || "/nebula_logo.png",
            primaryColor: parsed.general.primaryColor || "#8b5cf6"
          });
        }
      }
    } catch (_) {}

    // Then fetch the official settings in real-time from Supabase
    const fetchGlobalSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("global_settings")
          .select("name, logo_url, primary_color")
          .eq("id", "current")
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const fetched = {
            name: data.name,
            logoUrl: data.logo_url,
            primaryColor: data.primary_color
          };
          setSiteSettings(fetched);
          
          // Sync back to localstorage as cache for next instant load
          const raw = localStorage.getItem("admin_settings_v1") || "{}";
          try {
            const parsed = JSON.parse(raw);
            parsed.general = {
              name: data.name,
              logoUrl: data.logo_url,
              primaryColor: data.primary_color
            };
            localStorage.setItem("admin_settings_v1", JSON.stringify(parsed));
          } catch (_) {}
        }
      } catch (err) {
        console.error("Error fetching global settings from Supabase:", err);
      }
    };

    fetchGlobalSettings();
  }, []);

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - single element with smooth width transition */}
      <aside
        className={`hidden md:flex fixed md:sticky top-0 left-0 z-40 h-screen shrink-0 border-r border-white/5 bg-background/40 backdrop-blur-2xl flex-col transition-all duration-300 ease-in-out overflow-visible ${
          collapsed ? "w-14" : "w-72"
        }`}
      >
        {/* Toggle button — centered on the right edge */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -translate-y-1/2 -right-3 z-50 h-6 w-6 rounded-full border border-white/10 bg-background/80 backdrop-blur-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all shadow-md"
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform duration-300 ${collapsed ? "rotate-0" : "rotate-180"}`}>
            <path d="M3.5 1.5L7 5L3.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {/* Collapsed content */}
        <div className={`absolute inset-0 flex flex-col items-center py-4 gap-1 transition-opacity duration-200 ${collapsed ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <Link to="/dashboard" className="mb-3">
            {siteSettings.logoUrl ? (
              <img src={siteSettings.logoUrl} alt={siteSettings.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Orbit className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </Link>
          <div className="w-6 h-px bg-white/5 mb-2" />
          {allNav.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.to}
                    className={`relative p-2.5 rounded-xl transition-colors ${
                      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
          {isAdmin && (
            <>
              <div className="w-6 h-px bg-white/5 my-2" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="/admin/dashboard" className="p-2.5 rounded-xl text-primary hover:bg-primary/10 transition-colors">
                    <Shield className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right">Painel Admin</TooltipContent>
              </Tooltip>
            </>
          )}
          <div className="w-6 h-px bg-white/5 my-2" />
          <div className="mt-auto flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onSignOut}
                  className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-white/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Expanded content */}
        <div className={`h-full flex flex-col p-5 min-w-[18rem] transition-opacity duration-200 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <div className="flex items-center justify-between mb-8">
            <Link to="/dashboard" className="flex items-center gap-3 px-2 py-2">
              {siteSettings.logoUrl ? (
                <img src={siteSettings.logoUrl} alt={siteSettings.name} className="h-10 w-10 rounded-xl object-cover shadow-[0_0_24px_-4px_oklch(0.65_0.22_290/0.6)]" />
              ) : (
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-[0_0_24px_-4px_oklch(0.65_0.22_290/0.6)]">
                  <Orbit className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
              <div>
                <div className="font-semibold text-sm leading-none">{siteSettings.name}</div>
                <div className="text-[10px] text-muted-foreground mt-1.5">área exclusiva</div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto -mx-1 px-1 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = path === item.to || path.startsWith(item.to + "/");
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                          active
                            ? "bg-gradient-to-r from-primary/15 via-primary/5 to-transparent text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r gradient-primary" />
                        )}
                        <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {isAdmin && (
              <div>
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Administração
                </div>
                <a
                  href="/admin/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all"
                >
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Painel Admin</span>
                </a>
              </div>
            )}
          </nav>

          <div className="mt-4 rounded-2xl p-3 flex items-center gap-3 bg-white/[0.03] border border-white/5">
            <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground ring-2 ring-primary/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{email}</div>
            </div>
            <button
              onClick={onSignOut}
              className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed md:hidden top-0 left-0 z-40 h-screen w-72 border-r border-white/5 bg-background/40 backdrop-blur-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col p-5">
          <Link to="/dashboard" className="flex items-center gap-3 px-2 py-2 mb-8" onClick={() => setOpen(false)}>
            {siteSettings.logoUrl ? (
              <img src={siteSettings.logoUrl} alt={siteSettings.name} className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <Orbit className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <div className="font-semibold text-sm leading-none">{siteSettings.name}</div>
              <div className="text-[10px] text-muted-foreground mt-1.5">área exclusiva</div>
            </div>
          </Link>
          <nav className="flex-1 overflow-y-auto space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{group.label}</div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = path === item.to || path.startsWith(item.to + "/");
                    const Icon = item.icon;
                    return (
                      <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? "bg-gradient-to-r from-primary/15 via-primary/5 to-transparent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r gradient-primary" />}
                        <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {!isFunnelsPage && (
        <header className="sticky top-0 z-20 h-16 border-b border-white/5 bg-background/60 backdrop-blur-xl flex items-center gap-3 px-4 md:px-8">
            <button className="md:hidden p-2 rounded-lg hover:bg-white/5" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{siteSettings.name}</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground font-medium">{current}</span>
            </div>
            <div className="hidden sm:block flex-1 max-w-md mx-auto md:mx-0 md:ml-8">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="search"
                  placeholder="Buscar conteúdos..."
                  autoComplete="off"
                  data-lpignore="true"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white/[0.05] transition"
                />
              </div>
            </div>
            <NotificationBell />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowTutorial(true)}
                  className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Tutorial"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Tutorial da plataforma</TooltipContent>
            </Tooltip>
            <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
          </header>
        )}
        <main className={`flex-1 ${isFunnelsPage ? 'p-0 overflow-hidden' : 'px-4 md:px-8 py-6 md:py-8'}`}>
          <div key={path} className={isFunnelsPage ? 'h-full' : 'admin-route-slot'}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Tutorial Wizard */}
      <TutorialWizard open={showTutorial} onClose={handleCloseTutorial} />
    </div>
  );
}
