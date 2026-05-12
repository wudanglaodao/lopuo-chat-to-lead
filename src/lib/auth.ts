import { createHmac, timingSafeEqual } from "node:crypto";

import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { customerUsers, getDb, sites } from "@/db";
import { DEMO_CUSTOMER_ID, DEMO_SITE_ID, isDemoMode } from "@/lib/demo-mode";

const COOKIE_NAME = "lopuo_admin_session";

export type AdminSession = {
  email: string;
  customerId: string;
  siteId: string;
  role: string;
};

export async function loginAdmin(email: string, password: string) {
  const normalizedEmail = email.toLowerCase();
  const envEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD || "change-me";

  if (isDemoMode() && normalizedEmail === envEmail && password === envPassword) {
    return createSession({
      email: normalizedEmail,
      customerId: DEMO_CUSTOMER_ID,
      siteId: process.env.DEFAULT_SITE_ID || DEMO_SITE_ID,
      role: "admin",
    });
  }

  const db = getDb();
  const [user] = await db.query.customerUsers.findMany({
    where: eq(customerUsers.email, normalizedEmail),
    limit: 1,
  });

  if (user && user.status === "active" && (await compare(password, user.passwordHash))) {
    const [site] = await db.query.sites.findMany({
      where: eq(sites.customerId, user.customerId),
      limit: 1,
    });

    if (!site) {
      throw new Error("No site configured for this customer.");
    }

    return createSession({
      email: user.email,
      customerId: user.customerId,
      siteId: site.id,
      role: user.role,
    });
  }

  const defaultSiteId = process.env.DEFAULT_SITE_ID;

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && defaultSiteId && normalizedEmail === envEmail && password === envPassword) {
    const [site] = await db.query.sites.findMany({
      where: eq(sites.id, defaultSiteId),
      limit: 1,
    });

    if (site) {
      return createSession({
        email: envEmail,
        customerId: site.customerId,
        siteId: site.id,
        role: "admin",
      });
    }
  }

  return null;
}

export async function setSessionCookie(session: AdminSession) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  return value ? verifySession(value) : null;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

function createSession(session: AdminSession) {
  return session;
}

function signSession(session: AdminSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySession(value: string): AdminSession | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
  } catch {
    return null;
  }
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && isDemoMode()) {
    return "lopuo-demo-auth-secret";
  }
  if (!secret) {
    throw new Error("AUTH_SECRET is required.");
  }
  return secret;
}
