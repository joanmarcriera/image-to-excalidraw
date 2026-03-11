const SYSTEM_PROMPT = [
  "You convert diagram images into structured diagram scene JSON.",
  "Return JSON only. Do not use markdown fences.",
  "Preserve the original structure, but simplify noisy or uncertain details.",
  "Allowed node shapes are rectangle, ellipse, diamond, and text.",
  "All coordinates must use a 1000x1000 top-left-origin canvas.",
].join(" ");

const USER_PROMPT_TEMPLATE = [
  "Analyze the uploaded image and extract the core diagram as JSON.",
  "Use this exact shape:",
  "{",
  '  "title": "short title",',
  '  "summary": "one sentence summary",',
  '  "nodes": [',
  '    { "id": "n1", "shape": "rectangle", "label": "Start", "x": 120, "y": 140, "width": 180, "height": 80 }',
  "  ],",
  '  "connectors": [',
  '    { "from": "n1", "to": "n2", "kind": "arrow", "label": "" }',
  "  ]",
  "}",
  "Rules:",
  "- Use between 1 and 18 nodes.",
  "- Put labels inside nodes whenever possible.",
  "- Use text nodes only for standalone annotations or titles.",
  "- Keep connector labels short.",
  "- Connectors must only reference node ids that exist.",
  "- If the image is unclear, keep the layout simple rather than inventing detail.",
].join("\n");

function buildUserPrompt(userNotes) {
  const trimmedNotes =
    typeof userNotes === "string" && userNotes.trim() ? userNotes.trim() : "";

  if (!trimmedNotes) {
    return USER_PROMPT_TEMPLATE;
  }

  return `${USER_PROMPT_TEMPLATE}\nAdditional guidance from the user:\n${trimmedNotes}`;
}

function toChatCompletionsUrl(baseUrl) {
  const trimmed = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
}

function normalizeMessageContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

export function extractJsonObject(text) {
  const normalized = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const startIndex = normalized.indexOf("{");
  if (startIndex === -1) {
    throw new Error("The model response did not contain a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return normalized.slice(startIndex, index + 1);
      }
    }
  }

  throw new Error("The model response contained incomplete JSON.");
}

export async function requestDiagramSpec({
  apiKey,
  baseUrl,
  imageDataUrl,
  model,
  providerName,
  refererUrl,
  appTitle,
  userNotes,
}) {
  const endpoint = toChatCompletionsUrl(baseUrl);
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (endpoint.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = refererUrl || "http://localhost:3000";
    headers["X-Title"] = appTitle || "image-to-excalidraw";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_completion_tokens: 2200,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildUserPrompt(userNotes),
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      payload?.error?.message ||
      payload?.message ||
      `Provider request failed with status ${response.status}.`;
    const providerLabel = providerName ? `${providerName}: ` : "";
    throw new Error(`${providerLabel}${detail}`);
  }

  const content = normalizeMessageContent(payload?.choices?.[0]?.message?.content);
  if (!content) {
    throw new Error("The model returned an empty response.");
  }

  try {
    return JSON.parse(extractJsonObject(content));
  } catch (error) {
    throw new Error(
      `The model returned content that could not be parsed as scene JSON: ${
        error instanceof Error ? error.message : "unknown parse error"
      }`,
    );
  }
}
