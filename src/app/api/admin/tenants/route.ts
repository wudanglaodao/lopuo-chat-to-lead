import { desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb, tenants } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";

const createTenantSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().nullable(),
});

export async function GET() {
  const session = await requireAdmin();

  if (isDemoMode()) {
    return NextResponse.json({
      tenants: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          customerId: session.customerId,
          name: "官网客服",
          description: "营销官网默认转化工作区",
          status: "active",
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          customerId: session.customerId,
          name: "售前咨询",
          description: "售前 FAQ、方案和案例资料",
          status: "active",
        },
      ],
    });
  }

  const rows = await getDb()
    .select()
    .from(tenants)
    .where(eq(tenants.customerId, session.customerId))
    .orderBy(desc(tenants.updatedAt));

  return NextResponse.json({ tenants: rows });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  const body = createTenantSchema.parse(await request.json());

  if (isDemoMode()) {
    return NextResponse.json({
      tenant: {
        id: `demo-tenant-${Date.now()}`,
        customerId: session.customerId,
        name: body.name,
        description: body.description || null,
        status: "demo",
      },
    });
  }

  const [tenant] = await getDb()
    .insert(tenants)
    .values({
      customerId: session.customerId,
      name: body.name,
      description: body.description || null,
    })
    .onConflictDoUpdate({
      target: [tenants.customerId, tenants.name],
      set: {
        description: body.description || null,
        status: "active",
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return NextResponse.json({ tenant });
}
