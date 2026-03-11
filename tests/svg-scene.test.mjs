import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { extractSceneFromSvg } from "../public/svg-scene.js";

test("extractSceneFromSvg converts the bundled example into a scene", () => {
  const svg = readFileSync(new URL("../examples/sample-flow.svg", import.meta.url), "utf8");
  const scene = extractSceneFromSvg(svg, "sample-flow.svg");

  assert.equal(scene.title, "Example: image review pipeline");
  assert.ok(scene.nodes.some((node) => node.label.includes("Upload image")));
  assert.ok(scene.nodes.some((node) => node.label.includes("Generate\nExcalidraw")));
  assert.ok(scene.connectors.some((connector) => connector.label === "Yes"));
  assert.ok(scene.connectors.some((connector) => connector.label === "No"));
});

test("extractSceneFromSvg throws on invalid input", () => {
  assert.throws(() => extractSceneFromSvg("<div>not svg</div>"), /valid SVG/);
});
