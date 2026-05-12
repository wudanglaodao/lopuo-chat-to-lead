import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { loginAdmin, setSessionCookie } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = loginSchema.parse(await request.json());
  const session = await loginAdmin(body.email, body.password);

  if (!session) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await setSessionCookie(session);
  return NextResponse.json({ ok: true });
}
