import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles, ArrowRight, Play, Users, Target,
  MessageSquare, Zap, CheckCircle2, Rocket, Crown,
  Unlock, Flame, Star, Shield,
} from "lucide-react";
import { useRef, useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

/* ─── Scroll Reveal Hook ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el); } },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, isVisible };
}

/* ─── Parallax Hook ─── */
function useParallax() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { setScrollY(window.scrollY); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return scrollY;
}

/* ─── Main Page ─── */
function LandingPage() {
  const scrollY = useParallax();
  return (
    <div className="min-h-screen overflow-x-hidden relative text-white">
      <NebulaBackground scrollY={scrollY} />
      <NebulaStyles />
      <nav className="relative z-20 px-5 md:px-10 py-4 max-w-7xl mx-auto mt-3">
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.1] px-5 py-3" style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(40px) saturate(1.5)", WebkitBackdropFilter: "blur(40px) saturate(1.5)", boxShadow: "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-[0_4px_14px_oklch(0.65_0.22_290/0.35)]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Nebula</span>
          </div>
          <Link to="/login" className="text-sm font-medium gradient-primary text-white rounded-xl px-5 py-2 transition-all hover:scale-[1.04] shadow-[0_4px_20px_-4px_oklch(0.65_0.22_290/0.45)]">Entrar</Link>
        </div>
      </nav>
      <HeroSection />
      <UrgencyBar />
      <PlansSection />
      <FeaturesSection />
      <JourneySection />
      <TestimonialsSection />
      <CTASection />
      <footer className="relative z-10 px-5 py-8 max-w-7xl mx-auto flex items-center justify-between border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md gradient-primary flex items-center justify-center"><Sparkles className="h-3 w-3 text-white" /></div>
          <span className="text-xs text-white/40">Nebula</span>
        </div>
        <span className="text-[11px] text-white/20 italic">Onde estrelas nascem.</span>
      </footer>
    </div>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="relative z-10 flex flex-col items-center text-center px-5 pt-20 sm:pt-32 pb-28 max-w-4xl mx-auto">
      <div className={`inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-4 py-1.5 text-[11px] uppercase tracking-widest text-white/60 mb-8 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(40px) saturate(1.5)", WebkitBackdropFilter: "blur(40px) saturate(1.5)" }}>
        <Flame className="h-3 w-3 text-orange-400 animate-pulse" />
        Últimas vagas abertas — turma fecha em breve
      </div>
      <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-[4.75rem] font-bold tracking-tight leading-[1.02] transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        Pare de assistir.<br /><span className="text-gradient">Comece a faturar.</span>
      </h1>
      <p className={`mt-8 text-base sm:text-lg text-white/50 max-w-xl leading-relaxed transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        Você já consumiu dezenas de cursos e continua no mesmo lugar. O problema nunca foi falta de conteúdo — foi falta de <strong className="text-white/70">método, direção e acompanhamento</strong>. Aqui dentro, cada passo te aproxima dos seus primeiros 5 dígitos.
      </p>
      <div className={`mt-10 flex flex-col sm:flex-row items-center gap-4 transition-all duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <Link to="/login" className="group inline-flex items-center gap-2.5 gradient-primary text-white rounded-2xl px-8 py-4 text-sm font-semibold shadow-[0_8px_36px_-6px_oklch(0.65_0.22_290/0.55),inset_0_1px_0_oklch(1_0_0/0.2)] transition-all hover:scale-[1.04] hover:shadow-[0_14px_50px_-6px_oklch(0.65_0.22_290/0.7)] will-change-transform btn-glow">
          Quero meu acesso gratuito <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <p className={`mt-5 text-[11px] text-white/25 transition-all duration-700 delay-[400ms] ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>Sem cartão. Acesso em 30 segundos. Cancele quando quiser.</p>
    </section>
  );
}

/* ─── Urgency Bar ─── */
function UrgencyBar() {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="relative z-10 px-5 pb-20 max-w-2xl mx-auto">
      <div className={`flex items-center justify-center gap-6 sm:gap-10 py-5 px-6 rounded-2xl border border-white/[0.1] transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`} style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(40px) saturate(1.5)", WebkitBackdropFilter: "blur(40px) saturate(1.5)", boxShadow: "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
        <div className="text-center"><div className="text-lg sm:text-xl font-bold text-gradient">500+</div><div className="text-[9px] uppercase tracking-wider text-white/30 mt-0.5">membros lucram</div></div>
        <div className="w-[1px] h-8 bg-white/[0.06]" />
        <div className="text-center"><div className="text-lg sm:text-xl font-bold text-gradient">3x</div><div className="text-[9px] uppercase tracking-wider text-white/30 mt-0.5">mais faturamento</div></div>
        <div className="w-[1px] h-8 bg-white/[0.06]" />
        <div className="text-center"><div className="text-lg sm:text-xl font-bold text-gradient">97%</div><div className="text-[9px] uppercase tracking-wider text-white/30 mt-0.5">recomendam</div></div>
      </div>
    </section>
  );
}

/* ─── Plans ─── */
function PlansSection() {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="relative z-10 px-5 pb-32 max-w-5xl mx-auto">
      <SectionHeader title="Escolha seu ritmo. O resultado é inevitável." subtitle="Não importa onde você está hoje — existe um caminho desenhado pra você." isVisible={isVisible} />
      <div className="grid lg:grid-cols-3 gap-5 mt-14">
        <GlowCard delay={0} isVisible={isVisible}>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20"><Unlock className="h-5 w-5 text-emerald-400" /></div>
              <div><h3 className="text-sm font-bold text-white">Gratuito</h3><span className="text-[10px] uppercase tracking-wider text-emerald-400/80">Primeiro passo</span></div>
            </div>
            <p className="text-xs text-white/45 leading-relaxed mb-5">Pra quem tá cansado de girar em círculos e quer finalmente ter um caminho claro. Zero risco, resultado real.</p>
            <ul className="space-y-2.5 mt-auto">
              <PlanItem>Aulas fundamentais que geram resultado rápido</PlanItem>
              <PlanItem>Comunidade com gente que tá no jogo</PlanItem>
              <PlanItem>Fórum pra tirar dúvidas em tempo real</PlanItem>
              <PlanItem>Método validado pra seus primeiros R$</PlanItem>
            </ul>
          </div>
        </GlowCard>
        <GlowCard delay={150} isVisible={isVisible} featured>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20"><Flame className="h-5 w-5 text-primary" /></div>
              <div><h3 className="text-sm font-bold text-white">Premium</h3><span className="text-[10px] uppercase tracking-wider text-primary/80">Mais escolhido</span></div>
            </div>
            <p className="text-xs text-white/45 leading-relaxed mb-5">Você já provou que funciona. Agora quer consistência, escala e previsibilidade. Este é o nível que transforma hobby em negócio.</p>
            <ul className="space-y-2.5 mt-auto">
              <PlanItem>Tudo do Gratuito +</PlanItem>
              <PlanItem>Módulos de escala, automação e funis</PlanItem>
              <PlanItem>Estratégias de tráfego que convertem</PlanItem>
              <PlanItem>Frameworks pra faturar 5 dígitos/mês</PlanItem>
              <PlanItem>Conteúdo novo toda semana</PlanItem>
            </ul>
          </div>
        </GlowCard>
        <GlowCard delay={300} isVisible={isVisible}>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20"><Crown className="h-5 w-5 text-amber-400" /></div>
              <div><h3 className="text-sm font-bold text-white">VIP</h3><span className="text-[10px] uppercase tracking-wider text-amber-400/80">Atalho direto</span></div>
            </div>
            <p className="text-xs text-white/45 leading-relaxed mb-5">Pra quem não quer perder tempo. Mentoria individual, plano sob medida e acesso direto pra destravar seus gargalos em semanas, não meses.</p>
            <ul className="space-y-2.5 mt-auto">
              <PlanItem>Tudo do Premium +</PlanItem>
              <PlanItem>Mentoria 1:1 personalizada</PlanItem>
              <PlanItem>Calls exclusivas de acompanhamento</PlanItem>
              <PlanItem>Diagnóstico do seu negócio + plano de ação</PlanItem>
              <PlanItem>Suporte prioritário e direto comigo</PlanItem>
            </ul>
          </div>
        </GlowCard>
      </div>
    </section>
  );
}

