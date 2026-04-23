// src/lib/ai-provider.ts
// Unified AI provider service with QWEN as primary and DeepSeek as fallback
// Supports both chat (fast) and reasoning (thinking) modes
// Includes streaming and multimodal (vision) support
//
// Priority: QWEN → DeepSeek → error
// Web search: Perplexity (separate mode)

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { createLogger } from '@/lib/logger';

const log = createLogger('ai-provider');

// ============================================
// CONFIGURATION
// ============================================

export type AIMode = 'chat' | 'reasoning' | 'web_search';
export type AIProvider = 'qwen' | 'deepseek' | 'perplexity';

// ============================================
// MODEL PRICING (per 1M tokens in USD)
// ============================================

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  perRequestFee?: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // QWEN Models (Alibaba Cloud / DashScope)
  'qwen-turbo-latest': { inputPerMillion: 0.10, outputPerMillion: 0.30 },
  'qwen-plus':         { inputPerMillion: 0.50, outputPerMillion: 1.50 },
  'qwen-vl-plus':      { inputPerMillion: 0.21, outputPerMillion: 0.63 },

  // DeepSeek Models (cache miss pricing — conservative)
  'deepseek-chat':     { inputPerMillion: 0.28, outputPerMillion: 0.42 },
  'deepseek-reasoner': { inputPerMillion: 0.28, outputPerMillion: 0.42 },

  // Perplexity Models (web search capable)
  'sonar':     { inputPerMillion: 1.00, outputPerMillion: 1.00, perRequestFee: 0.005 },
  'sonar-pro': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
};

interface ProviderConfig {
  apiKey: string | undefined;
  baseURL: string;
  chatModel: string;
  reasoningModel: string;
  visionModel?: string;
  maxTokens: number;
}

const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  qwen: {
    apiKey: process.env.QWEN_API_KEY,
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    chatModel: 'qwen-turbo-latest',
    reasoningModel: 'qwen-plus',
    visionModel: 'qwen-vl-plus',
    maxTokens: 8192,
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
    chatModel: 'deepseek-chat',
    reasoningModel: 'deepseek-reasoner',
    maxTokens: 8192,
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai',
    chatModel: 'sonar',
    reasoningModel: 'sonar-pro',
    maxTokens: 8192,
  },
};

// ============================================
// CLIENT MANAGEMENT
// ============================================

const clients: Map<AIProvider, OpenAI> = new Map();

function getClient(provider: AIProvider): OpenAI | null {
  if (clients.has(provider)) return clients.get(provider)!;

  const config = PROVIDER_CONFIGS[provider];
  if (!config.apiKey) return null;

  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  clients.set(provider, client);
  return client;
}

/**
 * Get the best available provider (QWEN primary, DeepSeek fallback)
 */
export function getAvailableProvider(): AIProvider | null {
  if (process.env.QWEN_API_KEY) return 'qwen';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  return null;
}

/**
 * Check if AI features are globally restricted
 */
export function isAIRestricted(): boolean {
  return process.env.AI_RESTRICTION === 'ON';
}

/**
 * Check if Perplexity web search is available
 */
export function isWebSearchAvailable(): boolean {
  return !!process.env.PERPLEXITY_API_KEY;
}

/**
 * Get model name for a provider + mode combination
 */
export function getModelName(provider: AIProvider, mode: AIMode): string {
  const config = PROVIDER_CONFIGS[provider];
  if (mode === 'reasoning') return config.reasoningModel;
  if (mode === 'web_search') return PROVIDER_CONFIGS.perplexity.chatModel;
  return config.chatModel;
}

/**
 * Check availability of all providers
 */
export function checkProviderAvailability(): {
  qwen: boolean;
  deepseek: boolean;
  perplexity: boolean;
  primary: AIProvider | null;
} {
  return {
    qwen: !!process.env.QWEN_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    primary: getAvailableProvider(),
  };
}

// ============================================
// INTERFACES
// ============================================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  mode?: AIMode;
  provider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
}

