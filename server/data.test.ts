import test from "node:test";
import assert from "node:assert/strict";
import { scenarios, guides } from "../src/data.js";

test("survival library contains useful say/avoid/advice and all four tone variants", () => {
  assert.ok(guides.length >= 5);
  for (const guide of guides) {
    assert.ok(guide.say.length > 12);
    assert.ok(guide.avoid.length > 12);
    assert.ok(guide.advice.length > 12);
    assert.deepEqual(guide.variants.map((variant) => variant.tone), ["Polite", "Funny", "Professional", "Direct"]);
  }
});

test("all five conversation scenarios have complete reachable branches and distinct outcomes", () => {
  assert.ok(scenarios.length >= 5);
  for (const scenario of scenarios) {
    const reached = new Set<string>();
    const pending = [scenario.start];
    while (pending.length) {
      const id = pending.pop()!;
      if (reached.has(id)) continue;
      const node = scenario.nodes[id];
      assert.ok(node, `${scenario.id} points to missing node ${id}`);
      reached.add(id);
      for (const choice of node.choices ?? []) pending.push(choice.next);
      if (!node.choices) assert.ok(node.outcome && node.insight, `${scenario.id} has an unlabelled ending`);
    }
    assert.equal(reached.size, Object.keys(scenario.nodes).length, `${scenario.id} has unreachable conversation data`);
    assert.ok(new Set(Object.values(scenario.nodes).flatMap((node) => node.outcome ? [node.outcome] : [])).size >= 2);
  }
});
