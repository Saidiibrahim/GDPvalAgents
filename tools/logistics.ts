import { tool } from "ai";
import { z } from "zod";
import { supabase } from "../utils/supabase";

type CountResult = { count: number };

type OrderDetail = {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  recipientName: string | null;
  deliveryAddress: string | null;
  siteId: string | null;
  scheduledDate: string | null;
  priority: boolean;
  createdAt: string;
};

type DriverDetail = {
  id: string;
  fullName: string | null;
  email: string;
  role: string;
  isAvailable: boolean;
  isActive: boolean;
  vehicleId: string | null;
  phoneNumber: string | null;
  driverColor: string | null;
};

type CalendarEventSummary = {
  id: string;
  title: string;
  eventType: string;
  status: string;
  priority: string;
  startTime: string | null;
  endTime: string | null;
  dayDate: string;
};

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

// ============================================================================
// ORDERS TOOLS
// ============================================================================

/**
 * Get the total number of orders in the last N days
 */
export const getOrdersCountLastNDaysTool = tool({
  description: "Get number of orders created in the last N days (default 30)",
  inputSchema: z.object({
    days: z.number().int().min(1).max(90).default(30),
    organizationId: z.string().uuid().optional(),
    orderType: z
      .enum(["purchase_order", "purchase_receipt", "sales_order"])
      .optional()
      .describe("Optional order type filter"),
    status: z
      .enum(["pending", "scheduled", "in_transit", "delivered", "cancelled"])
      .optional()
      .describe("Optional status filter"),
  }),
  execute: async ({ days, organizationId, orderType, status }): Promise<CountResult> => {
    const since = isoDateNDaysAgo(days);
    let q = supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;
    q = q.eq("organization_id", orgId);

    if (orderType) q = q.eq("order_type", orderType);
    if (status) q = q.eq("status", status);

    const { count, error } = await q;
    if (error) throw error;
    return { count: count ?? 0 };
  },
});

/**
 * Get counts of orders grouped by order type
 */
export const getOrdersByTypeTool = tool({
  description: "Get counts of orders grouped by order type for the last N days (default 30)",
  inputSchema: z.object({
    days: z.number().int().min(1).max(90).default(30),
    organizationId: z.string().uuid().optional(),
  }),
  execute: async ({ days, organizationId }): Promise<{ breakdown: Record<string, number> }> => {
    const since = isoDateNDaysAgo(days);
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    const orderTypes = ["purchase_order", "purchase_receipt", "sales_order"] as const;
    const requests = orderTypes.map(async (type) => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .eq("order_type", type)
        .eq("organization_id", orgId);

      if (error) throw error;
      return [type, count ?? 0] as const;
    });

    const pairs = await Promise.all(requests);
    const breakdown: Record<string, number> = Object.fromEntries(pairs);
    return { breakdown };
  },
});

/**
 * Get counts of orders grouped by status
 */
export const getOrdersByStatusTool = tool({
  description: "Get counts of orders grouped by status for the last N days (default 30)",
  inputSchema: z.object({
    days: z.number().int().min(1).max(90).default(30),
    organizationId: z.string().uuid().optional(),
  }),
  execute: async ({ days, organizationId }): Promise<{ breakdown: Record<string, number> }> => {
    const since = isoDateNDaysAgo(days);
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    const statuses = ["pending", "scheduled", "in_transit", "delivered", "cancelled"] as const;
    const requests = statuses.map(async (s) => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .eq("status", s)
        .eq("organization_id", orgId);

      if (error) throw error;
      return [s, count ?? 0] as const;
    });

    const pairs = await Promise.all(requests);
    const breakdown: Record<string, number> = Object.fromEntries(pairs);
    return { breakdown };
  },
});

/**
 * Get list of pending orders with details
 */
