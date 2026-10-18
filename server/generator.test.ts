import test from "node:test";
import assert from "node:assert/strict";
import { generateLocal, generationSchema, scoreMessage } from "./generator.js";

const input = generationSchema.parse({
  scenario: "skip a party",
  recipient: "Maya",
  channel: "text",
  length: "medium",
  directness: 55,
  mode: "funny",
  context: "I need an early night",
});

test("local fallback generates a contextual message and a bounded heuristic score", () => {
  const result = generateLocal(input);
  assert.match(result.text, /Maya/);
  assert.match(result.text, /early night/);
  assert.equal(result.provider, "local");
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(result.explanation.length > 10);
});

test("regeneration creates a different local variant", () => {
  assert.notEqual(generateLocal(input, 0).text, generateLocal(input, 1).text);
});

test("scenario categories shape the local fallback without inventing details", () => {
  const deadline = generateLocal({ ...input, scenario: "explain a missed deadline", context: "" });
  assert.match(deadline.text, /missed the agreed deadline/);
  assert.match(deadline.text, /keep you updated/);
  assert.doesNotMatch(deadline.text, /Thursday|specific date/i);
});

test("heuristic score never exceeds its advertised range", () => {
  const score = scoreMessage({ ...input, length: "long" }, "Maybe I can probably try to do this.".repeat(20)).score;
  assert.ok(score >= 0 && score <= 100);
});

test("generation input validation rejects invalid tone and oversized context", () => {
  assert.equal(generationSchema.safeParse({ ...input, mode: "mean" }).success, false);
  assert.equal(generationSchema.safeParse({ ...input, context: "x".repeat(501) }).success, false);
});
