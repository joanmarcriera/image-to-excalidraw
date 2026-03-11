import test from "node:test";
import assert from "node:assert/strict";

import { buildUserPrompt, extractJsonObject } from "../lib/ai-client.mjs";

test("extractJsonObject strips code fences and trailing text", () => {
  const response = [
    "```json",
    '{ "title": "Sample", "nodes": [], "connectors": [] }',
    "```",
    "extra text should be ignored",
  ].join("\n");

  const json = extractJsonObject(response);

  assert.equal(
    json,
    '{ "title": "Sample", "nodes": [], "connectors": [] }',
  );
});

test("extractJsonObject throws when no object exists", () => {
  assert.throws(() => extractJsonObject("not json"), /did not contain a JSON object/);
});

test("buildUserPrompt adds structured quality rules", () => {
  const prompt = buildUserPrompt("", "structured");

  assert.match(prompt, /First plan the full layout before writing the JSON/);
  assert.match(prompt, /Use a grid-like layout with even spacing/);
});

test("buildUserPrompt keeps balanced mode lighter", () => {
  const prompt = buildUserPrompt("", "balanced");

  assert.doesNotMatch(prompt, /First plan the full layout before writing the JSON/);
  assert.match(prompt, /Avoid overlapping nodes or floating connectors/);
});