export const getPendingOrdersTool = tool({
  description: "Get a list of pending orders with details (default limit 50)",
  inputSchema: z.object({
    organizationId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  execute: async ({ organizationId, limit }): Promise<{ orders: OrderDetail[] }> => {
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, order_type, status, recipient_name, delivery_address, site_id, scheduled_date, priority, created_at")
      .eq("organization_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const orders: OrderDetail[] = (data || []).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      orderType: o.order_type,
      status: o.status,
      recipientName: o.recipient_name,
      deliveryAddress: o.delivery_address,
      siteId: o.site_id,
      scheduledDate: o.scheduled_date,
      priority: o.priority,
      createdAt: o.created_at,
    }));

    return { orders };
  },
});

/**
 * Get recent orders with full details
 */
export const getRecentOrdersTool = tool({
  description: "Get recent orders from the last N days with full details (default 7 days, limit 50)",
  inputSchema: z.object({
    days: z.number().int().min(1).max(90).default(7),
    organizationId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(50),
    status: z
      .enum(["pending", "scheduled", "in_transit", "delivered", "cancelled"])
      .optional()
      .describe("Optional status filter"),
  }),
  execute: async ({ days, organizationId, limit, status }): Promise<{ orders: OrderDetail[] }> => {
    const since = isoDateNDaysAgo(days);
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    let q = supabase
      .from("orders")
      .select("id, order_number, order_type, status, recipient_name, delivery_address, site_id, scheduled_date, priority, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw error;

    const orders: OrderDetail[] = (data || []).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      orderType: o.order_type,
      status: o.status,
      recipientName: o.recipient_name,
      deliveryAddress: o.delivery_address,
      siteId: o.site_id,
      scheduledDate: o.scheduled_date,
      priority: o.priority,
      createdAt: o.created_at,
    }));

    return { orders };
  },
});

/**
 * Get orders for a specific site
 */
export const getOrdersForSiteTool = tool({
  description: "Get all orders for a specific site with delivery status",
  inputSchema: z.object({
    siteId: z.string().uuid().describe("The site ID to get orders for"),
    organizationId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(50),
    status: z
      .enum(["pending", "scheduled", "in_transit", "delivered", "cancelled"])
      .optional()
      .describe("Optional status filter"),
  }),
  execute: async ({ siteId, organizationId, limit, status }): Promise<{ orders: OrderDetail[] }> => {
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    let q = supabase
      .from("orders")
      .select("id, order_number, order_type, status, recipient_name, delivery_address, site_id, scheduled_date, priority, created_at")
      .eq("organization_id", orgId)
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw error;

    const orders: OrderDetail[] = (data || []).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      orderType: o.order_type,
      status: o.status,
      recipientName: o.recipient_name,
      deliveryAddress: o.delivery_address,
      siteId: o.site_id,
      scheduledDate: o.scheduled_date,
      priority: o.priority,
      createdAt: o.created_at,
    }));

    return { orders };
  },
});

// ============================================================================
// DRIVERS/STAFF TOOLS
// ============================================================================

/**
 * Get the total number of drivers/staff
 */
export const getDriversCountTool = tool({
  description: "Get total number of drivers/staff with optional filters",
  inputSchema: z.object({
    organizationId: z.string().uuid().optional(),
    role: z
      .enum(["driver", "team-leader", "customer-support", "retail-officer", "admin"])
      .optional()
      .describe("Filter by role"),
    isActive: z.boolean().optional().describe("Filter by active status"),
    isAvailable: z.boolean().optional().describe("Filter by availability"),
  }),
  execute: async ({ organizationId, role, isActive, isAvailable }): Promise<CountResult> => {
    let q = supabase.from("profiles").select("id", { count: "exact", head: true });

    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;
    q = q.eq("organization_id", orgId);

    if (role) q = q.eq("role", role);
    if (isActive !== undefined) q = q.eq("is_active", isActive);
    if (isAvailable !== undefined) q = q.eq("is_available", isAvailable);

    const { count, error } = await q;
    if (error) throw error;
    return { count: count ?? 0 };
  },
});

/**
 * Get counts of profiles grouped by role
 */
