import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings as SettingsIcon, CreditCard, Mail, Plug, ShieldCheck, Save, Type, Palette, Link as LinkIcon, Key, Hash, CloudLightning, Play, AlertCircle } from "lucide-react";
import { Field, inputClass, selectClass, selectStyle } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/settings")({ component: Page });

const STORAGE_KEY = "admin_settings_v1";

type SettingsShape = {
  general: { name: string; logoUrl: string; primaryColor: string };
  payments: { gateway: string; publicKey: string };
  email: { smtpHost: string; sender: string };
  integrations: { apiKey: string; webhookUrl: string };
  security: { minPasswordLen: number; require2faAdmins: boolean };
  vercel: { deployHookUrl: string };
};

const DEFAULTS: SettingsShape = {
  general: { name: "Membros", logoUrl: "", primaryColor: "#8b5cf6" },
  payments: { gateway: "stripe", publicKey: "" },
  email: { smtpHost: "", sender: "" },
  integrations: { apiKey: "", webhookUrl: "" },
  security: { minPasswordLen: 8, require2faAdmins: false },
  vercel: { deployHookUrl: "" },
};

const TABS = [
  { id: "general", label: "Geral", icon: SettingsIcon },
  { id: "payments", label: "Pagamentos", icon: CreditCard },
  { id: "email", label: "Email", icon: Mail },
  { id: "integrations", label: "Integrações", icon: Plug },
  { id: "security", label: "Segurança", icon: ShieldCheck },
  { id: "vercel", label: "Vercel Deploy", icon: CloudLightning },
] as const;

function loadSettings(): SettingsShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      vercel: parsed.vercel || DEFAULTS.vercel,
    };
  } catch {
    return DEFAULTS;
  }
}

