function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function elementSeed(id) {
  return hashString(`${id}:seed`) || 1;
}

function elementVersionNonce(id) {
  return hashString(`${id}:nonce`) || 1;
}

function makeBaseElement(id, type, overrides = {}) {
  return {
    id,
    type,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: "#1f2937",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: elementSeed(id),
    version: 1,
    versionNonce: elementVersionNonce(id),
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: false,
    ...overrides,
  };
}

function wrapLabel(label, maxChars) {
  const source = String(label || "").trim();
  if (!source) {
    return [""];
  }

  const lines = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines.length ? lines : [source];
}

function textMetrics(label, containerWidth, fontSize = 20) {
  const lines = wrapLabel(
    label,
    Math.max(8, Math.floor((containerWidth - 24) / Math.max(fontSize * 0.56, 1))),
  );
  const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const width = Math.max(40, Math.round(longestLine * fontSize * 0.56));
  const height = Math.max(fontSize + 8, Math.round(lines.length * fontSize * 1.25));

  return {
    lines,
    width,
    height,
    text: lines.join("\n"),
  };
}

function nodeColors(shape) {
  switch (shape) {
    case "ellipse":
      return {
        strokeColor: "#0f766e",
        backgroundColor: "#ecfeff",
      };
    case "diamond":
      return {
        strokeColor: "#b45309",
        backgroundColor: "#fef3c7",
      };
    default:
      return {
        strokeColor: "#c2410c",
        backgroundColor: "#fff7ed",
      };
  }
}

function centerOf(node) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

function createShapeElements(node) {
  const groupId = `group-${node.id}`;

  if (node.shape === "text") {
    const metrics = textMetrics(node.label, node.width, 24);

    return [
      makeBaseElement(`text-${node.id}`, "text", {
        x: node.x,
        y: node.y,
        width: metrics.width,
        height: metrics.height,
        strokeColor: "#0f172a",
        backgroundColor: "transparent",
        text: metrics.text,
        fontSize: 24,
        fontFamily: 3,
        textAlign: "left",
        verticalAlign: "top",
        containerId: null,
        originalText: metrics.text,
        lineHeight: 1.25,
        baseline: Math.round(24 * 0.8),
      }),
    ];
  }

  const shapeId = `shape-${node.id}`;
  const colors = nodeColors(node.shape);
  const shapeType = node.shape === "ellipse" ? "ellipse" : node.shape === "diamond" ? "diamond" : "rectangle";
  const shapeElement = makeBaseElement(shapeId, shapeType, {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    groupIds: [groupId],
    roundness: node.shape === "rectangle" ? { type: 3 } : null,
    ...colors,
  });

  const metrics = textMetrics(node.label, node.width, 20);
  const textElement = makeBaseElement(`text-${node.id}`, "text", {
    x: Math.round(node.x + (node.width - metrics.width) / 2),
    y: Math.round(node.y + (node.height - metrics.height) / 2),
    width: metrics.width,
    height: metrics.height,
    groupIds: [groupId],
    strokeColor: "#1f2937",
    backgroundColor: "transparent",
    text: metrics.text,
    fontSize: 20,
    fontFamily: 3,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: null,
    originalText: metrics.text,
    lineHeight: 1.25,
    baseline: Math.round(20 * 0.8),
  });

  return [shapeElement, textElement];
}

function createConnectorElements(scene) {
  const nodeMap = new Map(scene.nodes.map((node) => [node.id, node]));
  const elements = [];

  scene.connectors.forEach((connector, index) => {
    const fromNode = nodeMap.get(connector.from);
    const toNode = nodeMap.get(connector.to);

    if (!fromNode || !toNode) {
      return;
    }

    const from = centerOf(fromNode);
    const to = centerOf(toNode);
    const dx = Math.round(to.x - from.x);
    const dy = Math.round(to.y - from.y);
    const arrowId = `connector-${index + 1}-${connector.from}-${connector.to}`;

    elements.push(
      makeBaseElement(arrowId, "arrow", {
        x: Math.round(from.x),
        y: Math.round(from.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
        points: [
          [0, 0],
          [dx, dy],
        ],
        startBinding: null,
        endBinding: null,
        lastCommittedPoint: null,
        startArrowhead: null,
        endArrowhead: connector.kind === "arrow" ? "arrow" : null,
        elbowed: false,
        roundness: null,
        strokeColor: "#334155",
        backgroundColor: "transparent",
      }),
    );

    if (connector.label) {
      const labelMetrics = textMetrics(connector.label, 180, 18);
      elements.push(
        makeBaseElement(`label-${arrowId}`, "text", {
          x: Math.round((from.x + to.x) / 2 - labelMetrics.width / 2),
          y: Math.round((from.y + to.y) / 2 - labelMetrics.height - 10),
          width: labelMetrics.width,
          height: labelMetrics.height,
          strokeColor: "#475569",
          backgroundColor: "transparent",
          text: labelMetrics.text,
          fontSize: 18,
          fontFamily: 3,
          textAlign: "center",
          verticalAlign: "middle",
          containerId: null,
          originalText: labelMetrics.text,
          lineHeight: 1.25,
          baseline: Math.round(18 * 0.8),
        }),
      );
    }
  });

  return elements;
}

export function createExcalidrawFile(scene) {
  const nodeElements = scene.nodes.flatMap((node) => createShapeElements(node));
  const connectorElements = createConnectorElements(scene);

  return {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements: [...connectorElements, ...nodeElements],
    appState: {
      gridSize: null,
      viewBackgroundColor: "#fffdf8",
      currentItemStrokeColor: "#1f2937",
      currentItemBackgroundColor: "#fffdf8",
      currentItemFillStyle: "solid",
      currentItemStrokeWidth: 2,
      currentItemStrokeStyle: "solid",
      currentItemRoughness: 1,
      currentItemOpacity: 100,
      currentItemFontFamily: 3,
      scrollX: 0,
      scrollY: 0,
      zoom: {
        value: 0.9,
      },
    },
    files: {},
  };
}
