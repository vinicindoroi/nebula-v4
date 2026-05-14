import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl text-center animate-fade-up">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Plataforma de membros
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Sua área <span className="text-gradient">exclusiva</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Conteúdos, comunidade e progresso — tudo em um espaço minimalista feito para você focar no que importa.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 gradient-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-medium glow transition-transform hover:scale-[1.02]"
          >
            Entrar <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/dashboard"
            className="glass inline-flex items-center rounded-xl px-6 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Ver demo
          </Link>
        </div>
      </div>
    </main>
  );
}
