import test from "node:test";
import assert from "node:assert/strict";

import { createExcalidrawFile } from "../lib/excalidraw.mjs";

test("createExcalidrawFile creates a valid top-level structure", () => {
  const file = createExcalidrawFile({
    title: "Demo",
    summary: "Demo summary",
    width: 1200,
    height: 900,
    nodes: [
      {
        id: "start",
        shape: "ellipse",
        label: "Start",
        x: 120,
        y: 180,
        width: 220,
        height: 110,
      },
      {
        id: "process",
        shape: "rectangle",
        label: "Process",
        x: 420,
        y: 180,
        width: 240,
        height: 110,
      },
    ],
    connectors: [
      {
        from: "start",
        to: "process",
        kind: "arrow",
        label: "next",
      },
    ],
  });

  assert.equal(file.type, "excalidraw");
  assert.equal(file.version, 2);
  assert.ok(Array.isArray(file.elements));
  assert.ok(file.elements.some((element) => element.type === "arrow"));
  assert.ok(file.elements.some((element) => element.type === "ellipse"));
  assert.ok(file.elements.some((element) => element.type === "rectangle"));
  assert.ok(file.elements.some((element) => element.type === "text"));
  assert.deepEqual(file.files, {});
});
