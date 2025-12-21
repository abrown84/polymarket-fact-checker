/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_aiEmbed from "../actions/aiEmbed.js";
import type * as actions_aiParseClaim from "../actions/aiParseClaim.js";
import type * as actions_aiRerank from "../actions/aiRerank.js";
import type * as actions_cleanupOldMarkets from "../actions/cleanupOldMarkets.js";
import type * as actions_factCheck from "../actions/factCheck.js";
import type * as actions_getPopularMarkets from "../actions/getPopularMarkets.js";
import type * as actions_ingestMarkets from "../actions/ingestMarkets.js";
import type * as actions_polymarket from "../actions/polymarket.js";
import type * as actions_retrieveCandidates from "../actions/retrieveCandidates.js";
import type * as actions_testApiEndpoints from "../actions/testApiEndpoints.js";
import type * as actions_testApiResponse from "../actions/testApiResponse.js";
import type * as actions_testConnections from "../actions/testConnections.js";
import type * as cron from "../cron.js";
import type * as http from "../http.js";
import type * as mutations from "../mutations.js";
import type * as queries from "../queries.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/aiEmbed": typeof actions_aiEmbed;
  "actions/aiParseClaim": typeof actions_aiParseClaim;
  "actions/aiRerank": typeof actions_aiRerank;
  "actions/cleanupOldMarkets": typeof actions_cleanupOldMarkets;
  "actions/factCheck": typeof actions_factCheck;
  "actions/getPopularMarkets": typeof actions_getPopularMarkets;
  "actions/ingestMarkets": typeof actions_ingestMarkets;
  "actions/polymarket": typeof actions_polymarket;
  "actions/retrieveCandidates": typeof actions_retrieveCandidates;
  "actions/testApiEndpoints": typeof actions_testApiEndpoints;
  "actions/testApiResponse": typeof actions_testApiResponse;
  "actions/testConnections": typeof actions_testConnections;
  cron: typeof cron;
  http: typeof http;
  mutations: typeof mutations;
  queries: typeof queries;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