/* ─── Features ─── */
function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal();
  const features = [
    { icon: Play, title: "Aulas que geram ação", desc: "Cada aula termina com uma tarefa. Você aplica no mesmo dia e vê resultado." },
    { icon: Users, title: "Comunidade de quem faz", desc: "Não é grupo de motivação. É gente compartilhando o que funciona de verdade." },
    { icon: MessageSquare, title: "Suporte em tempo real", desc: "Travou? Pergunta. Resposta rápida de quem já passou pelo mesmo." },
    { icon: Zap, title: "Gamificação inteligente", desc: "XP, níveis e conquistas que te mantêm no jogo quando a motivação falha." },
    { icon: Target, title: "Mapa de progresso", desc: "Saiba exatamente onde você está e o que falta pro próximo nível de faturamento." },
    { icon: Shield, title: "Método validado", desc: "Não é teoria. É o mesmo processo que gerou múltiplos 5 dígitos pra centenas de alunos." },
  ];
  return (
    <section ref={ref} className="relative z-10 px-5 pb-28 max-w-5xl mx-auto">
      <SectionHeader title="Tudo que você precisa. Nada que você não precisa." subtitle="Um ecossistema completo pra você sair do zero e nunca mais voltar." isVisible={isVisible} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
        {features.map((item, i) => (
          <GlowCard key={item.title} delay={i * 100} isVisible={isVisible}>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 290 / 0.12), oklch(0.65 0.22 290 / 0.04))", border: "1px solid oklch(0.65 0.22 290 / 0.18)" }}>
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

/* ─── Journey ─── */
function JourneySection() {
  const { ref, isVisible } = useScrollReveal();
  const steps = [
    { step: "01", title: "Crie sua conta em 30 segundos", desc: "Sem cartão, sem formulário gigante. Acesso imediato ao conteúdo que importa." },
    { step: "02", title: "Assista. Aplique. Fature.", desc: "Cada aula é uma ação prática. Resultado vem de execução, não de anotação." },
    { step: "03", title: "Cresça com quem já chegou lá", desc: "Tire dúvidas, copie estratégias validadas e encurte seu caminho." },
    { step: "04", title: "Escale quando sentir que é hora", desc: "Premium e VIP existem pra quando você quiser acelerar. Sem pressão." },
  ];
  return (
    <section ref={ref} className="relative z-10 px-5 pb-28 max-w-4xl mx-auto">
      <SectionHeader title="4 passos. Sem burocracia." subtitle="Do cadastro ao resultado em tempo recorde." isVisible={isVisible} />
      <div className="mt-12 space-y-4">
        {steps.map((item, i) => (
          <GlowCard key={item.step} delay={i * 120} isVisible={isVisible}>
            <div className="flex items-center gap-5">
              <div className="text-2xl font-bold text-gradient shrink-0 w-10">{item.step}</div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">{item.desc}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-primary/30 shrink-0 hidden sm:block" />
            </div>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function TestimonialsSection() {
  const { ref, isVisible } = useScrollReveal();
  const testimonials = [
    { name: "Lucas M.", role: "Afiliado", quote: "Em 60 dias saí do zero pra R$4.200/mês. O método é simples, mas funciona de verdade.", stars: 5 },
    { name: "Camila R.", role: "Infoprodutora", quote: "Já tinha tentado 3 cursos antes. Aqui foi a primeira vez que tive acompanhamento real.", stars: 5 },
    { name: "Pedro H.", role: "Gestor de tráfego", quote: "A comunidade sozinha já vale. Fechei 2 clientes só com networking dentro da plataforma.", stars: 5 },
  ];
  return (
    <section ref={ref} className="relative z-10 px-5 pb-28 max-w-5xl mx-auto">
      <SectionHeader title="Quem entrou, não voltou atrás." subtitle="Resultados reais de pessoas reais." isVisible={isVisible} />
      <div className="grid sm:grid-cols-3 gap-4 mt-12">
        {testimonials.map((item, i) => (
          <GlowCard key={item.name} delay={i * 120} isVisible={isVisible}>
            <div className="flex flex-col gap-3 py-2">
              <div className="flex gap-0.5">
                {Array.from({ length: item.stars }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs text-white/50 leading-relaxed italic">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-auto pt-3 border-t border-white/[0.05]">
                <span className="text-xs font-medium text-white/70">{item.name}</span>
                <span className="text-[10px] text-white/30 ml-2">{item.role}</span>
              </div>
            </div>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTASection() {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="relative z-10 px-5 pb-28 max-w-3xl mx-auto text-center">
      <GlowCard isVisible={isVisible}>
        <div className="py-6 sm:py-10">
          <Rocket className="h-8 w-8 text-primary mx-auto mb-5 opacity-60 animate-bounce-slow" />
          <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight text-white transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>Daqui a 90 dias você vai se arrepender de não ter começado hoje.</h2>
          <p className={`mt-4 text-sm text-white/40 max-w-md mx-auto leading-relaxed transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>O acesso gratuito não vai durar pra sempre. Enquanto a porta tá aberta, entra.</p>
          <Link to="/login" className={`mt-8 inline-flex items-center gap-2.5 gradient-primary text-white rounded-2xl px-8 py-4 text-sm font-semibold shadow-[0_8px_36px_-6px_oklch(0.65_0.22_290/0.55),inset_0_1px_0_oklch(1_0_0/0.2)] transition-all hover:scale-[1.04] will-change-transform btn-glow duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            Garantir minha vaga agora <ArrowRight className="h-4 w-4" />
          </Link>
          <p className={`mt-4 text-[11px] text-white/25 transition-all duration-700 delay-[400ms] ${isVisible ? "opacity-100" : "opacity-0"}`}>Sem cartão. Sem compromisso. Acesso imediato.</p>
        </div>
      </GlowCard>
    </section>
  );
}

/* ─── Utility Components ─── */

function PlanItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-xs text-white/50 leading-relaxed">
      <CheckCircle2 className="h-3.5 w-3.5 text-primary/60 shrink-0 mt-0.5" />{children}
    </li>
  );
}

function SectionHeader({ title, subtitle, isVisible }: { title: string; subtitle: string; isVisible: boolean }) {
  return (
    <div className={`text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h2>
      <p className="mt-3 text-sm text-white/40 max-w-lg mx-auto">{subtitle}</p>
    </div>
  );
}

function GlowCard({ children, delay = 0, isVisible = true, featured = false }: { children: React.ReactNode; delay?: number; isVisible?: boolean; featured?: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current; const glow = glowRef.current;
    if (!card || !glow) return;
    const rect = card.getBoundingClientRect();
    glow.style.opacity = "1";
    glow.style.background = `radial-gradient(300px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(180, 120, 255, 0.12), transparent 60%)`;
  }, []);
  const handleMouseLeave = useCallback(() => { if (glowRef.current) glowRef.current.style.opacity = "0"; }, []);
  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-700 hover:scale-[1.02] will-change-transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${featured ? "ring-1 ring-purple-400/20" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div ref={glowRef} className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 will-change-[opacity] z-10" />
      <div className="relative rounded-2xl p-5 sm:p-6 h-full border border-white/[0.1]" style={{
        background: featured
          ? "rgba(255, 255, 255, 0.04)"
          : "rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(40px) saturate(1.5) brightness(1.1)",
        WebkitBackdropFilter: "blur(40px) saturate(1.5) brightness(1.1)",
        boxShadow: featured
          ? "0 8px 32px rgba(140, 80, 220, 0.08), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.02)"
          : "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(255,255,255,0.02)",
      }}>
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

/* ─── Background ─── */
function NebulaBackground({ scrollY }: { scrollY: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 100% 80% at 50% 100%, rgba(80, 30, 160, 0.15), rgba(40, 15, 100, 0.05) 50%, transparent 80%), black" }} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] will-change-transform" style={{ background: "radial-gradient(ellipse 100% 100% at 50% 100%, rgba(140, 60, 255, 0.12), rgba(100, 30, 200, 0.04) 60%, transparent 90%)", filter: "blur(60px)", transform: `translateX(-50%) translateY(${scrollY * 0.03}px)` }} />
    </div>
  );
}

const STARS: never[] = [];

/* ─── Styles ─── */
function NebulaStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes btn-glow-pulse {
        0%, 100% { box-shadow: 0 8px 36px -6px oklch(0.65 0.22 290/0.55), inset 0 1px 0 oklch(1 0 0/0.2); }
        50% { box-shadow: 0 8px 50px -4px oklch(0.65 0.22 290/0.7), inset 0 1px 0 oklch(1 0 0/0.2); }
      }
      @keyframes bounce-slow {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .btn-glow { animation: btn-glow-pulse 3s ease-in-out infinite; }
      .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
    `}} />
  );
}
