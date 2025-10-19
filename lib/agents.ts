import { openai } from "@ai-sdk/openai";
import { Experimental_Agent as Agent, stepCountIs, tool } from "ai";
import { z } from "zod";
import {
  getCollectionsCountLastNDaysTool,
  getDeliveriesCountByStatusTool,
  getDeliveriesCountLastNDaysTool,
  getOrdersByStatusTool,
  getOrdersByTypeTool,
  getOrdersForSiteTool,
  getPendingOrdersTool,
  getRecentOrdersTool,
  getSitesByRegionCountsTool,
  getSitesCountTool,
} from "../tools/logistics";

const weatherAgent = new Agent({
  model: openai("gpt-4o"),
  tools: {
    weather: tool({
      description: "Get the weather in a location (in Fahrenheit)",
      inputSchema: z.object({
        location: z.string().describe("The location to get the weather for"),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
    convertFahrenheitToCelsius: tool({
      description: "Convert temperature from Fahrenheit to Celsius",
      inputSchema: z.object({
        temperature: z.number().describe("Temperature in Fahrenheit"),
      }),
      execute: async ({ temperature }) => {
        const celsius = Math.round((temperature - 32) * (5 / 9));
        return { celsius };
      },
    }),
    // Logistics-v0 tools
    getSitesCount: getSitesCountTool,
    getDeliveriesCountLastNDays: getDeliveriesCountLastNDaysTool,
    getCollectionsCountLastNDays: getCollectionsCountLastNDaysTool,
    getDeliveriesCountByStatus: getDeliveriesCountByStatusTool,
    getSitesByRegionCounts: getSitesByRegionCountsTool,
  },
  stopWhen: stepCountIs(20),
});

const logisticsAgent = new Agent({
  model: openai("gpt-4o"),
  tools: {
    getSitesCount: getSitesCountTool,
    getDeliveriesCountLastNDays: getDeliveriesCountLastNDaysTool,
    getCollectionsCountLastNDays: getCollectionsCountLastNDaysTool,
    getDeliveriesCountByStatus: getDeliveriesCountByStatusTool,
    getSitesByRegionCounts: getSitesByRegionCountsTool,
  },
  stopWhen: stepCountIs(20),
});

const customerName = "Ibrahim";

const customerSupportAgent = new Agent({
  model: openai("gpt-4o"),
  system: `You are a customer support agent. You are responsible for helping customers with their orders.
  The customer's name is ${customerName}.
  Always start by greeting the customer by name.
    `,
  tools: {
    getRecentOrders: getRecentOrdersTool,
    getPendingOrders: getPendingOrdersTool,
    getOrdersByStatus: getOrdersByStatusTool,
    getOrdersByType: getOrdersByTypeTool,
    getOrdersForSite: getOrdersForSiteTool,
  },
  stopWhen: stepCountIs(20),
});

export { customerSupportAgent, logisticsAgent, weatherAgent };
