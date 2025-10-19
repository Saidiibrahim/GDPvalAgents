import "dotenv/config";
import { customerSupportAgent } from "./lib/agents";

async function main() {
  console.log("Starting customer support agent...");
  try {
    const customerSupportResult = await customerSupportAgent.generate({
      prompt:
        "I need a full update on our orders. What's pending, what's in transit, and are there any priority items I should know about?",
    });
    console.log("Agent completed successfully");
    console.log(customerSupportResult.text);
    // console.log(logisticsResult.steps);
  } catch (error) {
    console.error("Error starting customer support agent:", error);
  }
}

main();
