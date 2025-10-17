import { Experimental_Agent as Agent, stepCountIs, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { weatherAgent, logisticsAgent } from './lib/agents';
import "dotenv/config";

async function main() {
console.log("Starting logistics agent...");
try {
  const logisticsResult = await logisticsAgent.generate({
    prompt: "How many sites are there?",
  });
  console.log("Agent completed successfully");
  console.log(logisticsResult.text);
  // console.log(logisticsResult.steps);
} catch (error) {
  console.error("Error starting logistics agent:", error);
}
}

main();