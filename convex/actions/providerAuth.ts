"use node";

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ActionCtx, action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

type Provider = "openai" | "openrouter";

type PiAuthEntry = { type?: string; key?: string; accessToken?: string };
type PiAuth = Record<string, PiAuthEntry>;

function readPiAuth(): PiAuth {
  try {
    const authPath = process.env.PI_AUTH_FILE || path.join(process.env.HOME || "/root", ".pi", "agent", "auth.json");
    if (!fs.existsSync(authPath)) return {};
    return JSON.parse(fs.readFileSync(authPath, "utf8"));
  } catch {
    return {};
  }
}

function keyFromPiAuth(provider: Provider): string | null {
  const auth = readPiAuth();
  const entry = auth[provider];
  if (!entry) return null;
  if (entry.type === "api_key" && entry.key) return entry.key;
  if (entry.type === "oauth" && entry.accessToken) return entry.accessToken;
  return entry.key || null;
}

function resolveProvider(): Provider {
  const explicit = (process.env.LLM_PROVIDER || "").toLowerCase();
  if (explicit === "openai" || explicit === "openrouter") return explicit;

  const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY || keyFromPiAuth("openrouter"));
  if (hasOpenRouter) return "openrouter";
  return "openai";
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function getOAuthEnv(provider: Provider) {
  if (provider !== "openai") return null;

  const clientId = process.env.OPENAI_OAUTH_CLIENT_ID;
  const clientSecret = process.env.OPENAI_OAUTH_CLIENT_SECRET;
  const authorizeUrl = process.env.OPENAI_OAUTH_AUTHORIZE_URL || "https://auth.openai.com/oauth/authorize";
  const tokenUrl = process.env.OPENAI_OAUTH_TOKEN_URL || "https://api.openai.com/v1/oauth/token";
  const scope = process.env.OPENAI_OAUTH_SCOPE || "openid profile offline_access";

  if (!clientId) return null;
  return { clientId, clientSecret, authorizeUrl, tokenUrl, scope };
}

function base64url(input: Buffer) {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createPkcePair() {
  const codeVerifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge: challenge };
}

export async function resolveAccessToken(
  ctx: ActionCtx,
  provider: Provider,
  accountId = "default"
): Promise<string | null> {
  const profile = await ctx.runQuery(api.auth.getAuthProfile, { provider, accountId });

  if (profile) {
    const now = Date.now();
    if (!profile.expiresAt || profile.expiresAt - now > 60_000) {
      return profile.accessToken;
    }
    if (profile.refreshToken) {
      const refreshed = await refreshOAuthToken(ctx, provider, accountId);
      if (refreshed) return refreshed;
    }
  }

  // API key fallback (env or ~/.pi auth file)
  if (provider === "openrouter") {
    return process.env.OPENROUTER_API_KEY || keyFromPiAuth("openrouter");
  }
  return process.env.OPENAI_API_KEY || keyFromPiAuth("openai");
}

export async function refreshOAuthToken(
  ctx: ActionCtx,
  provider: Provider,
  accountId = "default"
): Promise<string | null> {
  const profile = await ctx.runQuery(api.auth.getAuthProfile, { provider, accountId });
  if (!profile?.refreshToken) return null;

  const oauth = getOAuthEnv(provider);
  if (!oauth) return null;

  const owner = randomId("refresh");
  const locked = await ctx.runMutation(api.auth.tryAcquireRefreshLock, {
    provider,
    accountId,
    owner,
    ttlMs: 30_000,
  });

  if (!locked) {
    await new Promise((r) => setTimeout(r, 700));
    const afterWait = await ctx.runQuery(api.auth.getAuthProfile, { provider, accountId });
    return afterWait?.accessToken ?? null;
  }

  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: profile.refreshToken,
      client_id: oauth.clientId,
    });

    if (oauth.clientSecret) body.set("client_secret", oauth.clientSecret);

    const res = await fetch(oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Token refresh failed: ${res.status} ${txt}`);
    }

    const token = await res.json();
    const expiresAt = token.expires_in ? Date.now() + token.expires_in * 1000 : null;

    await ctx.runMutation(api.auth.upsertAuthProfile, {
      provider,
      accountId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? profile.refreshToken,
      expiresAt,
      tokenType: token.token_type ?? "Bearer",
      scope: token.scope ?? null,
    });

    return token.access_token;
  } catch (err) {
    console.error("refreshOAuthToken error", err);
    return null;
  } finally {
    await ctx.runMutation(api.auth.releaseRefreshLock, { provider, accountId, owner });
  }
}

export async function getChatConfig(ctx: ActionCtx): Promise<{ provider: Provider; apiUrl: string; apiKey: string; model: string }> {
  const provider = resolveProvider();

  if (provider === "openrouter") {
    const apiKey = await resolveAccessToken(ctx, "openrouter");
    if (!apiKey) throw new Error("Missing OpenRouter credential (OAuth/API key)");
    return {
      provider,
      apiUrl: "https://openrouter.ai/api/v1/chat/completions",
      apiKey,
      model: process.env.OPENROUTER_CHAT_MODEL || "inflection/inflection-3-pi",
    };
  }

  const apiKey = await resolveAccessToken(ctx, "openai");
  if (!apiKey) throw new Error("Missing OpenAI credential (OAuth/API key)");
  return {
    provider,
    apiUrl: "https://api.openai.com/v1/chat/completions",
    apiKey,
    model: process.env.OPENAI_CHAT_MODEL || "gpt-5.1-codex-mini",
  };
}

export async function getEmbedConfig(ctx: ActionCtx): Promise<{ provider: Provider; apiUrl: string; apiKey: string; model: string }> {
  const provider = resolveProvider();

  if (provider === "openrouter") {
    const apiKey = await resolveAccessToken(ctx, "openrouter");
    if (!apiKey) throw new Error("Missing OpenRouter credential (OAuth/API key)");
    return {
      provider,
      apiUrl: "https://openrouter.ai/api/v1/embeddings",
      apiKey,
      model: process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-small",
    };
  }

  const apiKey = await resolveAccessToken(ctx, "openai");
  if (!apiKey) throw new Error("Missing OpenAI credential (OAuth/API key)");
  return {
    provider,
    apiUrl: "https://api.openai.com/v1/embeddings",
    apiKey,
    model: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
  };
}

export const authDisconnect = action({
  args: {
    provider: v.optional(v.union(v.literal("openai"), v.literal("openrouter"))),
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const provider = args.provider ?? "openai";
    const accountId = args.accountId ?? "default";
    return await ctx.runMutation(api.auth.deleteAuthProfile, { provider, accountId });
  },
});
