import test from "node:test";
import assert from "node:assert/strict";

import {
  computeConnectorPlacement,
  createExcalidrawFile,
} from "../lib/excalidraw.mjs";

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

test("createExcalidrawFile binds supported connectors to shapes", () => {
  const file = createExcalidrawFile({
    title: "Bindings",
    summary: "Bindings",
    width: 1200,
    height: 900,
    nodes: [
      {
        id: "left",
        shape: "rectangle",
        label: "Left",
        x: 100,
        y: 160,
        width: 220,
        height: 100,
      },
      {
        id: "right",
        shape: "ellipse",
        label: "Right",
        x: 460,
        y: 160,
        width: 220,
        height: 100,
      },
    ],
    connectors: [
      {
        from: "left",
        to: "right",
        kind: "arrow",
        label: "API",
      },
    ],
  });

  const arrow = file.elements.find((element) => element.id === "connector-1-left-right");
  const leftShape = file.elements.find((element) => element.id === "shape-left");
  const rightShape = file.elements.find((element) => element.id === "shape-right");

  assert.ok(arrow);
  assert.deepEqual(arrow.startBinding, {
    elementId: "shape-left",
    mode: "orbit",
    fixedPoint: [1, 0.5],
  });
  assert.deepEqual(arrow.endBinding, {
    elementId: "shape-right",
    mode: "orbit",
    fixedPoint: [0, 0.5],
  });
  assert.deepEqual(leftShape.boundElements, [{ type: "arrow", id: "connector-1-left-right" }]);
  assert.deepEqual(rightShape.boundElements, [{ type: "arrow", id: "connector-1-left-right" }]);
});

test("computeConnectorPlacement chooses top-bottom anchors for vertical flow", () => {
  const placement = computeConnectorPlacement(
    {
      id: "top",
      shape: "rectangle",
      label: "Top",
      x: 120,
      y: 120,
      width: 220,
      height: 100,
    },
    {
      id: "bottom",
      shape: "rectangle",
      label: "Bottom",
      x: 140,
      y: 420,
      width: 220,
      height: 100,
    },
  );

  assert.deepEqual(placement.startBinding.fixedPoint, [0.5, 1]);
  assert.deepEqual(placement.endBinding.fixedPoint, [0.5, 0]);
});

test("createExcalidrawFile falls back to unbound connectors for text nodes", () => {
  const file = createExcalidrawFile({
    title: "Fallback",
    summary: "Fallback",
    width: 1200,
    height: 900,
    nodes: [
      {
        id: "box",
        shape: "rectangle",
        label: "Box",
        x: 100,
        y: 160,
        width: 220,
        height: 100,
      },
      {
        id: "note",
        shape: "text",
        label: "Annotation",
        x: 480,
        y: 180,
        width: 140,
        height: 40,
      },
    ],
    connectors: [
      {
        from: "box",
        to: "note",
        kind: "line",
        label: "notes",
      },
    ],
  });

  const arrow = file.elements.find((element) => element.id === "connector-1-box-note");
  const boxShape = file.elements.find((element) => element.id === "shape-box");

  assert.equal(arrow.startBinding, null);
  assert.equal(arrow.endBinding, null);
  assert.deepEqual(boxShape.boundElements, []);
});
