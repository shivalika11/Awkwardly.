import { z } from "zod";

export const generationSchema = z.object({
  scenario: z.string().trim().min(2).max(120),
  recipient: z.string().trim().max(100).default("someone"),
  channel: z.enum(["text", "email", "in_person", "work_chat"]).default("text"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  directness: z.number().int().min(0).max(100).default(55),
  mode: z.enum(["funny", "professional", "direct"]).default("funny"),
  context: z.string().trim().max(500).default(""),
});

export type GenerationInput = z.infer<typeof generationSchema>;
export type Generated = { text: string; score: number; explanation: string; provider: "local" | "ai" };

const openers: Record<GenerationInput["mode"], string[]> = {
  funny: [
    "A small plot twist",
    "A tiny change of plans",
    "A mildly inconvenient update",
  ],
  professional: [
    "I wanted to let you know",
    "Thank you for understanding",
    "I need to make a change",
  ],
  direct: [
    "I want to be straightforward",
    "I need to be honest with you",
    "To be clear",
  ],
};

function pick<T>(items: T[], seed: number): T {
  return items[((seed % items.length) + items.length) % items.length]!;
}

function hash(value: string): number {
  return [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) | 0, 7);
}

function finish(input: GenerationInput, variant: number): string {
  const seed = hash(`${input.scenario}${input.mode}`);
  const opener = pick(openers[input.mode], seed + variant);
  const context = input.context ? ` ${input.context.replace(/[.!?]+$/, "")}.` : "";
  const channelClosing = input.channel === "email" || input.channel === "work_chat"
    ? input.mode === "professional" ? " Thanks for your understanding." : " Thanks for understanding."
    : "";
  const normalizedScenario = input.scenario.toLowerCase();
  const scenarioType = /deadline|missed|delay/.test(normalizedScenario) ? "deadline"
    : /feedback|review|draft/.test(normalizedScenario) ? "feedback"
      : /help/.test(normalizedScenario) ? "help"
        : /reply|silence/.test(normalizedScenario) ? "reply"
          : /no|request|favor|boundary/.test(normalizedScenario) ? "boundary"
            : "plans";
  const coreByScenario = {
    deadline: "I missed the agreed deadline",
    feedback: "I have some honest feedback to share",
    help: "I could use some help",
    reply: "I'm sorry I went quiet",
    boundary: "I can't take that on",
    plans: "I can't make it this time",
  };
  const core = coreByScenario[scenarioType];
  const closingByScenario = {
    deadline: "I appreciate your patience. I'll keep you updated.",
    feedback: "I hope that gives you a useful place to start.",
    help: "Would you be able to help me think it through?",
    reply: "I'd still love to catch up if you're open to it.",
    boundary: "Thanks for understanding.",
    plans: "I hope it goes wonderfully. Rain check soon?",
  };
  const greeting = input.recipient && input.recipient !== "someone"
    ? input.channel === "email" ? `Hi ${input.recipient}, ` : `Hey ${input.recipient} — `
    : "";
  const sentences = input.mode === "funny"
    ? [`${greeting}${opener}: ${core}.`, context.trim(), closingByScenario[scenarioType]]
    : input.mode === "professional"
      ? [`${greeting}${opener}: ${core}.`, context.trim(), "I appreciate your understanding."]
      : [`${greeting}${opener}: ${core}.`, context.trim(), closingByScenario[scenarioType]];

  if (input.directness < 30) {
    sentences.push("I know this is a change, and I appreciate your understanding.");
  } else if (input.directness > 75) {
    sentences.push(input.mode === "professional" ? "I wanted to let you know as soon as I could." : "I wanted to be clear with you now.");
  }
  const filtered = sentences.filter(Boolean);
  if (input.length === "short") return filtered.slice(0, 2).join(" ");
  if (input.length === "long") {
    const longerClose = input.mode === "funny"
      ? "I wanted to give you a heads-up rather than leave you guessing."
      : input.mode === "professional"
        ? "Thank you for your flexibility."
        : "I wanted to tell you directly rather than leave you waiting.";
    return `${filtered.join(" ")}${channelClosing} ${longerClose}`;
  }
  return `${filtered.join(" ")}${channelClosing}`;
}

export function scoreMessage(input: GenerationInput, text: string): { score: number; explanation: string } {
  let score = 35;
  const reasons: string[] = [];
  const words = text.trim().split(/\s+/).length;
  if (text.length > 20 && /[.!?]/.test(text)) {
    score -= 7;
    reasons.push("A complete response lowers the wording signal.");
  }
  if (/\b(can't|cannot|won't|unable|need to)\b/i.test(text)) {
    score -= 8;
    reasons.push("A clear boundary lowers the wording signal.");
  }
  if (/\b(sorry|apologize|understand|thanks|thank you)\b/i.test(text)) {
    score -= 4;
    reasons.push("A brief acknowledgment lowers the wording signal.");
  }
  if (/\b(maybe|probably|try to|might be able)\b/i.test(text)) {
    score += 10;
    reasons.push("Hedging may leave expectations unclear.");
  }
  if (words > 95) {
    score += 8;
    reasons.push("A shorter explanation may feel more confident.");
  }
  if (input.directness < 25 && input.mode === "direct") {
    score += 6;
    reasons.push("The chosen tone and directness pull in different directions.");
  }
  const bounded = Math.max(0, Math.min(100, score));
  return {
    score: bounded,
    explanation: reasons.length ? reasons.slice(0, 3).join(" ") : "No strong wording signals stood out. This is a heuristic, not a prediction of anyone's reaction.",
  };
}

export function generateLocal(input: GenerationInput, variant = 0): Generated {
  const text = finish(input, variant);
  const { score, explanation } = scoreMessage(input, text);
  return { text, score, explanation, provider: "local" };
}

export async function generateWithProvider(input: GenerationInput, variant = 0): Promise<Generated> {
  if (!process.env.AI_API_KEY) return generateLocal(input, variant);
  const baseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
  const endpoint = new URL("chat/completions", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        temperature: Math.min(1, 0.55 + variant * 0.1),
        messages: [
          { role: "system", content: "Write one concise, respectful message for a real awkward social situation. Do not invent facts or claim a reason the user did not provide. Avoid manipulation and excessive apologies. Follow the requested tone and length. Return only the message." },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const payload: unknown = await response.json();
    const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("AI provider returned an empty message");
    const text = content.trim().slice(0, 1400);
    const { score, explanation } = scoreMessage(input, text);
    return { text, score, explanation, provider: "ai" };
  } finally {
    clearTimeout(timeout);
  }
}
