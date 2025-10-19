import { AnthropicProviderOptions, anthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import "dotenv/config"

const anthropicApiKey = process.env.ANTHROPIC_API_KEY
if (!anthropicApiKey) {
  throw new Error("ANTHROPIC_API_KEY is not set")
}

const result = await generateText({
  model: anthropic("claude-sonnet-4-5"),
  tools: {
    code_execution: anthropic.tools.codeExecution_20250825(),
  },
  prompt: "Create a presentation about renewable energy with 5 slides",
  providerOptions: {
    anthropic: {
      container: {
        skills: [
          {
            type: "anthropic",
            skillId: "pptx",
            version: "latest", // optional
          },
        ],
      },
    } satisfies AnthropicProviderOptions,
  },
})

console.log(result)
