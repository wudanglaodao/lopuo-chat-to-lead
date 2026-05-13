import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { conversations, getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";

export async function GET() {
  const session = await requireAdmin();
  if (isDemoMode()) {
    return NextResponse.json({
      conversations: [
        {
          id: "demo-conversation",
          customerId: session.customerId,
          tenantId: "22222222-2222-4222-8222-222222222222",
          tenant: {
            id: "22222222-2222-4222-8222-222222222222",
            name: "官网客服",
          },
          siteId: session.siteId,
          pageUrl: "http://localhost:3000/demo",
          hasMiss: false,
          hasLead: true,
          messages: [
            {
              id: "demo-message-1",
              role: "user",
              content: "你们能帮我的企业解决什么具体问题？",
            },
            {
              id: "demo-message-2",
              role: "assistant",
              content:
                "预览模式下这里展示模拟回复。接入知识库后，AI 会基于官网内容回答，并在价格、合同、交付承诺等问题上引导留咨跟进。",
            },
          ],
          leads: [
            {
              id: "demo-lead-1",
              name: "演示客户",
              phone: "138****0000",
              company: "某某科技",
            },
          ],
        },
      ],
    });
  }

  const db = getDb();
  const rows = await db.query.conversations.findMany({
    where: and(
      eq(conversations.customerId, session.customerId),
      eq(conversations.siteId, session.siteId),
    ),
    with: {
      tenant: true,
      messages: true,
      leads: true,
    },
    orderBy: desc(conversations.updatedAt),
    limit: 50,
  });

  return NextResponse.json({ conversations: rows });
}
