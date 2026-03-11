function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitLines(label) {
  return String(label || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function centerOf(node) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

function renderLabelLines(lines, centerX, centerY) {
  const safeLines = lines.length ? lines : [""];
  const startY = centerY - ((safeLines.length - 1) * 18) / 2;

  return safeLines
    .map(
      (line, index) =>
        `<tspan x="${centerX}" y="${startY + index * 22}">${escapeXml(line)}</tspan>`,
    )
    .join("");
}

function connectorLabelPosition(fromNode, toNode) {
  const from = centerOf(fromNode);
  const to = centerOf(toNode);

  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2 - 12,
  };
}

export function renderSceneSvg(scene) {
  const nodeMap = new Map(scene.nodes.map((node) => [node.id, node]));
  const connectorMarkup = scene.connectors
    .map((connector) => {
      const fromNode = nodeMap.get(connector.from);
      const toNode = nodeMap.get(connector.to);

      if (!fromNode || !toNode) {
        return "";
      }

      const from = centerOf(fromNode);
      const to = centerOf(toNode);
      const dashArray = connector.kind === "line" ? ' stroke-dasharray="8 6"' : "";
      const labelMarkup = connector.label
        ? (() => {
            const position = connectorLabelPosition(fromNode, toNode);
            return `<text x="${position.x}" y="${position.y}" text-anchor="middle" font-family="'Trebuchet MS', Verdana, sans-serif" font-size="16" fill="#334155">${escapeXml(
              connector.label,
            )}</text>`;
          })()
        : "";

      return [
        `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#2f3e46" stroke-width="2.5"${dashArray} marker-end="${connector.kind === "arrow" ? "url(#arrowhead)" : ""}" />`,
        labelMarkup,
      ].join("");
    })
    .join("");

  const nodeMarkup = scene.nodes
    .map((node) => {
      if (node.shape === "text") {
        return `<text x="${node.x}" y="${node.y}" font-family="'Trebuchet MS', Verdana, sans-serif" font-size="22" fill="#0f172a">${escapeXml(
          node.label,
        )}</text>`;
      }

      const label = renderLabelLines(
        splitLines(node.label),
        node.x + node.width / 2,
        node.y + node.height / 2 + 2,
      );

      if (node.shape === "ellipse") {
        return [
          `<ellipse cx="${node.x + node.width / 2}" cy="${node.y + node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}" fill="#ecfeff" stroke="#0f766e" stroke-width="2.5" />`,
          `<text text-anchor="middle" font-family="'Trebuchet MS', Verdana, sans-serif" font-size="18" fill="#134e4a">${label}</text>`,
        ].join("");
      }

      if (node.shape === "diamond") {
        const halfWidth = node.width / 2;
        const halfHeight = node.height / 2;
        const points = [
          `${node.x + halfWidth},${node.y}`,
          `${node.x + node.width},${node.y + halfHeight}`,
          `${node.x + halfWidth},${node.y + node.height}`,
          `${node.x},${node.y + halfHeight}`,
        ].join(" ");

        return [
          `<polygon points="${points}" fill="#fef3c7" stroke="#b45309" stroke-width="2.5" />`,
          `<text text-anchor="middle" font-family="'Trebuchet MS', Verdana, sans-serif" font-size="18" fill="#78350f">${label}</text>`,
        ].join("");
      }

      return [
        `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="18" fill="#fff7ed" stroke="#c2410c" stroke-width="2.5" />`,
        `<text text-anchor="middle" font-family="'Trebuchet MS', Verdana, sans-serif" font-size="18" fill="#7c2d12">${label}</text>`,
      ].join("");
    })
    .join("");

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-label="${escapeXml(scene.title)}">
  <defs>
    <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M 0 0 L 12 6 L 0 12 z" fill="#2f3e46" />
    </marker>
  </defs>
  <rect width="${scene.width}" height="${scene.height}" fill="#fffdf8" />
  ${connectorMarkup}
  ${nodeMarkup}
</svg>`.trim();
}