function Page() {
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("general");
  const [s, setS] = useState<SettingsShape>(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => { setS(loadSettings()); }, []);

  const update = <K extends keyof SettingsShape>(key: K, patch: Partial<SettingsShape[K]>) => {
    setS((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setDirty(true);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setDirty(false);
    toast.success("Configurações salvas");
  };

  const triggerDeploy = async () => {
    const url = s.vercel?.deployHookUrl;
    if (!url) {
      toast.error("Configure a URL do Deploy Hook primeiro!");
      return;
    }
    setDeploying(true);
    try {
      const res = await fetch(url, { method: "POST" });
      if (res.ok) {
        toast.success("Deploy disparado com sucesso na Vercel!");
      } else {
        toast.error(`Falha ao disparar deploy: status ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao conectar com a Vercel.");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Personalize a plataforma para sua marca.</p>
        </div>
        <button
          onClick={save}
          disabled={!dirty}
          className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-40 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
        >
          <Save className="h-4 w-4" />Salvar alterações
        </button>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        <aside className="lg:w-56 shrink-0">
          <nav className="rounded-2xl border border-white/5 bg-white/[0.02] p-2 space-y-0.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition ${
                    active
                      ? "bg-gradient-to-r from-primary/15 via-primary/5 to-transparent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 max-w-2xl space-y-5">
            {tab === "general" && (
              <>
                <Field label="Nome da plataforma" icon={Type}>
                  <input
                    value={s.general.name}
                    onChange={(e) => update("general", { name: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="URL do logo" icon={LinkIcon}>
                  <input
                    value={s.general.logoUrl}
                    onChange={(e) => update("general", { logoUrl: e.target.value })}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>
                <Field label="Cor primária" icon={Palette}>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={s.general.primaryColor}
                      onChange={(e) => update("general", { primaryColor: e.target.value })}
                      className="h-11 w-16 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer"
                      style={{ colorScheme: "dark" }}
                    />
                    <input
                      value={s.general.primaryColor}
                      onChange={(e) => update("general", { primaryColor: e.target.value })}
                      className={`${inputClass} font-mono flex-1`}
                    />
                  </div>
                </Field>
              </>
            )}

            {tab === "payments" && (
              <>
                <Field label="Gateway de pagamento" icon={CreditCard}>
                  <select
                    value={s.payments.gateway}
                    onChange={(e) => update("payments", { gateway: e.target.value })}
                    className={selectClass}
                    style={selectStyle}
                  >
                    <option value="stripe">Stripe</option>
                    <option value="paddle">Paddle</option>
                    <option value="mercadopago">Mercado Pago</option>
                  </select>
                </Field>
                <Field label="Chave pública" icon={Key} hint="Encontre no painel do seu gateway.">
                  <input
                    value={s.payments.publicKey}
                    onChange={(e) => update("payments", { publicKey: e.target.value })}
                    placeholder="pk_live_..."
                    className={`${inputClass} font-mono`}
                  />
                </Field>
              </>
            )}

            {tab === "email" && (
              <>
                <Field label="Servidor SMTP" icon={Mail}>
                  <input
                    value={s.email.smtpHost}
                    onChange={(e) => update("email", { smtpHost: e.target.value })}
                    placeholder="smtp.example.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="Email remetente" icon={Mail}>
                  <input
                    type="email"
                    value={s.email.sender}
                    onChange={(e) => update("email", { sender: e.target.value })}
                    placeholder="no-reply@example.com"
                    className={inputClass}
                  />
                </Field>
              </>
            )}

            {tab === "integrations" && (
              <>
                <Field label="API Key" icon={Key}>
                  <input
                    value={s.integrations.apiKey}
                    onChange={(e) => update("integrations", { apiKey: e.target.value })}
                    placeholder="sk_..."
                    className={`${inputClass} font-mono`}
                  />
                </Field>
                <Field label="Webhook URL" icon={LinkIcon}>
                  <input
                    value={s.integrations.webhookUrl}
                    onChange={(e) => update("integrations", { webhookUrl: e.target.value })}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>
              </>
            )}

            {tab === "security" && (
              <>
                <Field label="Tamanho mínimo da senha" icon={Hash}>
                  <input
                    type="number"
                    min={6}
                    max={64}
                    value={s.security.minPasswordLen}
                    onChange={(e) => update("security", { minPasswordLen: Number(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Autenticação de dois fatores" icon={ShieldCheck}>
                  <label className="flex items-center gap-3 h-[42px] px-3.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.security.require2faAdmins}
                      onChange={(e) => update("security", { require2faAdmins: e.target.checked })}
                      className="accent-primary"
                    />
                    <span className="text-sm">Exigir 2FA para administradores</span>
                  </label>
                </Field>
              </>
            )}

            {tab === "vercel" && (
              <div className="space-y-6">
                <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                      <CloudLightning className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium">Deploy Manual (Vercel)</h3>
                      <p className="text-xs text-muted-foreground">Dispare deploys de produção diretamente do seu painel administrativo.</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <Field label="URL do Deploy Hook da Vercel" icon={LinkIcon} hint="Crie em Configurações do Projeto Vercel > Git > Deploy Hooks">
                      <input
                        value={s.vercel?.deployHookUrl || ""}
                        onChange={(e) => update("vercel", { deployHookUrl: e.target.value })}
                        placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                        className={`${inputClass} font-mono`}
                      />
                    </Field>

                    <div className="flex justify-start">
                      <button
                        onClick={triggerDeploy}
                        disabled={deploying || !s.vercel?.deployHookUrl}
                        className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition hover:opacity-90 active:scale-95 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
                      >
                        {deploying ? (
                          <>
                            <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            Disparando Deploy...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-current" />
                            Disparar Deploy de Produção
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-amber-500/10 bg-amber-500/[0.02] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2.5 text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    <h4 className="text-sm font-medium">Como desativar o deploy automático da Vercel?</h4>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Por padrão, a Vercel realiza um novo deploy para cada commit enviado ao GitHub. Para fazer com que o deploy aconteça <strong>apenas</strong> quando você clicar no botão acima:
                  </p>
                  <ol className="text-xs space-y-2 text-muted-foreground list-decimal pl-4">
                    <li>
                      Acesse o painel da <strong>Vercel</strong> e selecione o seu projeto.
                    </li>
                    <li>
                      Vá em <strong>Settings (Configurações)</strong> &gt; <strong>Git</strong>.
                    </li>
                    <li>
                      Role até a seção <strong>Ignored Build Step</strong> (Etapa de compilação ignorada).
                    </li>
                    <li>
                      Selecione a opção <strong>Custom</strong> no dropdown e insira o seguinte comando no campo de texto:
                      <div className="mt-1.5 flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-amber-400/90 select-all">
                        <code>echo "Skipping push build" && exit 0</code>
                      </div>
                    </li>
                    <li>
                      Clique em <strong>Save</strong> para salvar as alterações. Pronto! Agora a Vercel só criará deploys através do botão neste painel.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
