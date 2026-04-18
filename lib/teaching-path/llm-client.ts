/**
 * Chat completion: OpenAI-compatible gateways or Google Gemini (generateContent).
 */

import { getLlmProvider } from "@/lib/llm/config";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function getApiKey(): string {
  const key =
    process.env.LLM_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("LLM_API_KEY or GEMINI_API_KEY must be set");
  }
  return key;
}

function getModel(): string {
  const model = process.env.LLM_MODEL?.trim();
  if (!model) {
    throw new Error("LLM_MODEL must be set");
  }
  return model;
}

type GeminiContent = {
  role: "user" | "model";
  parts: { text: string }[];
};

async function geminiGenerateContent(params: {
  messages: ChatMessage[];
  useJsonMime: boolean;
  timeoutMs: number;
}): Promise<string> {
  const key = getApiKey();
  const model = getModel();
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const m of params.messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }
    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
      continue;
    }
    contents.push({ role: "model", parts: [{ text: m.content }] });
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_ONLY_HIGH",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH",
      },
    ],
  };

  if (systemParts.length > 0) {
    body.systemInstruction = {
      parts: [{ text: systemParts.join("\n\n") }],
    };
  }

  if (params.useJsonMime) {
    (body.generationConfig as Record<string, unknown>).responseMimeType =
      "application/json";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      error?: { message?: string };
    };

    if (data.error?.message) {
      throw new Error(`Gemini API: ${data.error.message.slice(0, 200)}`);
    }

    const parts = data.candidates?.[0]?.content?.parts;
    const text =
      parts?.map((p) => p.text ?? "").join("")?.trim() ?? "";

    if (!text) {
      const reason = data.candidates?.[0]?.finishReason ?? "unknown";
      throw new Error(`Empty Gemini response (finish: ${reason})`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function openAiCompatibleCompletion(params: {
  messages: ChatMessage[];
  useJsonResponseFormat: boolean;
  timeoutMs: number;
}): Promise<string> {
  const base = process.env.LLM_BASE_URL?.replace(/\/$/, "");
  const key = getApiKey();
  const model = getModel();

  if (!base) {
    throw new Error("LLM_BASE_URL must be set for OpenAI-compatible provider");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);

  const body: Record<string, unknown> = {
    model,
    messages: params.messages,
    temperature: 0.3,
    max_tokens: 8192,
  };

  if (params.useJsonResponseFormat) {
    body.response_format = { type: "json_object" };
  }

  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Empty LLM response content");
    }
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

export async function chatCompletionContent(params: {
  messages: ChatMessage[];
}): Promise<string> {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 60_000;
  const useJsonResponseFormat =
    process.env.LLM_USE_JSON_RESPONSE_FORMAT !== "false";

  if (getLlmProvider() === "gemini") {
    return geminiGenerateContent({
      messages: params.messages,
      useJsonMime: useJsonResponseFormat,
      timeoutMs,
    });
  }

  return openAiCompatibleCompletion({
    messages: params.messages,
    useJsonResponseFormat,
    timeoutMs,
  });
}
