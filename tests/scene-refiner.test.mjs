import test from "node:test";
import assert from "node:assert/strict";

import { refineScene } from "../lib/scene-refiner.mjs";

function overlaps(left, right) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

test("refineScene spaces dense structured scenes without overlaps", () => {
  const scene = refineScene(
    {
      title: "Dense flow",
      summary: "Dense flow",
      width: 900,
      height: 700,
      nodes: [
        { id: "a", shape: "rectangle", label: "Alpha Service", x: 100, y: 100, width: 180, height: 88 },
        { id: "b", shape: "rectangle", label: "Beta Service", x: 120, y: 110, width: 180, height: 88 },
        { id: "c", shape: "diamond", label: "Review", x: 140, y: 120, width: 160, height: 110 },
        { id: "d", shape: "ellipse", label: "Done", x: 160, y: 130, width: 180, height: 88 },
      ],
      connectors: [
        { from: "a", to: "b", kind: "arrow", label: "" },
        { from: "b", to: "c", kind: "arrow", label: "" },
        { from: "c", to: "d", kind: "arrow", label: "" },
      ],
    },
    { qualityPreset: "structured" },
  );

  for (let index = 0; index < scene.nodes.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < scene.nodes.length; nextIndex += 1) {
      assert.equal(
        overlaps(scene.nodes[index], scene.nodes[nextIndex]),
        false,
        `${scene.nodes[index].id} overlaps ${scene.nodes[nextIndex].id}`,
      );
    }
  }
});
