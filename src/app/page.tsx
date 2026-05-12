import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Database,
  Layers3,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Building2,
    title: "企业多租户",
    body: "一个企业账户下可拆分多个租户空间，按品牌、事业部、客户项目或解决方案线独立运营。",
  },
  {
    icon: Database,
    title: "租户知识库",
    body: "每个租户维护自己的 URL 来源、清洗文本、向量片段和同步状态，检索时强制按租户隔离。",
  },
  {
    icon: MessageCircle,
    title: "对话转线索",
    body: "访客咨询、低置信问题、商务敏感问题和留资信息统一进入后台，方便后续跟进。",
  },
];

const flow = [
  "创建企业与租户",
  "添加官网 URL",
  "同步向量知识库",
  "嵌入 Widget",
  "收集会话与线索",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f8f7] text-[#111318]">
      <Hero />

      <section className="border-y border-black/[0.06] bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold text-[#007f5f]">Multi-tenant customer service</div>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">从官网咨询，到租户知识库，再到销售线索</h2>
            <p className="mt-4 text-base leading-7 text-[#5d646f]">
              Lopuo 把企业、租户、知识来源、会话和线索分层管理。第一版先服务官网嵌入，后续可以扩展到不同业务空间、不同客户项目和独立交付。
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-lg border border-black/[0.08] bg-[#fbfbfc] p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#e8f7f1] text-[#007f5f]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5d646f]">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8f7] px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-sm font-semibold text-[#2f7df6]">Operating model</div>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">一个企业，多套业务空间</h2>
            <p className="mt-4 text-base leading-7 text-[#5d646f]">
              企业账号用于统一管理权限和站点，租户用于隔离知识库、对话上下文和线索归属。官网 Widget 默认连接一个租户，也可以在后台切换不同租户。
            </p>
          </div>
          <div className="rounded-lg border border-black/[0.08] bg-white p-5">
            <div className="flex items-center gap-3 border-b border-black/[0.06] pb-4">
              <Layers3 className="h-5 w-5 text-[#2f7df6]" />
              <div className="font-bold">Lopuo 企业账户</div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {["默认租户", "售前咨询", "产品资料", "交付支持"].map((tenant, index) => (
                <div key={tenant} className="rounded-lg border border-black/[0.06] bg-[#f7f8f7] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">{tenant}</span>
                    <span className={["bg-[#dff6ee] text-[#007f5f]", "bg-[#e8f1ff] text-[#2f7df6]", "bg-[#fff1e8] text-[#b85f24]", "bg-[#f0ebff] text-[#6c4fd1]"][index]}>
                      <span className="block rounded-md px-2 py-1 text-xs font-bold">Tenant</span>
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm font-semibold text-[#5d646f]">
                    <div>知识来源：{index + 2}</div>
                    <div>会话归属：独立</div>
                    <div>线索跟进：独立</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="text-sm font-semibold text-[#007f5f]">Launch flow</div>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">官网上线路径</h2>
            </div>
            <Link href="/admin" className="inline-flex w-fit items-center gap-2 rounded-md bg-[#111318] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5">
              进入后台配置
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-5">
            {flow.map((item, index) => (
              <div key={item} className="rounded-lg border border-black/[0.08] bg-[#fbfbfc] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-[#111318] text-sm font-bold text-white">{index + 1}</span>
                  <CheckCircle2 className="h-5 w-5 text-[#007f5f]" />
                </div>
                <div className="mt-4 text-sm font-bold leading-6">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Hero() {
  return (
    <section className="relative isolate min-h-[88vh] overflow-hidden bg-[#eef1ef] px-6 py-8">
      <div className="absolute inset-x-0 bottom-0 top-20 -z-10 mx-auto max-w-7xl opacity-95">
        <ProductScene />
      </div>

      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3 font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#111318] text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          Lopuo AI
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/demo" className="rounded-md border border-black/[0.12] bg-white/80 px-4 py-2 text-sm font-bold transition hover:bg-white">
            Demo
          </Link>
          <Link href="/admin" className="rounded-md bg-[#111318] px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5">
            控制台
          </Link>
        </div>
      </nav>

      <div className="mx-auto flex min-h-[72vh] max-w-6xl flex-col justify-center py-16">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#007f5f]/18 bg-white/80 px-3 py-2 text-sm font-bold text-[#007f5f]">
            <Zap className="h-4 w-4" />
            Lopuo AI Customer Service
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-bold leading-[1.08] md:text-7xl">企业多租户 AI 客服系统</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4e555f]">
            面向官网咨询的端到端客服工具。支持企业多租户、租户独立知识库、RAG 问答、低置信转人工和右下角 Widget 嵌入。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className="inline-flex items-center gap-2 rounded-md bg-[#111318] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5">
              打开 Widget Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-md border border-black/[0.12] bg-white/80 px-5 py-3 text-sm font-bold transition hover:bg-white">
              进入后台
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductScene() {
  return (
    <div className="relative h-full min-h-[560px]">
      <div className="absolute right-0 top-14 hidden w-[720px] rounded-lg border border-black/[0.08] bg-white shadow-[0_28px_80px_rgba(17,19,24,0.16)] lg:block">
        <div className="flex items-center gap-2 border-b border-black/[0.06] px-5 py-4">
          <span className="h-3 w-3 rounded-full bg-[#ff8066]" />
          <span className="h-3 w-3 rounded-full bg-[#ffd36e]" />
          <span className="h-3 w-3 rounded-full bg-[#62d28f]" />
          <span className="ml-4 text-sm font-bold text-[#5d646f]">Tenant workspace</span>
        </div>
        <div className="grid grid-cols-[190px_1fr]">
          <div className="border-r border-black/[0.06] bg-[#f7f8f7] p-4">
            {["默认租户", "售前咨询", "产品资料"].map((item, index) => (
              <div key={item} className={["mb-2 rounded-lg px-3 py-3 text-sm font-bold", index === 1 ? "bg-[#111318] text-white" : "bg-white text-[#5d646f]"].join(" ")}>
                {item}
              </div>
            ))}
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              <Metric icon={Database} label="知识来源" value="18" />
              <Metric icon={Bot} label="AI 会话" value="246" />
              <Metric icon={ShieldCheck} label="转人工" value="31" />
            </div>
            <div className="mt-4 rounded-lg border border-black/[0.06] p-4">
              <div className="flex items-center gap-2 font-bold">
                <BrainCircuit className="h-5 w-5 text-[#2f7df6]" />
                RAG 命中来源
              </div>
              <div className="mt-4 space-y-3">
                {["/solutions/ai-service", "/case/growth", "/pricing/contact"].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-md bg-[#f7f8f7] px-3 py-2 text-sm font-semibold text-[#5d646f]">
                    <span>{item}</span>
                    <span className="text-[#007f5f]">synced</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 right-8 w-[330px] rounded-lg border border-black/[0.08] bg-white p-4 shadow-[0_22px_60px_rgba(17,19,24,0.18)] md:right-20">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#007f5f] text-white">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <div className="font-bold">AI 助理</div>
            <div className="text-xs font-semibold text-[#777e89]">基于售前咨询租户回答</div>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-[#f7f8f7] p-3 text-sm leading-6 text-[#4e555f]">
          您好，我可以基于官网资料回答产品、方案和合作方式问题。
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-black/[0.08] px-3 py-2 text-sm font-semibold text-[#9aa0aa]">
          请输入您的问题...
          <span className="ml-auto grid h-7 w-7 place-items-center rounded-md bg-[#2f7df6] text-white">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="absolute left-0 top-24 hidden rounded-lg border border-black/[0.08] bg-white/92 p-4 shadow-[0_18px_48px_rgba(17,19,24,0.12)] md:block">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Workflow className="h-4 w-4 text-[#b85f24]" />
          自动同步
        </div>
        <div className="mt-3 text-3xl font-bold">1,024</div>
        <div className="mt-1 text-xs font-semibold text-[#777e89]">chunks indexed</div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f7f8f7] p-3">
      <Icon className="h-5 w-5 text-[#2f7df6]" />
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold text-[#777e89]">{label}</div>
    </div>
  );
}
