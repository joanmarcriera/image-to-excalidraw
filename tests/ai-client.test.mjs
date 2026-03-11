import test from "node:test";
import assert from "node:assert/strict";

import { extractJsonObject } from "../lib/ai-client.mjs";

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
