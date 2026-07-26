import type { ActionOutput, ProviderAction } from "./contract.ts";

export type ProviderRequest = {
  action: ProviderAction;
  prompt: string;
  timeoutMs: number;
};

export type ProviderDescriptor = {
  name: string;
  model: string;
};

export interface AiProvider {
  readonly descriptor: ProviderDescriptor;
  complete(request: ProviderRequest): Promise<unknown>;
}

export class ProviderError extends Error {
  constructor(
    public readonly code: "AI_TIMEOUT" | "AI_PROVIDER_ERROR",
    message: string,
    public readonly retryable = true,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

function textFrom(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function jsonObjectFromPrompt(prompt: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(prompt);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export class MockProvider implements AiProvider {
  readonly descriptor: ProviderDescriptor = { name: "mock", model: "mock-v1" };

  async complete(request: ProviderRequest): Promise<ActionOutput> {
    const context = jsonObjectFromPrompt(request.prompt);
    const input = (context.input ?? {}) as Record<string, unknown>;
    const requirement = textFrom(input.requirement ?? input.description, "Feature requirement");

    switch (request.action) {
      case "generate_test_cases":
        return {
          testCases: [{
            title: `Verify ${requirement.slice(0, 180)}`,
            objective: `Memastikan requirement terpenuhi: ${requirement.slice(0, 500)}`,
            preconditions: "Environment pengujian siap dan user memiliki akses yang diperlukan.",
            steps: "1. Siapkan data sesuai requirement.\n2. Jalankan alur utama fitur.\n3. Amati hasil aktual.",
            expectedResult: "Fitur menghasilkan perilaku yang sesuai requirement tanpa error.",
            priority: "medium",
            tags: ["ai-generated", "draft"],
            notes: "Draft dari mock provider; wajib direview sebelum disimpan.",
          }],
          scenarios: ["Alur utama dengan input valid."],
          edgeCases: ["Input kosong atau batas maksimum field."],
          provider: "mock", model: "mock-v1", promptVersion: "ai-gateway-v1",
        };
      case "test_run_analysis":
        return {
          summary: "Analisis mock tersedia sebagai draft dan belum menggantikan review QA.",
          counts: { pass: 0, fail: 0, skip: 0, blocked: 0, notRun: 0 },
          failurePatterns: [],
          regressionRisks: ["Validasi manual diperlukan karena provider mock tidak melakukan inferensi."],
          retestRecommendations: [],
        };
      case "issue_draft":
        return {
          title: "Draft issue dari Test Result FAIL",
          description: "Kegagalan perlu ditinjau dan dilengkapi oleh tester sebelum issue dibuat.",
          actualResult: textFrom(input.actualResult, "Hasil aktual belum diberikan."),
          expectedResult: textFrom(input.expectedResult, "Hasil yang diharapkan belum diberikan."),
          priority: "medium",
          severity: "medium",
          reproductionSteps: "1. Review Test Result FAIL.\n2. Lengkapi langkah reproduksi yang dapat diverifikasi.",
        };
      case "duplicate_issue_detection":
        return { candidates: [] };
      case "assistant_search":
        return { answer: "Mock provider hanya mengembalikan hasil terstruktur dari data yang diizinkan.", matches: [] };
    }
  }
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let body: unknown = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text.slice(0, 1_000) };
    }
    if (!response.ok) {
      throw new ProviderError(
        response.status === 408 || response.status === 429 || response.status >= 500
          ? "AI_PROVIDER_ERROR"
          : "AI_PROVIDER_ERROR",
        `Provider returned HTTP ${response.status}`,
        response.status === 408 || response.status === 429 || response.status >= 500,
      );
    }
    return body;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ProviderError("AI_TIMEOUT", "Provider request timed out");
    }
    throw new ProviderError("AI_PROVIDER_ERROR", "Provider request failed");
  } finally {
    clearTimeout(timeout);
  }
}

export class OpenAiProvider implements AiProvider {
  readonly descriptor: ProviderDescriptor;

  constructor(private readonly apiKey: string, model: string) {
    this.descriptor = { name: "openai", model };
  }

  async complete(request: ProviderRequest): Promise<unknown> {
    const body = await fetchJson(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.descriptor.model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Return only valid JSON matching the requested contract." },
            { role: "user", content: request.prompt },
          ],
        }),
      },
      request.timeoutMs,
    ) as { choices?: Array<{ message?: { content?: unknown } }> };
    return body.choices?.[0]?.message?.content ?? null;
  }
}

export class GeminiProvider implements AiProvider {
  readonly descriptor: ProviderDescriptor;

  constructor(private readonly apiKey: string, model: string) {
    this.descriptor = { name: "gemini", model };
  }

  async complete(request: ProviderRequest): Promise<unknown> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.descriptor.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const body = await fetchJson(
      url,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: request.prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
      },
      request.timeoutMs,
    ) as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> };
    return body.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("") ?? null;
  }
}

export function createProvider(env: Record<string, string | undefined>): AiProvider {
  const provider = (env.AI_PROVIDER ?? "mock").toLowerCase();
  const model = env.AI_MODEL ?? (provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini");

  if (provider === "openai" && env.OPENAI_API_KEY) return new OpenAiProvider(env.OPENAI_API_KEY, model);
  if (provider === "gemini" && env.GEMINI_API_KEY) return new GeminiProvider(env.GEMINI_API_KEY, model);
  return new MockProvider();
}
