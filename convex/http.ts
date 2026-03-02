import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

// Type-safe internal API references
const internalApi = internal as {
  actions: {
    ingestMarkets: { ingestMarkets: any };
    bulkIngest: { bulkIngest: any; continuousIngest: any };
  };
};

const http = httpRouter();

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

async function createPkcePair() {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(48));
  const codeVerifier = toBase64Url(verifierBytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const codeChallenge = toBase64Url(new Uint8Array(digest));
  return { codeVerifier, codeChallenge };
}

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }),
});

// Trigger market ingestion endpoint
http.route({
  path: "/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined;
      const cursor = url.searchParams.get("cursor") || null;

      const result = await ctx.runAction(internalApi.actions.ingestMarkets.ingestMarkets, {
        cursor,
        limit,
      });

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }),
});

// Bulk ingestion endpoint - processes all available markets
http.route({
  path: "/ingest/bulk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const maxBatches = body.maxBatches || 1000;
      const batchSize = body.batchSize || 1000;

      const result = await ctx.runAction(internalApi.actions.bulkIngest.bulkIngest, {
        maxBatches,
        batchSize,
      });

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }),
});

// Continuous ingestion endpoint - runs until max duration
http.route({
  path: "/ingest/continuous",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const batchSize = body.batchSize || 1000;
      const maxDuration = body.maxDuration || 60 * 60 * 1000; // 1 hour default

      const result = await ctx.runAction(internalApi.actions.bulkIngest.continuousIngest, {
        batchSize,
        maxDuration,
      });

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Unknown error",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }),
});

http.route({
  path: "/auth/openai/start",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const baseUrl = process.env.CONVEX_SITE_URL || new URL(request.url).origin;
    const provider = "openai";
    const accountId = "default";
    const clientId = process.env.OPENAI_OAUTH_CLIENT_ID;
    const authorizeUrl = process.env.OPENAI_OAUTH_AUTHORIZE_URL || "https://auth.openai.com/oauth/authorize";
    const scope = process.env.OPENAI_OAUTH_SCOPE || "openid profile offline_access";

    if (!clientId) {
      return new Response("Missing OPENAI_OAUTH_CLIENT_ID", { status: 500 });
    }

    const redirectUri = `${baseUrl}/auth/openai/callback`;
    const { codeVerifier, codeChallenge } = await createPkcePair();
    const state = crypto.randomUUID();

    await ctx.runMutation(api.auth.createPkceState, {
      provider,
      state,
      codeVerifier,
      redirectUri,
      accountId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const authUrl = new URL(authorizeUrl);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return Response.redirect(authUrl.toString(), 302);
  }),
});

http.route({
  path: "/auth/openai/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const provider = "openai";
    const tokenUrl = process.env.OPENAI_OAUTH_TOKEN_URL || "https://api.openai.com/v1/oauth/token";
    const clientId = process.env.OPENAI_OAUTH_CLIENT_ID;
    const clientSecret = process.env.OPENAI_OAUTH_CLIENT_SECRET;
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) return new Response(`<h3>OAuth failed: ${error}</h3>`, { status: 400, headers: { "content-type": "text/html" } });
    if (!code || !state || !clientId) return new Response("Missing OAuth parameters", { status: 400 });

    const pkce = await ctx.runMutation(api.auth.consumePkceState, { provider, state });
    if (!pkce) return new Response("Invalid or expired state", { status: 400 });

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      redirect_uri: pkce.redirectUri,
      code_verifier: pkce.codeVerifier,
    });
    if (clientSecret) body.set("client_secret", clientSecret);

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      return new Response(`Token exchange failed: ${res.status} ${await res.text()}`, { status: 500 });
    }

    const token = await res.json();
    await ctx.runMutation(api.auth.upsertAuthProfile, {
      provider,
      accountId: pkce.accountId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : null,
      tokenType: token.token_type ?? "Bearer",
      scope: token.scope ?? null,
    });

    return new Response(
      `<!doctype html><html><body style="font-family: sans-serif; padding: 20px;"><h3>OpenAI connected.</h3><p>You can close this window.</p><script>window.close()</script></body></html>`,
      { status: 200, headers: { "content-type": "text/html" } }
    );
  }),
});

export default http;
