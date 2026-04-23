// src/test/setup.ts
// Global test setup for Vitest + React Testing Library

import '@testing-library/jest-dom/vitest';

// Mock environment variables for tests
process.env.QWEN_API_KEY = 'test-qwen-key';
process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
process.env.LLM_API_KEY = 'test-llm-api-key';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