export interface AICompletionResult {
  content: string;
  provider: AIProvider;
  model: string;
  citations?: string[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIStreamChunk {
  content?: string;
  error?: string;
  done?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// NON-STREAMING COMPLETION
// ============================================

/**
 * Get AI completion (non-streaming).
 * Use for JSON generation, analysis, structured output.
 */
export async function getAICompletion(
  messages: AIMessage[],
  options: AICompletionOptions = {}
): Promise<AICompletionResult> {
  const { mode = 'chat', provider: preferredProvider, temperature = 0.7, maxTokens } = options;

  if (isAIRestricted()) {
    throw new Error('AI features are currently restricted');
  }

  // web_search routes to Perplexity
  if (mode === 'web_search') {
    return getWebSearchCompletion(messages, { temperature, maxTokens });
  }

  const provider = preferredProvider || getAvailableProvider();
  if (!provider) {
    throw new Error('No AI provider configured. Set QWEN_API_KEY or DEEPSEEK_API_KEY in .env.local');
  }

  const client = getClient(provider);
  if (!client) throw new Error(`Failed to initialize ${provider} client`);

  const config = PROVIDER_CONFIGS[provider];
  const model = getModelName(provider, mode);

  const openAIMessages: ChatCompletionMessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const completion = await client.chat.completions.create({
    model,
    messages: openAIMessages,
    temperature,
    max_tokens: maxTokens || config.maxTokens,
    stream: false,
  });

  return {
    content: completion.choices[0]?.message?.content || '',
    provider,
    model,
    usage: completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        }
      : undefined,
  };
}

// ============================================
// WEB SEARCH (Perplexity)
// ============================================

async function getWebSearchCompletion(
  messages: AIMessage[],
  options: { temperature?: number; maxTokens?: number; useProModel?: boolean } = {}
): Promise<AICompletionResult> {
  const { temperature = 0.7, maxTokens, useProModel = false } = options;

  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error('Web search requires PERPLEXITY_API_KEY');
  }

  const client = getClient('perplexity');
  if (!client) throw new Error('Failed to initialize Perplexity client');

  const model = useProModel
    ? PROVIDER_CONFIGS.perplexity.reasoningModel
    : PROVIDER_CONFIGS.perplexity.chatModel;

  const openAIMessages: ChatCompletionMessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const completion = await client.chat.completions.create({
    model,
    messages: openAIMessages,
    temperature,
    max_tokens: maxTokens || PROVIDER_CONFIGS.perplexity.maxTokens,
    stream: false,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const citations = (completion as any).citations as string[] | undefined;

  return {
    content: completion.choices[0]?.message?.content || '',
    provider: 'perplexity',
    model,
    citations: citations || [],
    usage: completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        }
      : undefined,
  };
}

// ============================================
// STREAMING COMPLETION
// ============================================

/**
 * Get AI completion as a ReadableStream (SSE format).
 * Use for chat interfaces, long-form content generation.
 */
export async function getAICompletionStream(
  messages: AIMessage[],
  options: AICompletionOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const { mode = 'chat', provider: preferredProvider, temperature = 0.7, maxTokens } = options;

  if (isAIRestricted()) throw new Error('AI features are currently restricted');

  const provider = preferredProvider || getAvailableProvider();
  if (!provider) throw new Error('No AI provider configured. Set QWEN_API_KEY or DEEPSEEK_API_KEY in .env.local');

  const client = getClient(provider);
  if (!client) throw new Error(`Failed to initialize ${provider} client`);

  const config = PROVIDER_CONFIGS[provider];
  const model = getModelName(provider, mode);

  const openAIMessages: ChatCompletionMessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: openAIMessages,
        temperature,
        max_tokens: maxTokens || config.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      });

