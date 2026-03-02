"use node";

import fs from "fs";
import path from "path";

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

export function getChatConfig(): { provider: Provider; apiUrl: string; apiKey: string; model: string } {
  const provider = resolveProvider();

  if (provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY || keyFromPiAuth("openrouter");
    if (!apiKey) {
      throw new Error("Missing OpenRouter credential (OPENROUTER_API_KEY or ~/.pi/agent/auth.json openrouter key)");
    }
    return {
      provider,
      apiUrl: "https://openrouter.ai/api/v1/chat/completions",
      apiKey,
      model: process.env.OPENROUTER_CHAT_MODEL || "inflection/inflection-3-pi",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY || keyFromPiAuth("openai");
  if (!apiKey) {
    throw new Error("Missing OpenAI credential (OPENAI_API_KEY or ~/.pi/agent/auth.json openai key)");
  }
  return {
    provider,
    apiUrl: "https://api.openai.com/v1/chat/completions",
    apiKey,
    model: process.env.OPENAI_CHAT_MODEL || "gpt-5.1-codex-mini",
  };
}

export function getEmbedConfig(): { provider: Provider; apiUrl: string; apiKey: string; model: string } {
  const provider = resolveProvider();

  if (provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY || keyFromPiAuth("openrouter");
    if (!apiKey) {
      throw new Error("Missing OpenRouter credential (OPENROUTER_API_KEY or ~/.pi/agent/auth.json openrouter key)");
    }
    return {
      provider,
      apiUrl: "https://openrouter.ai/api/v1/embeddings",
      apiKey,
      model: process.env.OPENROUTER_EMBED_MODEL || "openai/text-embedding-3-small",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY || keyFromPiAuth("openai");
  if (!apiKey) {
    throw new Error("Missing OpenAI credential (OPENAI_API_KEY or ~/.pi/agent/auth.json openai key)");
  }
  return {
    provider,
    apiUrl: "https://api.openai.com/v1/embeddings",
    apiKey,
    model: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
  };
}
