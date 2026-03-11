function parseAttributes(fragment) {
  const attributes = {};
  const attributePattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(['"])(.*?)\2/g;

  for (const match of fragment.matchAll(attributePattern)) {
    attributes[match[1]] = match[3];
  }

  return attributes;
}

function toNumber(value, fallback = 0) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/px$/i, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function decodeEntities(value) {
  return String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextContent(innerMarkup) {
  const tspanMatches = [...innerMarkup.matchAll(/<tspan\b[^>]*>([\s\S]*?)<\/tspan>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);

  if (tspanMatches.length) {
    return tspanMatches.join("\n");
  }

  return stripTags(innerMarkup);
}

function centerOf(node) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return distance(px, py, x1, y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const projectionX = x1 + t * dx;
  const projectionY = y1 + t * dy;
  return distance(px, py, projectionX, projectionY);
}

function pointNearShape(node, x, y, margin = 18) {
  if (node.shape === "rectangle") {
    const inside =
      x >= node.x - margin &&
      x <= node.x + node.width + margin &&
      y >= node.y - margin &&
      y <= node.y + node.height + margin;
    if (inside) {
      return 0;
    }
  }

  if (node.shape === "ellipse") {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const dx = (x - cx) / (node.width / 2 + margin);
    const dy = (y - cy) / (node.height / 2 + margin);
    if (dx * dx + dy * dy <= 1) {
      return 0;
    }
  }

  if (node.shape === "diamond") {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const dx = Math.abs(x - cx) / (node.width / 2 + margin);
    const dy = Math.abs(y - cy) / (node.height / 2 + margin);
    if (dx + dy <= 1) {
      return 0;
    }
  }

  const center = centerOf(node);
  return distance(x, y, center.x, center.y);
}

function nearestShapeId(nodes, x, y) {
  let bestId = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const currentDistance = pointNearShape(node, x, y);
    if (currentDistance < bestDistance) {
      bestDistance = currentDistance;
      bestId = node.id;
    }
  }

  if (bestDistance > 220) {
    return null;
  }

  return bestId;
}

function containingShapeId(nodes, x, y) {
  for (const node of nodes) {
    if (pointNearShape(node, x, y) === 0) {
      return node.id;
    }
  }

  return null;
}

function lineMidpoint(line) {
  return {
    x: (line.x1 + line.x2) / 2,
    y: (line.y1 + line.y2) / 2,
  };
}

function parseViewBox(svgAttributes) {
  if (svgAttributes.viewBox) {
    const parts = svgAttributes.viewBox
      .trim()
      .split(/[\s,]+/)
      .map((part) => Number.parseFloat(part));

    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return {
        minX: parts[0],
        minY: parts[1],
        width: Math.max(parts[2], 1),
        height: Math.max(parts[3], 1),
      };
    }
  }

  return {
    minX: 0,
    minY: 0,
    width: Math.max(toNumber(svgAttributes.width, 1000), 1),
    height: Math.max(toNumber(svgAttributes.height, 1000), 1),
  };
}

function asDiamond(points) {
  if (points.length !== 4) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function extractSceneFromSvg(svgText, fallbackTitle = "SVG import") {
  const svgMatch = svgText.match(/<svg\b([^>]*)>/i);
  if (!svgMatch) {
    throw new Error("This does not look like a valid SVG file.");
  }

  const svgAttributes = parseAttributes(svgMatch[1]);
  const viewBox = parseViewBox(svgAttributes);
  const nodes = [];
  const lines = [];
  const textNodes = [];

  let shapeIndex = 1;
  let textIndex = 1;

  for (const match of svgText.matchAll(/<rect\b([^>]*)\/?>/gi)) {
    const attrs = parseAttributes(match[1]);
    const width = toNumber(attrs.width);
    const height = toNumber(attrs.height);

    if (
      width * height >= viewBox.width * viewBox.height * 0.55 &&
      toNumber(attrs.x) <= viewBox.minX + 12 &&
      toNumber(attrs.y) <= viewBox.minY + 12
    ) {
      continue;
    }

    nodes.push({
      id: `svg-node-${shapeIndex++}`,
      shape: "rectangle",
      label: "",
      x: toNumber(attrs.x),
      y: toNumber(attrs.y),
      width,
      height,
    });
  }

  for (const match of svgText.matchAll(/<ellipse\b([^>]*)\/?>/gi)) {
    const attrs = parseAttributes(match[1]);
    const rx = toNumber(attrs.rx);
    const ry = toNumber(attrs.ry);
    nodes.push({
      id: `svg-node-${shapeIndex++}`,
      shape: "ellipse",
      label: "",
      x: toNumber(attrs.cx) - rx,
      y: toNumber(attrs.cy) - ry,
      width: rx * 2,
      height: ry * 2,
    });
  }

  for (const match of svgText.matchAll(/<circle\b([^>]*)\/?>/gi)) {
    const attrs = parseAttributes(match[1]);
    const radius = toNumber(attrs.r);
    nodes.push({
      id: `svg-node-${shapeIndex++}`,
      shape: "ellipse",
      label: "",
      x: toNumber(attrs.cx) - radius,
      y: toNumber(attrs.cy) - radius,
      width: radius * 2,
      height: radius * 2,
    });
  }

  for (const match of svgText.matchAll(/<polygon\b([^>]*)\/?>/gi)) {
    const attrs = parseAttributes(match[1]);
    const points = String(attrs.points || "")
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(",").map((part) => Number.parseFloat(part)))
      .filter((pair) => pair.length === 2 && pair.every(Number.isFinite))
      .map(([x, y]) => ({ x, y }));
    const diamond = asDiamond(points);

    if (!diamond) {
      continue;
    }

    nodes.push({
      id: `svg-node-${shapeIndex++}`,
      shape: "diamond",
      label: "",
      ...diamond,
    });
  }

  for (const match of svgText.matchAll(/<line\b([^>]*)\/?>/gi)) {
    const attrs = parseAttributes(match[1]);
    lines.push({
      id: `svg-line-${lines.length + 1}`,
      x1: toNumber(attrs.x1),
      y1: toNumber(attrs.y1),
      x2: toNumber(attrs.x2),
      y2: toNumber(attrs.y2),
      kind: attrs["marker-end"] ? "arrow" : "line",
      label: "",
    });
  }

  for (const match of svgText.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi)) {
    const attrs = parseAttributes(match[1]);
    const content = extractTextContent(match[2]);

    if (!content) {
      continue;
    }

    textNodes.push({
      id: `svg-text-${textIndex++}`,
      text: content,
      x: toNumber(attrs.x),
      y: toNumber(attrs.y),
      fontSize: toNumber(attrs["font-size"], 18),
    });
  }

  if (!nodes.length && !textNodes.length) {
    throw new Error("The SVG did not contain supported flowchart elements.");
  }

  const shapeLabels = new Map(nodes.map((node) => [node.id, []]));
  const remainingTextNodes = [];

  for (const textNode of textNodes) {
    const shapeId = containingShapeId(nodes, textNode.x, textNode.y);

    if (shapeId) {
      shapeLabels.get(shapeId)?.push(textNode);
      continue;
    }

    remainingTextNodes.push(textNode);
  }

  for (const node of nodes) {
    const labels = (shapeLabels.get(node.id) || []).sort((left, right) => left.y - right.y);
    if (labels.length) {
      node.label = labels.map((label) => label.text).join("\n");
    }
  }

  const leftoverTexts = [];

  for (const textNode of remainingTextNodes) {
    let bestLine = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const line of lines) {
      const midpoint = lineMidpoint(line);
      const midpointDistance = distance(textNode.x, textNode.y, midpoint.x, midpoint.y);
      const segmentDistance = distancePointToSegment(
        textNode.x,
        textNode.y,
        line.x1,
        line.y1,
        line.x2,
        line.y2,
      );
      const score = midpointDistance + segmentDistance;

      if (score < bestDistance) {
        bestDistance = score;
        bestLine = line;
      }
    }

    if (bestLine && bestDistance < 80 && !bestLine.label) {
      bestLine.label = textNode.text;
      continue;
    }

    leftoverTexts.push(textNode);
  }

  const titleCandidate = [...leftoverTexts]
    .filter((textNode) => textNode.y <= viewBox.minY + Math.max(120, viewBox.height * 0.2))
    .sort((left, right) => right.fontSize - left.fontSize || left.y - right.y)[0];

  const title = titleCandidate?.text || fallbackTitle.replace(/\.svg$/i, "");
  const standaloneTexts = leftoverTexts.filter((textNode) => textNode.id !== titleCandidate?.id);

  const textElements = standaloneTexts.map((textNode, index) => ({
    id: `svg-free-text-${index + 1}`,
    shape: "text",
    label: textNode.text,
    x: textNode.x,
    y: textNode.y,
    width: Math.max(90, textNode.text.length * 10),
    height: Math.max(28, textNode.fontSize * 1.3),
  }));

  const connectors = lines
    .map((line) => {
      const from = nearestShapeId(nodes, line.x1, line.y1);
      const to = nearestShapeId(nodes, line.x2, line.y2);

      if (!from || !to || from === to) {
        return null;
      }

      return {
        from,
        to,
        kind: line.kind,
        label: line.label,
      };
    })
    .filter(Boolean);

  const labeledNodes = nodes.filter((node) => node.label);
  const allNodes = [...labeledNodes, ...textElements];

  if (!allNodes.length) {
    throw new Error("The SVG parser could not identify any labeled nodes to convert.");
  }

  return {
    title,
    summary: "Diagram extracted directly from SVG without an AI request.",
    width: viewBox.width,
    height: viewBox.height,
    nodes: allNodes,
    connectors,
  };
}
