import { tool } from "ai";
import { z } from "zod";
import { supabase } from "../utils/supabase";

type CountResult = { count: number };

// Default organization ID - you can change this to your preferred default
const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

function isoDateNDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const getSitesCountTool = tool({
  description: "Get the total number of sites (optionally filtered by organization)",
  inputSchema: z
    .object({
      organizationId: z.string().uuid().optional().describe("Filter by organization UUID"),
    })
    .optional(),
  execute: async (input): Promise<CountResult> => {
    const q = supabase.from("sites").select("id", { count: "exact", head: true });
    const organizationId = input?.organizationId || DEFAULT_ORGANIZATION_ID;
    q.eq("organization_id", organizationId);
    const { count, error } = await q;
    if (error) throw error;
    return { count: count ?? 0 };
  },
});

export const getDeliveriesCountLastNDaysTool = tool({
  description: "Get number of deliveries created in the last N days (default 30)",
  inputSchema: z.object({
    days: z.number().int().min(1).max(90).default(30),
    organizationId: z.string().uuid().optional(),
    status: z
      .enum(["pending", "in_progress", "delivered", "failed"]).optional()
      .describe("Optional status filter"),
  }),
  execute: async ({ days, organizationId, status }): Promise<CountResult> => {
    const since = isoDateNDaysAgo(days);
    let q = supabase
      .from("deliveries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;
    q = q.eq("organization_id", orgId);
    if (status) q = q.eq("status", status);
    const { count, error } = await q;
    if (error) throw error;
    return { count: count ?? 0 };
  },
});

export const getCollectionsCountLastNDaysTool = tool({
  description:
    "Get number of collection events (calendar_events.event_type = 'collection') in the last N days (default 30)",
  inputSchema: z.object({
    days: z.number().int().min(1).max(90).default(30),
    organizationId: z.string().uuid().optional(),
    status: z
      .enum(["scheduled", "in-progress", "completed", "cancelled"]).optional()
      .describe("Optional status filter"),
  }),
  execute: async ({ days, organizationId, status }): Promise<CountResult> => {
    const since = isoDateNDaysAgo(days);
    let q = supabase
      .from("calendar_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "collection")
      .gte("created_at", since);
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;
    q = q.eq("organization_id", orgId);
    if (status) q = q.eq("status", status);
    const { count, error } = await q;
    if (error) throw error;
    return { count: count ?? 0 };
  },
});

export const getDeliveriesCountByStatusTool = tool({
  description: "Get counts of deliveries grouped by status for the last N days (default 30)",
  inputSchema: z.object({
    days: z.number().int().min(1).max(90).default(30),
    organizationId: z.string().uuid().optional(),
  }),
  execute: async ({ days, organizationId }): Promise<{ breakdown: Record<string, number> }> => {
    const since = isoDateNDaysAgo(days);
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    const statuses = ["pending", "in_progress", "delivered", "failed"] as const;
    const requests = statuses.map(async (s) => {
      let q = supabase
        .from("deliveries")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .eq("status", s)
        .eq("organization_id", orgId);
      const { count, error } = await q;
      if (error) throw error;
      return [s, count ?? 0] as const;
    });

    const pairs = await Promise.all(requests);
    const breakdown: Record<string, number> = Object.fromEntries(pairs);
    return { breakdown };
  },
});

export const getSitesByRegionCountsTool = tool({
  description: "Get counts of sites grouped by region",
  inputSchema: z.object({
    organizationId: z.string().uuid().optional(),
  }).optional(),
  execute: async (input): Promise<{ breakdown: Record<string, number> }> => {
    // Regions enum: ['north', 'south', 'central'] per schema
    const regions = ["north", "south", "central"] as const;
    const orgId = input?.organizationId || DEFAULT_ORGANIZATION_ID;
    const requests = regions.map(async (r) => {
      let q = supabase
        .from("sites")
        .select("id", { count: "exact", head: true })
        .eq("region", r)
        .eq("organization_id", orgId);
      const { count, error } = await q;
      if (error) throw error;
      return [r, count ?? 0] as const;
    });
    const pairs = await Promise.all(requests);
    const breakdown: Record<string, number> = Object.fromEntries(pairs);
    return { breakdown };
  },
});

export type LogisticsTools = {
  getSitesCountTool: typeof getSitesCountTool;
  getDeliveriesCountLastNDaysTool: typeof getDeliveriesCountLastNDaysTool;
  getCollectionsCountLastNDaysTool: typeof getCollectionsCountLastNDaysTool;
  getDeliveriesCountByStatusTool: typeof getDeliveriesCountByStatusTool;
  getSitesByRegionCountsTool: typeof getSitesByRegionCountsTool;
};