export const getProfilesByRoleTool = tool({
  description: "Get counts of profiles grouped by role (driver, team-leader, customer-support, retail-officer, admin)",
  inputSchema: z.object({
    organizationId: z.string().uuid().optional(),
    isActive: z.boolean().optional().describe("Filter by active status"),
  }),
  execute: async ({ organizationId, isActive }): Promise<{ breakdown: Record<string, number> }> => {
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    const roles = ["driver", "team-leader", "customer-support", "retail-officer", "admin"] as const;
    const requests = roles.map(async (r) => {
      let q = supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", r)
        .eq("organization_id", orgId);

      if (isActive !== undefined) q = q.eq("is_active", isActive);

      const { count, error } = await q;
      if (error) throw error;
      return [r, count ?? 0] as const;
    });

    const pairs = await Promise.all(requests);
    const breakdown: Record<string, number> = Object.fromEntries(pairs);
    return { breakdown };
  },
});

/**
 * Get count of currently available drivers
 */
export const getAvailableDriversCountTool = tool({
  description: "Get count of currently available drivers (active and available)",
  inputSchema: z.object({
    organizationId: z.string().uuid().optional(),
  }),
  execute: async ({ organizationId }): Promise<CountResult> => {
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("role", "driver")
      .eq("is_active", true)
      .eq("is_available", true);

    if (error) throw error;
    return { count: count ?? 0 };
  },
});

/**
 * Get list of available drivers with details
 */
