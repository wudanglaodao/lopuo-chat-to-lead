import Script from "next/script";

import { DEMO_SITE_ID } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string; text?: string; tenantId?: string }>;
}) {
  const params = await searchParams;
  const siteId = process.env.DEFAULT_SITE_ID || DEMO_SITE_ID;

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <section className="border-b border-stone-200 bg-[#eef7f2]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-sm font-medium text-emerald-700">Demo Website</div>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">这是一页模拟官网，用来测试右下角 AI 助理</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            你可以先在后台配置知识库并同步官网 URL，然后回到这里打开 AI 助理，测试问答、未命中和留资流程。
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-3">
        <div>
          <h2 className="text-xl font-semibold">产品能力</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            支持嵌入式 Widget、客户独立知识库、会话记录、线索收集和后台配置。
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">知识库</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            通过 URL 同步官网内容，清洗页面正文，切块后写入 pgvector 做语义检索。
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">安全边界</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            AI 不代表公司做报价、合同和交付承诺；低置信问题会引导人工跟进。
          </p>
        </div>
      </section>
      <Script
        src="/widget.js"
        data-site-id={siteId}
        data-tenant-id={params.tenantId || ""}
        data-preview-style={params.style || ""}
        data-preview-text={params.text || ""}
        strategy="afterInteractive"
      />
    </main>
  );
}
