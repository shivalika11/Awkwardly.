import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { generateWithProvider, generationSchema, scoreMessage } from "./generator.js";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 3001);
const production = process.env.NODE_ENV === "production";
const cookieName = "awkwardly_session";
const secret = process.env.SESSION_SECRET;

if (production && (!secret || secret.length < 32)) {
  throw new Error("SESSION_SECRET must contain at least 32 characters in production.");
}
const signingSecret = secret ?? "local-development-session-secret-change-me";

app.disable("x-powered-by");
app.use(express.json({ limit: "12kb" }));
app.use(cookieParser());
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

function sign(value: string): string {
  return crypto.createHmac("sha256", signingSecret).update(value).digest("hex");
}

function readSession(value?: string): string | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const id = value.slice(0, separator);
  const supplied = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(sign(id));
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected) ? id : null;
}

declare global {
  namespace Express {
    interface Request { userId?: string }
  }
}

const session: express.RequestHandler = async (req, res, next) => {
  try {
    const candidate = readSession(req.cookies[cookieName]);
    let user = candidate ? await prisma.user.findUnique({ where: { id: candidate }, select: { id: true } }) : null;
    if (!user) {
      user = await prisma.user.create({ data: {}, select: { id: true } });
      res.cookie(cookieName, `${user.id}.${sign(user.id)}`, {
        httpOnly: true,
        sameSite: "strict",
        secure: production,
        maxAge: 1000 * 60 * 60 * 24 * 180,
        path: "/",
      });
    }
    req.userId = user.id;
    next();
  } catch (error) {
    next(error);
  }
};

app.use("/api", session);

const requestTimes = new Map<string, number[]>();
let rateLimitChecks = 0;
function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.userId ?? req.ip ?? "unknown";
  const now = Date.now();
  const recent = (requestTimes.get(key) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 12) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "A little breather, please. Try again in a minute." });
    return;
  }
  recent.push(now);
  requestTimes.set(key, recent);
  rateLimitChecks += 1;
  if (rateLimitChecks % 500 === 0) {
    for (const [sessionId, times] of requestTimes) {
      if (!times.some((time) => now - time < 60_000)) requestTimes.delete(sessionId);
    }
  }
  next();
}

function userId(req: Request): string {
  if (!req.userId) throw new Error("Anonymous session was not initialized.");
  return req.userId;
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/bootstrap", async (req, res, next) => {
  try {
    const id = userId(req);
    const [messages, savedMessages, preferences, bookmarks] = await Promise.all([
      prisma.generatedMessage.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 30 }),
      prisma.generatedMessage.findMany({ where: { userId: id, savedAt: { not: null } }, orderBy: { savedAt: "desc" } }),
      prisma.userPreference.upsert({ where: { userId: id }, create: { userId: id }, update: {} }),
      prisma.guideBookmark.findMany({ where: { userId: id }, select: { guideId: true } }),
    ]);
    res.json({
      messages,
      savedMessages,
      preferences,
      bookmarks: bookmarks.map((item) => item.guideId),
      aiEnabled: Boolean(process.env.AI_API_KEY),
    });
  } catch (error) { next(error); }
});

app.post("/api/generate", rateLimit, async (req, res, next) => {
  try {
    const parsed = generationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Check the message details and try again." });
      return;
    }
    const id = userId(req);
    const variant = await prisma.generatedMessage.count({ where: { userId: id } });
    let generated: Awaited<ReturnType<typeof generateWithProvider>>;
    try {
      generated = await generateWithProvider(parsed.data, variant);
    } catch (error) {
      if (!process.env.AI_API_KEY) {
        next(error);
        return;
      }
      console.error("Configured AI provider request failed:", error instanceof Error ? error.name : "unknown error");
      res.status(502).json({ error: "The configured AI provider could not create a message. Try again later or disable AI_API_KEY to use local templates." });
      return;
    }
    const row = await prisma.generatedMessage.create({
      data: {
        userId: id,
        text: generated.text,
        scenario: parsed.data.scenario,
        mode: parsed.data.mode,
        directness: parsed.data.directness,
        score: generated.score,
        explanation: generated.explanation,
        provider: generated.provider,
      },
    });
    res.json({ ...row, provider: generated.provider });
  } catch (error) { next(error); }
});

