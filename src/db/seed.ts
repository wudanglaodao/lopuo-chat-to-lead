import "dotenv/config";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

import { customerUsers, customers, getDb, sites } from "@/db";
import { DEFAULT_SUGGESTED_QUESTIONS, DEFAULT_WELCOME_MESSAGE } from "@/lib/defaults";

const DEFAULT_CUSTOMER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_SITE_ID = process.env.DEFAULT_SITE_ID || "11111111-1111-4111-8111-111111111111";
const SECOND_CUSTOMER_ID = "00000000-0000-0000-0000-000000000002";
const SECOND_SITE_ID = "22222222-2222-4222-8222-222222222222";

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
      primaryDomain: process.env.DEFAULT_SITE_DOMAIN || "localhost:3000",
      contactEmail: adminEmail,
    })
    .onConflictDoUpdate({
      target: customers.id,
      set: {
        name: process.env.DEFAULT_CUSTOMER_NAME || "Lopuo",
        primaryDomain: process.env.DEFAULT_SITE_DOMAIN || "localhost:3000",
      },
    });

  await db
    .insert(sites)
    .values({
      id: DEFAULT_SITE_ID,
      customerId: DEFAULT_CUSTOMER_ID,
      name: process.env.DEFAULT_SITE_NAME || "Lopuo 官网",
      domain: process.env.DEFAULT_SITE_DOMAIN || "localhost:3000",
      widgetName: process.env.DEFAULT_WIDGET_NAME || "AI 助理",
      launcherText: "AI 助理",
      launcherStyle: "vertical",
      launcherBadgeText: "1",
      launcherAnimation: "pulse",
      welcomeMessage: DEFAULT_WELCOME_MESSAGE,
      suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
      allowedOrigins: [process.env.DEFAULT_SITE_DOMAIN || "localhost:3000"],
    })
    .onConflictDoUpdate({
      target: sites.id,
      set: {
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

  await db
    .insert(customers)
    .values({
      id: SECOND_CUSTOMER_ID,
      name: "Demo Client B",
      primaryDomain: "client-b.example.com",
    })
    .onConflictDoNothing({ target: customers.id });

  await db
    .insert(sites)
    .values({
      id: SECOND_SITE_ID,
      customerId: SECOND_CUSTOMER_ID,
      name: "Client B 官网",
      domain: "client-b.example.com",
      widgetName: "客户 B AI 助理",
      launcherText: "与 AI 聊天",
      launcherStyle: "pill",
      launcherBadgeText: "1",
      launcherAnimation: "pulse",
      welcomeMessage: DEFAULT_WELCOME_MESSAGE,
      suggestedQuestions: DEFAULT_SUGGESTED_QUESTIONS,
      allowedOrigins: ["client-b.example.com"],
    })
    .onConflictDoNothing({ target: sites.id });

  const [site] = await db.select().from(sites).where(eq(sites.id, DEFAULT_SITE_ID)).limit(1);
  console.log(`Seed complete. Default site id: ${site?.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
