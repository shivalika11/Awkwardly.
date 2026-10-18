import type { Guide } from "./data";

export type Tone = "funny" | "professional" | "direct";
export type Length = "short" | "medium" | "long";
export type Message = {
  id: string;
  text: string;
  scenario: string;
  mode: Tone;
  directness: number;
  score: number;
  explanation: string;
  savedAt: string | null;
  createdAt: string;
  provider?: "local" | "ai";
};
export type Preferences = { mode: Tone; length: Length; directness: number };
export type GenerateInput = Preferences & {
  scenario: string;
  recipient: string;
  channel: "text" | "email" | "in_person" | "work_chat";
  context: string;
};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch {
    throw new Error("Can't reach Awkwardly right now. Check that the app server is running.");
  }
  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const payload = await response.json() as { error?: string };
      if (payload.error) message = payload.error;
    } catch { /* The server may return an empty error response. */ }
    throw new Error(message);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const api = {
  bootstrap: () => call<{
    messages: Message[];
    savedMessages: Message[];
    preferences: Preferences;
    bookmarks: string[];
    aiEnabled: boolean;
  }>("/api/bootstrap"),
  generate: (input: GenerateInput) => call<Message>("/api/generate", { method: "POST", body: JSON.stringify(input) }),
  updateMessage: (id: string, text: string) => call<Message>(`/api/messages/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify({ text }),
  }),
  saveMessage: (id: string, saved: boolean) => call<{ saved: boolean }>(`/api/messages/${encodeURIComponent(id)}/save`, {
    method: "PATCH", body: JSON.stringify({ saved }),
  }),
  deleteMessage: (id: string) => call<void>(`/api/messages/${encodeURIComponent(id)}`, { method: "DELETE" }),
  savePreferences: (preferences: Preferences) => call<Preferences>("/api/preferences", {
    method: "PUT", body: JSON.stringify(preferences),
  }),
  getGuides: (query: string) => call<(Guide & { bookmarked: boolean })[]>(`/api/guides?q=${encodeURIComponent(query)}`),
  bookmarkGuide: (id: string, bookmarked: boolean) => call<{ bookmarked: boolean }>(
    `/api/guides/${encodeURIComponent(id)}/bookmark`,
    { method: "PUT", body: JSON.stringify({ bookmarked }) },
  ),
};