app.patch("/api/messages/:id/save", async (req, res, next) => {
  try {
    const parsed = z.object({ saved: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose whether to save this message." });
      return;
    }
    const result = await prisma.generatedMessage.updateMany({
      where: { id: req.params.id, userId: userId(req) },
      data: { savedAt: parsed.data.saved ? new Date() : null },
    });
    if (!result.count) {
      res.status(404).json({ error: "That message could not be found." });
      return;
    }
    res.json({ saved: parsed.data.saved });
  } catch (error) { next(error); }
});

app.patch("/api/messages/:id", async (req, res, next) => {
  try {
    const parsed = z.object({ text: z.string().trim().min(1).max(1400) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Keep your message between 1 and 1,400 characters." });
      return;
    }
    const id = userId(req);
    const message = await prisma.generatedMessage.findFirst({
      where: { id: req.params.id, userId: id },
    });
    if (!message) {
      res.status(404).json({ error: "That message could not be found." });
      return;
    }
    const input = generationSchema.parse({
      scenario: message.scenario,
      mode: message.mode,
      directness: message.directness,
      recipient: "someone",
      channel: "text",
      length: "medium",
      context: "",
    });
    const { score, explanation } = scoreMessage(input, parsed.data.text);
    const updated = await prisma.generatedMessage.update({
      where: { id: message.id },
      data: { text: parsed.data.text, score, explanation },
    });
    res.json(updated);
  } catch (error) { next(error); }
});

app.delete("/api/messages/:id", async (req, res, next) => {
  try {
    const result = await prisma.generatedMessage.deleteMany({ where: { id: req.params.id, userId: userId(req) } });
    if (!result.count) {
      res.status(404).json({ error: "That message could not be found." });
      return;
    }
    res.status(204).end();
  } catch (error) { next(error); }
});

app.put("/api/preferences", async (req, res, next) => {
  try {
    const parsed = z.object({
      mode: z.enum(["funny", "professional", "direct"]),
      length: z.enum(["short", "medium", "long"]),
      directness: z.number().int().min(0).max(100),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Those preferences are not valid." });
      return;
    }
    const preference = await prisma.userPreference.upsert({
      where: { userId: userId(req) },
      create: { userId: userId(req), ...parsed.data },
      update: parsed.data,
    });
    res.json(preference);
  } catch (error) { next(error); }
});

app.get("/api/guides", async (req, res, next) => {
  try {
    const parsed = z.string().max(80).safeParse(req.query.q ?? "");
    if (!parsed.success) {
      res.status(400).json({ error: "Search query is too long." });
      return;
    }
    const query = parsed.data.toLocaleLowerCase();
    const bookmarks = await prisma.guideBookmark.findMany({
      where: { userId: userId(req) }, select: { guideId: true },
    });
    const saved = new Set(bookmarks.map((item) => item.guideId));
    const library = await prisma.guide.findMany({ orderBy: { title: "asc" } });
    const matching = library.filter((guide) =>
      !query || `${guide.title} ${guide.category} ${guide.description}`.toLocaleLowerCase().includes(query),
    );
    res.json(matching.map(({ variants, ...guide }) => ({
      ...guide,
      variants: z.array(z.object({ tone: z.enum(["Polite", "Funny", "Professional", "Direct"]), text: z.string() }))
        .parse(JSON.parse(variants)),
      bookmarked: saved.has(guide.id),
    })));
  } catch (error) { next(error); }
});

app.put("/api/guides/:id/bookmark", async (req, res, next) => {
  try {
    const exists = await prisma.guide.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!exists) {
      res.status(404).json({ error: "That guide could not be found." });
      return;
    }
    const parsed = z.object({ bookmarked: z.boolean() }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose whether to bookmark this guide." });
      return;
    }
    const where = { userId_guideId: { userId: userId(req), guideId: req.params.id } };
    if (parsed.data.bookmarked) {
      await prisma.guideBookmark.upsert({ where, create: { userId: userId(req), guideId: req.params.id }, update: {} });
    } else {
      await prisma.guideBookmark.deleteMany({ where: { userId: userId(req), guideId: req.params.id } });
    }
    res.json({ bookmarked: parsed.data.bookmarked });
  } catch (error) { next(error); }
});

app.use("/api", (_req, res) => res.status(404).json({ error: "That API route does not exist." }));

if (production) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(currentDir, "../..");
  app.use(express.static(path.resolve(projectRoot, "dist")));
  app.get("*", (_req, res) => res.sendFile(path.resolve(projectRoot, "dist/index.html")));
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const malformedJson = error instanceof SyntaxError && "type" in error && error.type === "entity.parse.failed";
  const status = malformedJson ? 400 : 500;
  if (status === 500) console.error("Request failed:", error instanceof Error ? error.name : "unknown error");
  res.status(status).json({ error: status === 400 ? "The request body is not valid JSON." : "Something went wrong. Please try again." });
});

const server = app.listen(port, () => console.log(`Awkwardly API listening on port ${port}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on("SIGINT", () => { void shutdown(); });
process.on("SIGTERM", () => { void shutdown(); });
