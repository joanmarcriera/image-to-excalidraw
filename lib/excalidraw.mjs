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

const bindingSides = {
  left: {
    fixedPoint: [0, 0.5],
    point(node) {
      return {
        x: node.x,
        y: node.y + node.height / 2,
      };
    },
  },
  right: {
    fixedPoint: [1, 0.5],
    point(node) {
      return {
        x: node.x + node.width,
        y: node.y + node.height / 2,
      };
    },
  },
  top: {
    fixedPoint: [0.5, 0],
    point(node) {
      return {
        x: node.x + node.width / 2,
        y: node.y,
      };
    },
  },
  bottom: {
    fixedPoint: [0.5, 1],
    point(node) {
      return {
        x: node.x + node.width / 2,
        y: node.y + node.height,
      };
    },
  },
};

function connectorBounds(points) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);

  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function supportsBoundConnector(node) {
  return node && node.shape !== "text";
}

function chooseBindingSides(fromNode, toNode) {
  const from = centerOf(fromNode);
  const to = centerOf(toNode);
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { startSide: "right", endSide: "left" }
      : { startSide: "left", endSide: "right" };
  }

  return dy >= 0
    ? { startSide: "bottom", endSide: "top" }
    : { startSide: "top", endSide: "bottom" };
}

export function computeConnectorPlacement(fromNode, toNode) {
  const { startSide, endSide } = chooseBindingSides(fromNode, toNode);
  const startDescriptor = bindingSides[startSide];
  const endDescriptor = bindingSides[endSide];
  const startPoint = startDescriptor.point(fromNode);
  const endPoint = endDescriptor.point(toNode);
  const dx = Math.round(endPoint.x - startPoint.x);
  const dy = Math.round(endPoint.y - startPoint.y);
  const straight = Math.abs(dx) <= 24 || Math.abs(dy) <= 24;

  let points;
  if (straight) {
    points = [
      [0, 0],
      [dx, dy],
    ];
  } else if (Math.abs(dx) >= Math.abs(dy)) {
    const midX = Math.round(dx / 2);
    points = [
      [0, 0],
      [midX, 0],
      [midX, dy],
      [dx, dy],
    ];
  } else {
    const midY = Math.round(dy / 2);
    points = [
      [0, 0],
      [0, midY],
      [dx, midY],
      [dx, dy],
    ];
  }

  const bounds = connectorBounds(points);

  return {
    x: Math.round(startPoint.x),
    y: Math.round(startPoint.y),
    width: bounds.width,
    height: bounds.height,
    points,
    elbowed: !straight,
    startBinding: {
      mode: "orbit",
      fixedPoint: startDescriptor.fixedPoint,
    },
    endBinding: {
      mode: "orbit",
      fixedPoint: endDescriptor.fixedPoint,
    },
    labelPosition: {
      x: Math.round((startPoint.x + endPoint.x) / 2),
      y: Math.round((startPoint.y + endPoint.y) / 2 - 10),
    },
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

  return {
    elements: [shapeElement, textElement],
    bindingTarget: shapeElement,
  };
}

function createUnboundConnector(connector, index, fromNode, toNode) {
  const from = centerOf(fromNode);
  const to = centerOf(toNode);
  const dx = Math.round(to.x - from.x);
  const dy = Math.round(to.y - from.y);
  const arrowId = `connector-${index + 1}-${connector.from}-${connector.to}`;
  const points = [
    [0, 0],
    [dx, dy],
  ];
  const bounds = connectorBounds(points);

  return {
    arrowId,
    labelPosition: {
      x: Math.round((from.x + to.x) / 2),
      y: Math.round((from.y + to.y) / 2 - 10),
    },
    element: makeBaseElement(arrowId, "arrow", {
      x: Math.round(from.x),
      y: Math.round(from.y),
      width: bounds.width,
      height: bounds.height,
      points,
      startBinding: null,
      endBinding: null,
      lastCommittedPoint: null,
      startArrowhead: null,
      endArrowhead: connector.kind === "arrow" ? "arrow" : null,
      elbowed: false,
      roundness: null,
      strokeColor: "#334155",
      backgroundColor: "transparent",
      strokeStyle: connector.kind === "line" ? "dashed" : "solid",
    }),
  };
}

function bindArrowToShape(shapeElement, arrowId) {
  if (!shapeElement.boundElements.some((entry) => entry.id === arrowId)) {
    shapeElement.boundElements.push({
      type: "arrow",
      id: arrowId,
    });
  }
}

function createConnectorElements(scene, nodeBindingTargets, options = {}) {
  const nodeMap = new Map(scene.nodes.map((node) => [node.id, node]));
  const elements = [];
  const attachConnectors = options.attachConnectors !== false;

  scene.connectors.forEach((connector, index) => {
    const fromNode = nodeMap.get(connector.from);
    const toNode = nodeMap.get(connector.to);

    if (!fromNode || !toNode) {
      return;
    }

    const fromShape = nodeBindingTargets.get(connector.from) || null;
    const toShape = nodeBindingTargets.get(connector.to) || null;
    const canBind =
      attachConnectors &&
      supportsBoundConnector(fromNode) &&
      supportsBoundConnector(toNode) &&
      fromShape &&
      toShape;

    let arrowId;
    let labelPosition;

    if (canBind) {
      const placement = computeConnectorPlacement(fromNode, toNode);
      arrowId = `connector-${index + 1}-${connector.from}-${connector.to}`;
      labelPosition = placement.labelPosition;

      elements.push(
        makeBaseElement(arrowId, "arrow", {
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
          points: placement.points,
          startBinding: {
            ...placement.startBinding,
            elementId: fromShape.id,
          },
          endBinding: {
            ...placement.endBinding,
            elementId: toShape.id,
          },
          lastCommittedPoint: null,
          startArrowhead: null,
          endArrowhead: connector.kind === "arrow" ? "arrow" : null,
          elbowed: placement.elbowed,
          roundness: null,
          strokeColor: "#334155",
          backgroundColor: "transparent",
          strokeStyle: connector.kind === "line" ? "dashed" : "solid",
        }),
      );

      bindArrowToShape(fromShape, arrowId);
      bindArrowToShape(toShape, arrowId);
    } else {
      const fallback = createUnboundConnector(connector, index, fromNode, toNode);
      arrowId = fallback.arrowId;
      labelPosition = fallback.labelPosition;
      elements.push(fallback.element);
    }

    if (connector.label) {
      const labelMetrics = textMetrics(connector.label, 180, 18);
      elements.push(
        makeBaseElement(`label-${arrowId}`, "text", {
          x: Math.round(labelPosition.x - labelMetrics.width / 2),
          y: Math.round(labelPosition.y - labelMetrics.height),
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

export function createExcalidrawFile(scene, options = {}) {
  const nodeBindingTargets = new Map();
  const nodeElements = scene.nodes.flatMap((node) => {
    const result = createShapeElements(node);

    if (Array.isArray(result)) {
      return result;
    }

    if (result.bindingTarget) {
      nodeBindingTargets.set(node.id, result.bindingTarget);
    }

    return result.elements;
  });
  const connectorElements = createConnectorElements(scene, nodeBindingTargets, options);

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
