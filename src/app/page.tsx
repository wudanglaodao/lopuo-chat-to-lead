import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f8f7] text-stone-950">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <div className="text-sm font-medium text-emerald-700">Lopuo AI Customer Service</div>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight">官网 AI 客服端到端 Demo</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            一个 Next.js 全栈 MVP：支持客户隔离、官网知识库同步、RAG 检索、DeepSeek 问答、右下角 Widget 和后台管理。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-md bg-stone-950 px-5 py-3 text-sm font-medium text-white">
              打开 Widget Demo
            </Link>
            <Link href="/admin" className="rounded-md border border-stone-300 px-5 py-3 text-sm font-medium">
              进入后台
            </Link>
          </div>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            ["客户隔离", "从第一版开始所有数据带 customer_id/site_id。"],
            ["RAG 问答", "官网 URL 抓取、清洗、切块、向量化和来源追踪。"],
            ["Harmless", "低置信不强答，敏感商务问题转人工留资。"],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-stone-200 bg-white p-5">
              <div className="font-semibold">{title}</div>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