export const getAvailableDriversTool = tool({
  description: "Get list of available drivers with details (active and available drivers only)",
  inputSchema: z.object({
    organizationId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  execute: async ({ organizationId, limit }): Promise<{ drivers: DriverDetail[] }> => {
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, is_available, is_active, vehicle_id, phone_number, driver_color")
      .eq("organization_id", orgId)
      .eq("role", "driver")
      .eq("is_active", true)
      .eq("is_available", true)
      .limit(limit);

    if (error) throw error;

    const drivers: DriverDetail[] = (data || []).map((d) => ({
      id: d.id,
      fullName: d.full_name,
      email: d.email,
      role: d.role,
      isAvailable: d.is_available,
      isActive: d.is_active,
      vehicleId: d.vehicle_id,
      phoneNumber: d.phone_number,
      driverColor: d.driver_color,
    }));

    return { drivers };
  },
});

/**
 * Get details for a specific driver
 */
export const getDriverDetailsTool = tool({
  description: "Get details for a specific driver by ID (includes vehicle assignment, availability)",
  inputSchema: z.object({
    driverId: z.string().uuid().describe("The driver ID to get details for"),
    organizationId: z.string().uuid().optional(),
  }),
  execute: async ({ driverId, organizationId }): Promise<{ driver: DriverDetail | null }> => {
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, is_available, is_active, vehicle_id, phone_number, driver_color")
      .eq("id", driverId)
      .eq("organization_id", orgId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return { driver: null }; // Not found
      throw error;
    }

    const driver: DriverDetail = {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      role: data.role,
      isAvailable: data.is_available,
      isActive: data.is_active,
      vehicleId: data.vehicle_id,
      phoneNumber: data.phone_number,
      driverColor: data.driver_color,
    };

    return { driver };
  },
});

/**
 * Get drivers grouped by their assigned vehicle type
 */
export const getDriversByVehicleTypeTool = tool({
  description: "Get list of drivers grouped by their assigned vehicle type",
  inputSchema: z.object({
    organizationId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  execute: async ({ organizationId, limit }): Promise<{ driversByVehicle: Record<string, DriverDetail[]> }> => {
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;

    // First get all drivers with their vehicle assignments
    const { data: driversData, error: driversError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, is_available, is_active, vehicle_id, phone_number, driver_color")
      .eq("organization_id", orgId)
      .eq("role", "driver")
      .not("vehicle_id", "is", null)
      .limit(limit);

    if (driversError) throw driversError;

    const drivers: DriverDetail[] = (driversData || []).map((d) => ({
      id: d.id,
      fullName: d.full_name,
      email: d.email,
      role: d.role,
      isAvailable: d.is_available,
      isActive: d.is_active,
      vehicleId: d.vehicle_id,
      phoneNumber: d.phone_number,
      driverColor: d.driver_color,
    }));

    // Get vehicle types for these drivers
    const vehicleIds = drivers.map((d) => d.vehicleId).filter(Boolean) as string[];

    if (vehicleIds.length === 0) {
      return { driversByVehicle: {} };
    }

    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, vehicle_type")
      .in("id", vehicleIds);

    if (vehiclesError) throw vehiclesError;

    // Create a map of vehicle_id -> vehicle_type
    const vehicleTypeMap = new Map<string, string>();
    (vehiclesData || []).forEach((v) => {
      vehicleTypeMap.set(v.id, v.vehicle_type || "unknown");
    });

    // Group drivers by vehicle type
    const driversByVehicle: Record<string, DriverDetail[]> = {};
    drivers.forEach((driver) => {
      if (driver.vehicleId) {
        const vehicleType = vehicleTypeMap.get(driver.vehicleId) || "unknown";
        if (!driversByVehicle[vehicleType]) {
          driversByVehicle[vehicleType] = [];
        }
        driversByVehicle[vehicleType].push(driver);
      }
    });

    return { driversByVehicle };
  },
});

/**
 * Get driver's scheduled events/deliveries for a date range
 */
export const getDriverWorkloadTool = tool({
  description: "Get driver's scheduled calendar events for a date range (default 7 days from today)",
  inputSchema: z.object({
    driverId: z.string().uuid().describe("The driver ID to get workload for"),
    organizationId: z.string().uuid().optional(),
    days: z.number().int().min(1).max(90).default(7).describe("Number of days from today to look ahead"),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  execute: async ({ driverId, organizationId, days, limit }): Promise<{ events: CalendarEventSummary[] }> => {
    const orgId = organizationId || DEFAULT_ORGANIZATION_ID;
    const today = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const endDateStr = endDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, event_type, status, priority, start_time, end_time, day_date")
      .eq("organization_id", orgId)
      .eq("assigned_driver_id", driverId)
      .gte("day_date", today)
      .lte("day_date", endDateStr)
      .order("day_date", { ascending: true })
      .order("sequence_number", { ascending: true })
      .limit(limit);

    if (error) throw error;

    const events: CalendarEventSummary[] = (data || []).map((e) => ({
      id: e.id,
      title: e.title,
      eventType: e.event_type,
      status: e.status,
      priority: e.priority,
      startTime: e.start_time,
      endTime: e.end_time,
      dayDate: e.day_date,
    }));

    return { events };
  },
});

export type LogisticsTools = {
  // Site tools
  getSitesCountTool: typeof getSitesCountTool;
  getSitesByRegionCountsTool: typeof getSitesByRegionCountsTool;

  // Delivery tools
  getDeliveriesCountLastNDaysTool: typeof getDeliveriesCountLastNDaysTool;
  getDeliveriesCountByStatusTool: typeof getDeliveriesCountByStatusTool;

  // Collection tools
  getCollectionsCountLastNDaysTool: typeof getCollectionsCountLastNDaysTool;

  // Order tools
  getOrdersCountLastNDaysTool: typeof getOrdersCountLastNDaysTool;
  getOrdersByTypeTool: typeof getOrdersByTypeTool;
  getOrdersByStatusTool: typeof getOrdersByStatusTool;
  getPendingOrdersTool: typeof getPendingOrdersTool;
  getRecentOrdersTool: typeof getRecentOrdersTool;
  getOrdersForSiteTool: typeof getOrdersForSiteTool;

  // Driver/Staff tools
  getDriversCountTool: typeof getDriversCountTool;
  getProfilesByRoleTool: typeof getProfilesByRoleTool;
  getAvailableDriversCountTool: typeof getAvailableDriversCountTool;
  getAvailableDriversTool: typeof getAvailableDriversTool;
  getDriverDetailsTool: typeof getDriverDetailsTool;
  getDriversByVehicleTypeTool: typeof getDriversByVehicleTypeTool;
  getDriverWorkloadTool: typeof getDriverWorkloadTool;
};


