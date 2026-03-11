const allowedShapes = new Set(["rectangle", "ellipse", "diamond", "text"]);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toNumber(value, fallback) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function slugify(value, fallback) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function ensureUniqueId(baseId, usedIds) {
  let nextId = baseId;
  let suffix = 2;

  while (usedIds.has(nextId)) {
    nextId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(nextId);
  return nextId;
}

function defaultSize(shape, label) {
  const labelLength = String(label || "").trim().length || 8;
  const width = clamp(80 + labelLength * 7, 120, 260);

  switch (shape) {
    case "ellipse":
      return { width, height: 84 };
    case "diamond":
      return { width: clamp(width, 130, 240), height: 110 };
    case "text":
      return { width, height: 42 };
    default:
      return { width, height: 88 };
  }
}

function normalizeNodes(rawNodes) {
  const usedIds = new Set();

  return rawNodes.map((rawNode, index) => {
    const label =
      typeof rawNode?.label === "string" && rawNode.label.trim()
        ? rawNode.label.trim()
        : `Node ${index + 1}`;
    const rawShape =
      typeof rawNode?.shape === "string" ? rawNode.shape.trim().toLowerCase() : "";
    const shape = allowedShapes.has(rawShape) ? rawShape : "rectangle";
    const inferredSize = defaultSize(shape, label);

    return {
      id: ensureUniqueId(
        slugify(rawNode?.id, `node-${index + 1}`),
        usedIds,
      ),
      shape,
      label,
      x: clamp(toNumber(rawNode?.x, 80 + index * 180), 0, 920),
      y: clamp(toNumber(rawNode?.y, 120 + index * 120), 0, 920),
      width: clamp(toNumber(rawNode?.width, inferredSize.width), 90, 320),
      height: clamp(toNumber(rawNode?.height, inferredSize.height), 34, 220),
    };
  });
}

function applyFallbackLayout(nodes) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const spacingX = 280;
  const spacingY = 180;

  return nodes.map((node, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;

    return {
      ...node,
      x: 120 + column * spacingX,
      y: 120 + row * spacingY,
    };
  });
}

function scaleNodes(nodes) {
  const positionedNodes =
    nodes.filter((node) => node.x > 0 || node.y > 0).length >= Math.ceil(nodes.length / 2)
      ? nodes
      : applyFallbackLayout(nodes);

  return positionedNodes.map((node) => ({
    ...node,
    x: Math.round(80 + node.x * 1.25),
    y: Math.round(80 + node.y * 1.05),
    width: Math.round(node.width * 1.15),
    height: Math.round(node.height * 1.1),
  }));
}

function normalizeConnectors(rawConnectors, nodeIds) {
  const validKinds = new Set(["arrow", "line"]);

  return rawConnectors
    .map((connector) => {
      const from = slugify(connector?.from, "");
      const to = slugify(connector?.to, "");
      const kind =
        typeof connector?.kind === "string" && validKinds.has(connector.kind)
          ? connector.kind
          : "arrow";
      const label =
        typeof connector?.label === "string" ? connector.label.trim().slice(0, 80) : "";

      return {
        from,
        to,
        kind,
        label,
      };
    })
    .filter((connector) => nodeIds.has(connector.from) && nodeIds.has(connector.to));
}

export function normalizeScene(candidate) {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("The model did not return a scene object.");
  }

  const rawNodes = Array.isArray(candidate.nodes) ? candidate.nodes : [];
  if (!rawNodes.length) {
    throw new Error("The extracted scene did not contain any nodes.");
  }

  const nodes = scaleNodes(normalizeNodes(rawNodes));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const connectors = normalizeConnectors(
    Array.isArray(candidate.connectors) ? candidate.connectors : [],
    nodeIds,
  );

  const maxRight = Math.max(...nodes.map((node) => node.x + node.width), 1200);
  const maxBottom = Math.max(...nodes.map((node) => node.y + node.height), 720);

  return {
    title:
      typeof candidate.title === "string" && candidate.title.trim()
        ? candidate.title.trim().slice(0, 120)
        : "Extracted diagram",
    summary:
      typeof candidate.summary === "string" && candidate.summary.trim()
        ? candidate.summary.trim().slice(0, 240)
        : "Diagram extracted from the uploaded image.",
    width: maxRight + 140,
    height: maxBottom + 140,
    nodes,
    connectors,
  };
}