      for await (const chunk of completion) {
        if (chunk.choices?.length > 0) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
          if (chunk.choices[0]?.finish_reason === 'stop') {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          }
        }
        if (chunk.usage) {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                usage: {
                  promptTokens: chunk.usage.prompt_tokens,
                  completionTokens: chunk.usage.completion_tokens,
                  totalTokens: chunk.usage.total_tokens,
                },
              })}\n\n`
            )
          );
        }
      }
    } catch (error) {
      log.error('AI streaming error', { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return stream.readable;
}

// ============================================
// VISION (MULTIMODAL) COMPLETION
// ============================================

export interface VisionMessage {
  role: 'user' | 'assistant';
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;
}

/**
 * Get vision (image+text) completion. QWEN only.
 */
export async function getVisionCompletion(
  messages: VisionMessage[],
  options: Omit<AICompletionOptions, 'mode'> = {}
): Promise<AICompletionResult> {
  const { temperature = 0.7, maxTokens } = options;

  if (isAIRestricted()) throw new Error('AI features are currently restricted');
  if (!process.env.QWEN_API_KEY) throw new Error('Vision requires QWEN_API_KEY');

  const client = getClient('qwen');
  if (!client) throw new Error('Failed to initialize QWEN client');

  const config = PROVIDER_CONFIGS.qwen;
  const model = config.visionModel || 'qwen-vl-plus';

  const completion = await client.chat.completions.create({
    model,
    messages: messages as ChatCompletionMessageParam[],
    temperature,
    max_tokens: maxTokens || config.maxTokens,
    stream: false,
  });

  return {
    content: completion.choices[0]?.message?.content || '',
    provider: 'qwen',
    model,
    usage: completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Get vision completion as a stream. QWEN only.
 */
export async function getVisionCompletionStream(
  messages: VisionMessage[],
  options: Omit<AICompletionOptions, 'mode'> = {}
): Promise<ReadableStream<Uint8Array>> {
  const { temperature = 0.7, maxTokens } = options;

  if (isAIRestricted()) throw new Error('AI features are currently restricted');
  if (!process.env.QWEN_API_KEY) throw new Error('Vision requires QWEN_API_KEY');

  const client = getClient('qwen');
  if (!client) throw new Error('Failed to initialize QWEN client');

  const config = PROVIDER_CONFIGS.qwen;
  const model = config.visionModel || 'qwen-vl-plus';

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: messages as ChatCompletionMessageParam[],
        temperature,
        max_tokens: maxTokens || config.maxTokens,
        stream: true,
      });

      for await (const chunk of completion) {
        if (chunk.choices?.[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          await writer.write(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
        }
      }
      await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return stream.readable;
}

// ============================================
// COST CALCULATION
// ============================================

export interface UsageWithCost {
  inputTokens: number;
  outputTokens: number;
  tokensUsed: number;
  costUSD: number;
}

/**
 * Calculate USD cost from model name and token counts.
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    log.warn('No pricing found for model, using default', { model });
    return (inputTokens * 0.10 + outputTokens * 0.30) / 1_000_000;
  }
  const tokenCost = (inputTokens * pricing.inputPerMillion + outputTokens * pricing.outputPerMillion) / 1_000_000;
  return tokenCost + (pricing.perRequestFee || 0);
}

/**
 * Extract usage + cost from an AICompletionResult.
 */
export function extractUsageWithCost(result: AICompletionResult): UsageWithCost {
  const inputTokens = result.usage?.promptTokens || 0;
  const outputTokens = result.usage?.completionTokens || 0;
  return {
    inputTokens,
    outputTokens,
    tokensUsed: inputTokens + outputTokens,
    costUSD: calculateCost(result.model, inputTokens, outputTokens),
  };
}

/**
 * Calculate usage + cost from raw token counts.
 */
export function calculateUsageWithCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): UsageWithCost {
  return {
    inputTokens,
    outputTokens,
    tokensUsed: inputTokens + outputTokens,
    costUSD: calculateCost(model, inputTokens, outputTokens),
  };
}

/**
 * Get pricing info for a model.
 */
export function getModelPricing(model: string): ModelPricing | null {
  return MODEL_PRICING[model] || null;
}
