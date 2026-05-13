import Script from "next/script";

import { DEMO_SITE_ID } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string; text?: string; tenantId?: string; locale?: string }>;
}) {
  const params = await searchParams;
  const siteId = process.env.DEFAULT_SITE_ID || DEMO_SITE_ID;

  return (
    <main className="min-h-screen bg-white text-stone-950">
      <section className="border-b border-stone-200 bg-[#eef7f2]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-sm font-medium text-emerald-700">营销官网预览</div>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">这是一页模拟营销官网，用来测试右下角 AI 营销助手</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            你可以先在后台配置知识库素材和留咨话术，然后回到这里打开助手，测试问答、追问、留咨和销售跟进流程。
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-3">
        <div>
          <h2 className="text-xl font-semibold">知识库客服</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            基于官网、案例、产品和 FAQ 回答访客问题，让咨询先被准确接住。
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">营销引导</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            在访客询价、对比方案或表达合作意向时，主动追问需求并引导下一步。
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">留咨转化</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            遇到报价、周期和合作细节时，引导访客留下电话、微信、公司和需求。
          </p>
        </div>
      </section>
      <Script
        src="/widget.js"
        data-site-id={siteId}
        data-tenant-id={params.tenantId || ""}
        data-locale={params.locale || ""}
        data-preview-style={params.style || ""}
        data-preview-text={params.text || ""}
        strategy="afterInteractive"
      />
    </main>
  );
}
