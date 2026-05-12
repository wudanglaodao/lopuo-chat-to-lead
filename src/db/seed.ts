import { config } from "dotenv";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

import { closeDb, customerUsers, customers, getDb, tenants, sites } from "@/db";
import { DEFAULT_SUGGESTED_QUESTIONS, DEFAULT_WELCOME_MESSAGE } from "@/lib/defaults";

config({ path: ".env.local" });
config();

const DEFAULT_CUSTOMER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "22222222-2222-4222-8222-222222222222";
const DEFAULT_SITE_ID = process.env.DEFAULT_SITE_ID || "11111111-1111-4111-8111-111111111111";
const DEFAULT_SITE_DOMAIN = process.env.DEFAULT_SITE_DOMAIN || "lopuo.work";

async function main() {
  const db = getDb();
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "change-me";
  const passwordHash = await hash(adminPassword, 10);

  await db
    .insert(customers)
    .values({
      id: DEFAULT_CUSTOMER_ID,
      name: process.env.DEFAULT_CUSTOMER_NAME || "Lopuo",
      primaryDomain: DEFAULT_SITE_DOMAIN,
      contactEmail: adminEmail,
    })
    .onConflictDoUpdate({
      target: customers.id,
      set: {
        name: process.env.DEFAULT_CUSTOMER_NAME || "Lopuo",
        primaryDomain: DEFAULT_SITE_DOMAIN,
      },
    });

  const [tenant] = await db
    .insert(tenants)
    .values({
      id: DEFAULT_TENANT_ID,
      customerId: DEFAULT_CUSTOMER_ID,
      name: "默认租户",
      description: "官网 AI 客服默认租户",
    })
    .onConflictDoUpdate({
      target: [tenants.customerId, tenants.name],
      set: {
        description: "官网 AI 客服默认租户",
      },
    })
    .returning();
  const activeTenantId = tenant.id;

  await db
    .insert(sites)
    .values({
      id: DEFAULT_SITE_ID,
      customerId: DEFAULT_CUSTOMER_ID,
      defaultTenantId: activeTenantId,
      name: process.env.DEFAULT_SITE_NAME || "Lopuo 官网",
      domain: DEFAULT_SITE_DOMAIN,
      widgetName: process.env.DEFAULT_WIDGET_NAME || "AI 助理",
      launcherText: "AI 助理",
      launcherStyle: "vertical",
      launcherBadgeText: "1",
      launcherAnimation: "pulse",
      welcomeMessage: DEFAULT_WELCOME_MESSAGE,
      suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
      allowedOrigins: Array.from(new Set([DEFAULT_SITE_DOMAIN, `www.${DEFAULT_SITE_DOMAIN.replace(/^www\./, "")}`, "localhost:3000", "127.0.0.1:3000"])),
    })
    .onConflictDoUpdate({
      target: sites.id,
      set: {
        defaultTenantId: activeTenantId,
        widgetName: process.env.DEFAULT_WIDGET_NAME || "AI 助理",
        launcherText: "AI 助理",
        launcherStyle: "vertical",
        launcherBadgeText: "1",
        launcherAnimation: "pulse",
        welcomeMessage: DEFAULT_WELCOME_MESSAGE,
        suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
      },
    });

  await db
    .insert(customerUsers)
    .values({
      customerId: DEFAULT_CUSTOMER_ID,
      email: adminEmail.toLowerCase(),
      name: "Admin",
      role: "admin",
      passwordHash,
    })
    .onConflictDoUpdate({
      target: customerUsers.email,
      set: { passwordHash, status: "active" },
    });

  const [site] = await db.select().from(sites).where(eq(sites.id, DEFAULT_SITE_ID)).limit(1);
  console.log(`Seed complete. Default site id: ${site?.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => closeDb());
