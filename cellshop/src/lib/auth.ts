import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "cellshop_session";
const rawSecret = process.env.AUTH_SECRET;
if (!rawSecret || rawSecret.length < 32 || rawSecret === "troque-por-uma-chave-longa-e-aleatoria") {
  throw new Error("AUTH_SECRET deve ter pelo menos 32 caracteres e ser único do ambiente.");
}
const secret = new TextEncoder().encode(rawSecret);
const issuer = "cellshop";
const audience = "cellshop-app";

export type SessionUser = { id: string; name: string; email: string; role: Role };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime("8h")
    .sign(secret);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { issuer, audience });
    const session = payload as unknown as SessionUser;
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { active: true, email: true, name: true, role: true },
    });
    if (!user?.active) return null;
    return { id: session.id, name: user.name, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}
