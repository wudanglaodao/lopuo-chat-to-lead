import {
  ArrowRight,
  CheckCircle2,
  Database,
  MessageCircle,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-mark";

const features = [
  {
    icon: MessageCircle,
    title: "知识库客服，先把问题答清楚",
    body: "接入官网、产品、案例、FAQ 和报价说明，让访客先得到可信答案，减少无效转人工。",
  },
  {
    icon: Database,
    title: "营销助手，顺着对话引导",
    body: "识别访客正在问方案、价格、案例还是合作方式，主动追问场景、预算和决策周期。",
  },
  {
    icon: ShieldCheck,
    title: "自然留咨，交给销售跟进",
    body: "在意向升温时引导留下电话、微信、公司和需求，后台沉淀完整会话与跟进信息。",
  },
];

const flow = [
  "访客开口咨询",
  "知识库客服回答",
  "判断购买意向",
  "追问并引导留咨",
  "销售接手跟进",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fffaf6] text-[#111318]">
      <Hero />

      <section className="border-y border-[#ffd9cc] bg-[#fffaf6] px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <div className="text-sm font-bold text-[#ff6b4a]">营销型知识库客服</div>
            <h2 className="mt-5 text-3xl font-bold leading-tight md:text-5xl">知识库客服负责回答，营销客服负责转化</h2>
            <p className="mt-6 text-base leading-7 text-[#5d646f]">
              Lopuo Signal 把知识库问答、意向识别、留咨引导和销售跟进放在同一条链路里。访客越问越清楚，后台也能知道谁值得马上联系。
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="group rounded-[22px] border border-[#ffd9cc] bg-white p-6 shadow-[0_18px_48px_rgba(255,107,74,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(255,107,74,0.14)]">
                  <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-[#fff1e8] text-[#ff6b4a] transition group-hover:bg-[#ff6b4a] group-hover:text-white">
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

      <section className="bg-white px-6 py-28">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-sm font-bold text-[#2f7df6]">转化链路</div>
            <h2 className="mt-5 text-3xl font-bold leading-tight md:text-5xl">把官网咨询，接成一条自动留咨链路</h2>
            <p className="mt-6 text-base leading-7 text-[#5d646f]">
              访客先被知识库客服接住，系统再顺着问题识别意向、追问需求、引导留咨。销售拿到的不只是联系方式，还有完整对话上下文。
            </p>
          </div>
          <div className="rounded-[26px] border border-[#ffd9cc] bg-[#fffaf6] p-5 shadow-[0_24px_70px_rgba(255,107,74,0.1)]">
            <div className="flex items-center gap-3 border-b border-[#ffd9cc] pb-4">
              <Workflow className="h-5 w-5 text-[#ff6b4a]" />
              <div className="font-bold">Lopuo Signal 转化台</div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                ["知识库回答", "官网、案例、FAQ"],
                ["意向识别", "价格 / 方案 / 合作"],
                ["营销追问", "需求、预算、周期"],
                ["留咨交接", "手机、微信、公司"],
              ].map(([title, desc], index) => (
                <div key={title} className="rounded-[18px] border border-[#ffd9cc] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">{title}</span>
                    <span className="bg-[#fff1e8] text-[#ff6b4a]">
                      <span className="block rounded-md px-2 py-1 text-xs font-bold">0{index + 1}</span>
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm font-semibold text-[#5d646f]">
                    <div>{desc}</div>
                    <div>自动沉淀到会话记录</div>
                    <div>销售可直接跟进</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="launch-flow" className="bg-[#fffaf6] px-6 py-32 text-[#111318]">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <div className="text-sm font-bold text-[#ff6b4a]">留咨转化流程</div>
              <h2 className="mt-5 text-3xl font-bold leading-tight md:text-5xl">从问答到留咨的营销客服链路</h2>
            </div>
            <Link href="/admin" className="inline-flex w-fit items-center gap-2 rounded-[14px] bg-[#ff6b4a] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_42px_rgba(255,107,74,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ff5530]">
              进入后台配置
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-5">
            {flow.map((item, index) => (
              <div key={item} className="rounded-[20px] border border-[#ffd9cc] bg-white p-4 shadow-[0_18px_48px_rgba(255,107,74,0.1)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#ff6b4a] text-sm font-bold text-white">{index + 1}</span>
                  <CheckCircle2 className="h-5 w-5 text-[#00a878]" />
                </div>
                <div className="mt-4 text-sm font-bold leading-6">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fffaf6_0%,#f6fbff_100%)] px-6 text-[#111318]">
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between py-9">
        <Link href="/" className="text-[#111318]">
          <BrandLogo showTagline />
        </Link>
        <Link href="/admin" className="rounded-[14px] bg-[#ff6b4a] px-4 py-2 text-sm font-bold text-white shadow-[0_18px_42px_rgba(255,107,74,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ff5530]">
          控制台
        </Link>
      </nav>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-112px)] max-w-7xl items-center gap-16 py-24 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1fr)]">
        <div className="max-w-[760px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ffd9cc] bg-white px-4 py-2 text-sm font-bold text-[#ff6b4a] shadow-[0_16px_32px_rgba(255,107,74,0.1)]">
            <MessageCircle className="h-4 w-4" />
            知识库客服 + 留咨转化
          </div>
          <h1 className="mt-9 max-w-[740px] text-5xl font-bold leading-[1.05] text-[#111318] md:text-7xl">让客服不只回答问题，还能主动引导留咨</h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#4e555f]">
            Lopuo Signal 是面向营销型官网的客服转化工具。它基于企业知识库回答咨询，识别访客意向，主动追问需求，并在合适时机引导留下联系方式。
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-[14px] bg-[#ff6b4a] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_42px_rgba(255,107,74,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ff5530]">
              配置营销客服
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#launch-flow" className="inline-flex items-center gap-2 rounded-[14px] border border-[#ffd9cc] bg-white px-5 py-3 text-sm font-bold text-[#111318] shadow-[0_16px_36px_rgba(255,107,74,0.08)] transition hover:-translate-y-0.5 hover:text-[#ff6b4a]">
              查看留咨路径
            </Link>
          </div>
          <div className="mt-14 grid gap-4 text-sm font-bold text-[#4e555f] sm:grid-cols-3">
            {["知识库问答", "主动追问需求", "引导留咨跟进"].map((item) => (
              <div key={item} className="rounded-[16px] border border-[#ffd9cc] bg-white px-4 py-3 shadow-[0_14px_30px_rgba(255,107,74,0.08)]">
                {item}
              </div>
            ))}
          </div>
        </div>

        <ProductScene />
      </div>
    </section>
  );
}

function ProductScene() {
  return (
    <div className="mx-auto w-full max-w-[720px] lg:mx-0">
      <div className="overflow-hidden rounded-[32px] border border-[#ffd9cc] bg-white p-5 shadow-[0_34px_90px_rgba(255,107,74,0.14)]">
        <div className="flex items-center justify-between border-b border-[#ffd9cc] pb-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff8066]" />
            <span className="h-3 w-3 rounded-full bg-[#ffd36e]" />
            <span className="h-3 w-3 rounded-full bg-[#62d28f]" />
            <span className="ml-4 text-sm font-bold text-[#5d646f]">Signal 转化台</span>
          </div>
          <span className="rounded-full bg-[#fff1e8] px-3 py-1 text-xs font-bold text-[#ff6b4a]">运行中</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric icon={Database} label="知识素材" value="18" />
          <Metric icon={MessageCircle} label="意向会话" value="246" />
          <Metric icon={ShieldCheck} label="留咨线索" value="31" />
        </div>

        <div className="mt-4 rounded-[22px] border border-[#ffd9cc] bg-[#fffaf6] p-4">
          <div className="flex items-center gap-2 font-bold text-[#111318]">
            <Workflow className="h-5 w-5 text-[#ff6b4a]" />
            营销意图判断
          </div>
          <div className="mt-4 space-y-3">
            {["报价咨询：追问预算", "方案咨询：匹配案例", "合作意向：引导留咨"].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-[14px] border border-[#ffd9cc] bg-white px-3 py-2 text-sm font-semibold text-[#5d646f]">
                <span>{item}</span>
                <span className="rounded-full bg-[#fff1e8] px-2 py-1 text-xs font-bold text-[#ff6b4a]">高意向</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_0.86fr]">
          <div className="rounded-[22px] border border-[#d9ecff] bg-[#f6fbff] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#2f7df6] text-white">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <div className="font-bold text-[#111318]">营销客服助手</div>
                <div className="text-xs font-semibold text-[#777e89]">正在引导访客留咨</div>
              </div>
            </div>
            <div className="mt-4 rounded-[16px] bg-white p-3 text-sm leading-6 text-[#4e555f]">
              我可以先基于知识库回答，再了解你的业务场景，帮你安排顾问继续沟通。
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-[14px] border border-[#d9ecff] bg-white px-3 py-2 text-sm font-semibold text-[#9aa0aa]">
              留下需求、手机或微信...
              <span className="ml-auto grid h-7 w-7 place-items-center rounded-[10px] bg-[#ff6b4a] text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="rounded-[22px] border border-[#cff0df] bg-[#f5fff9] p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#5d646f]">
              <Workflow className="h-4 w-4 text-[#00a878]" />
              留咨转化
            </div>
            <div className="mt-4 text-4xl font-bold text-[#111318]">68%</div>
            <div className="mt-2 text-xs font-semibold text-[#777e89]">留咨转化率</div>
            <div className="mt-4 rounded-[14px] bg-white px-3 py-2 text-sm font-semibold text-[#4e555f]">
              线索含需求、联系方式、会话摘要
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#ffd9cc] bg-white p-3">
      <Icon className="h-5 w-5 text-[#ff6b4a]" />
      <div className="mt-3 text-2xl font-bold text-[#111318]">{value}</div>
      <div className="text-xs font-semibold text-[#777e89]">{label}</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#ffd9cc] bg-white px-6 py-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <BrandLogo markClassName="h-10 w-10 rounded-[14px]" showTagline tagline="官网客服转化与留咨管理" />
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#777e89]">
          <Link href="/admin" className="transition hover:text-[#ff6b4a]">
            控制台
          </Link>
          <Link href="#launch-flow" className="transition hover:text-[#ff6b4a]">
            留咨流程
          </Link>
          <span>© 2026 Lopuo Signal</span>
        </div>
      </div>
    </footer>
  );
}
