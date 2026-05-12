import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { syncKnowledgeSource } from "@/lib/knowledge";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  const { id } = await context.params;
  const result = await syncKnowledgeSource(id, session.customerId);
  return NextResponse.json({ result });
}
