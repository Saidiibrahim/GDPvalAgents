import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';

// Set the maximum duration for this function
export const maxDuration = 60; // 60 seconds

export async function POST(request: Request) {
  const { prompt }: { prompt?: string } = await request.json();

  if (!prompt) {
    return new Response('Prompt is required', { status: 400 });
  }

  const result = await generateText({
    model: 'openai/gpt-5',
    prompt,
    stopWhen: stepCountIs(5),
    tools: {
      weather: tool({
        description: 'Get the weather in a location',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
      }),
      activities: tool({
        description: 'Get the activities in a location',
        inputSchema: z.object({
          location: z
            .string()
            .describe('The location to get the activities for'),
        }),
        execute: async ({ location }) => ({
          location,
          activities: ['hiking', 'swimming', 'sightseeing'],
        }),
      }),
    },
  });

  return Response.json({
    steps: result.steps,
    finalAnswer: result.text,
  });
}