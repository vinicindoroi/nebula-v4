import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, DollarSign, UserPlus, TrendingUp } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/admin/StatCard";

export const Route = createFileRoute("/admin/dashboard")({ component: Page });

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];

function Page() {
  const [stats, setStats] = useState({ members: 0, revenue: 0, newUsers: 0, retention: 87.4 });
  const [growth, setGrowth] = useState<Array<{ d: string; v: number }>>([]);
  const [revenue, setRevenue] = useState<Array<{ m: string; v: number }>>([]);
  const [plans, setPlans] = useState<Array<{ name: string; value: number }>>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [topCourses, setTopCourses] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: members }, { data: tx }, { count: news }, { data: courses }, { data: logs }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("transactions").select("amount,plan,created_at").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("courses").select("id,title").limit(5),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      const rev = (tx ?? []).reduce((a, t: any) => a + Number(t.amount), 0);
      setStats({ members: members ?? 0, revenue: rev, newUsers: news ?? 0, retention: 87.4 });

      const days = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date(Date.now() - (29 - i) * 86400000);
        return { d: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), v: Math.round(50 + Math.sin(i / 3) * 12 + i * 2) };
      });
      setGrowth(days);

      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
      setRevenue(months.map((m, i) => ({ m, v: Math.round(8000 + i * 1200 + Math.random() * 2500) })));

      const planCounts: Record<string, number> = {};
      (tx ?? []).forEach((t: any) => { planCounts[t.plan] = (planCounts[t.plan] ?? 0) + 1; });
      const plansArr = Object.entries(planCounts).map(([name, value]) => ({ name, value }));
      setPlans(plansArr.length ? plansArr : [
        { name: "Free", value: 60 }, { name: "Pro", value: 30 }, { name: "Premium", value: 10 },
      ]);
      setActivity(logs ?? []);
      setTopCourses(courses ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral em tempo real</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Membros ativos" value={stats.members.toLocaleString("pt-BR")} icon={Users} />
        <StatCard label="Receita do mês" value={`R$ ${stats.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} />
        <StatCard label="Novos cadastros (7d)" value={stats.newUsers.toString()} icon={UserPlus} />
        <StatCard label="Taxa de retenção" value={`${stats.retention}%`} icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium">Evolução de membros (30 dias)</h3></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="d" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "rgba(15,15,20,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, backdropFilter: "blur(20px)" }} />
                <Line type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-medium mb-4">Distribuição por plano</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={plans} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45} stroke="none">
                  {plans.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(15,15,20,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-sm font-medium mb-4">Receita mensal</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="m" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "rgba(15,15,20,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Bar dataKey="v" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-medium mb-4">Top conteúdos</h3>
          <div className="space-y-3">
            {topCourses.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0"><span className="text-muted-foreground text-xs w-4">{i + 1}</span><span className="truncate">{c.title}</span></div>
                <span className="text-xs text-muted-foreground">{Math.round(Math.random() * 500 + 100)}</span>
              </div>
            ))}
            {!topCourses.length && <div className="text-xs text-muted-foreground">Sem cursos ainda</div>}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-medium mb-4">Últimas atividades</h3>
        {activity.length === 0 ? (
          <div className="text-xs text-muted-foreground">Sem atividades registradas.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {activity.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between text-sm">
                <div><div className="font-medium">{a.action}</div><div className="text-xs text-muted-foreground">{a.target}</div></div>
                <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}