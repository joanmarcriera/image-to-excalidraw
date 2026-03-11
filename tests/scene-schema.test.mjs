import test from "node:test";
import assert from "node:assert/strict";

import { normalizeScene } from "../lib/scene-schema.mjs";

test("normalizeScene fixes duplicate ids and invalid connectors", () => {
  const scene = normalizeScene({
    title: "Rough flow",
    summary: "Demo",
    nodes: [
      { id: "Start", shape: "ellipse", label: "Start", x: 50, y: 60, width: 140, height: 80 },
      { id: "Start", shape: "rectangle", label: "Process", x: 320, y: 60, width: 190, height: 90 },
    ],
    connectors: [
      { from: "Start", to: "Start-2", kind: "arrow", label: "ok" },
      { from: "missing", to: "Start", kind: "arrow", label: "drop" },
    ],
  });

  assert.equal(scene.nodes.length, 2);
  assert.equal(scene.nodes[0].id, "start");
  assert.equal(scene.nodes[1].id, "start-2");
  assert.equal(scene.connectors.length, 1);
  assert.equal(scene.connectors[0].from, "start");
  assert.equal(scene.connectors[0].to, "start-2");
});

test("normalizeScene throws when nodes are missing", () => {
  assert.throws(() => normalizeScene({ nodes: [] }), /did not contain any nodes/);
});
