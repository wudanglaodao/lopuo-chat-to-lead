import { desc, eq } from "drizzle-orm";

import { getDb, tenants, type Tenant } from "@/db";
import { isDemoMode } from "@/lib/demo-mode";

export type TenantOption = Pick<Tenant, "id" | "customerId" | "name" | "description" | "status">;

export async function getTenantOptions(customerId: string) {
  if (isDemoMode()) {
    return getDemoTenants(customerId);
  }

  return getDb()
    .select()
    .from(tenants)
    .where(eq(tenants.customerId, customerId))
    .orderBy(desc(tenants.updatedAt));
}

export function resolveActiveTenant(
  tenantRows: TenantOption[],
  requestedTenantId?: string | null,
  fallbackTenantId?: string | null,
) {
  return (
    tenantRows.find((tenant) => tenant.id === requestedTenantId) ||
    tenantRows.find((tenant) => tenant.id === fallbackTenantId) ||
    tenantRows[0] ||
    null
  );
}

export function getDemoTenants(customerId: string): Tenant[] {
  return [
    {
      id: "22222222-2222-4222-8222-222222222222",
      customerId,
      name: "官网客服",
      description: "营销官网默认转化工作区",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      customerId,
      name: "售前咨询",
      description: "售前 FAQ、方案和案例资料",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}
