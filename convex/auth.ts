import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAuthProfile = query({
  args: { provider: v.string(), accountId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authProfiles")
      .withIndex("by_provider_account", (q) =>
        q.eq("provider", args.provider).eq("accountId", args.accountId)
      )
      .first();
  },
});

export const getAuthStatus = query({
  args: { provider: v.optional(v.string()), accountId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const provider = args.provider ?? "openai";
    const accountId = args.accountId ?? "default";
    const profile = await ctx.db
      .query("authProfiles")
      .withIndex("by_provider_account", (q) => q.eq("provider", provider).eq("accountId", accountId))
      .first();

    const now = Date.now();
    const expiresInMs = profile?.expiresAt ? profile.expiresAt - now : null;

    return {
      connected: !!profile,
      provider,
      accountId,
      expiresAt: profile?.expiresAt ?? null,
      expiresInMs,
      hasRefreshToken: !!profile?.refreshToken,
      updatedAt: profile?.updatedAt ?? null,
    };
  },
});

export const upsertAuthProfile = mutation({
  args: {
    provider: v.string(),
    accountId: v.string(),
    accessToken: v.string(),
    refreshToken: v.union(v.string(), v.null()),
    expiresAt: v.union(v.number(), v.null()),
    tokenType: v.union(v.string(), v.null()),
    scope: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("authProfiles")
      .withIndex("by_provider_account", (q) => q.eq("provider", args.provider).eq("accountId", args.accountId))
      .first();

    const patch = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("authProfiles", patch);
  },
});

export const deleteAuthProfile = mutation({
  args: { provider: v.string(), accountId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("authProfiles")
      .withIndex("by_provider_account", (q) => q.eq("provider", args.provider).eq("accountId", args.accountId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return { deleted: !!existing };
  },
});

export const createPkceState = mutation({
  args: {
    provider: v.string(),
    state: v.string(),
    codeVerifier: v.string(),
    redirectUri: v.string(),
    accountId: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("authPkceStates", {
      provider: args.provider,
      state: args.state,
      codeVerifier: args.codeVerifier,
      redirectUri: args.redirectUri,
      accountId: args.accountId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      consumedAt: null,
    });
  },
});

export const consumePkceState = mutation({
  args: { provider: v.string(), state: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("authPkceStates")
      .withIndex("by_provider_state", (q) => q.eq("provider", args.provider).eq("state", args.state))
      .first();
    if (!row) return null;
    if (row.consumedAt) return null;
    if (row.expiresAt < Date.now()) return null;

    await ctx.db.patch(row._id, { consumedAt: Date.now() });
    return row;
  },
});

export const tryAcquireRefreshLock = mutation({
  args: { provider: v.string(), accountId: v.string(), owner: v.string(), ttlMs: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const lock = await ctx.db
      .query("authRefreshLocks")
      .withIndex("by_provider_account", (q) => q.eq("provider", args.provider).eq("accountId", args.accountId))
      .first();

    if (!lock || lock.lockedUntil <= now || lock.owner === args.owner) {
      const value = {
        provider: args.provider,
        accountId: args.accountId,
        owner: args.owner,
        lockedUntil: now + args.ttlMs,
        createdAt: lock?.createdAt ?? now,
        updatedAt: now,
      };
      if (lock) {
        await ctx.db.patch(lock._id, value);
      } else {
        await ctx.db.insert("authRefreshLocks", value);
      }
      return true;
    }
    return false;
  },
});

export const releaseRefreshLock = mutation({
  args: { provider: v.string(), accountId: v.string(), owner: v.string() },
  handler: async (ctx, args) => {
    const lock = await ctx.db
      .query("authRefreshLocks")
      .withIndex("by_provider_account", (q) => q.eq("provider", args.provider).eq("accountId", args.accountId))
      .first();
    if (!lock) return;
    if (lock.owner !== args.owner) return;
    await ctx.db.patch(lock._id, { lockedUntil: Date.now() - 1, updatedAt: Date.now() });
  },
});
