function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function cloneScene(scene) {
  return {
    ...scene,
    nodes: scene.nodes.map((node) => ({ ...node })),
    connectors: scene.connectors.map((connector) => ({ ...connector })),
  };
}

function labelLength(node) {
  return String(node.label || "")
    .replace(/\s+/g, " ")
    .trim().length;
}

function structuredNodeSize(node) {
  const length = labelLength(node);

  if (node.shape === "text") {
    return {
      width: clamp(Math.max(node.width, 120, 80 + length * 8), 120, 260),
      height: clamp(Math.max(node.height, 42), 42, 96),
    };
  }

  if (node.shape === "diamond") {
    return {
      width: clamp(Math.max(node.width, 180, 100 + length * 7), 180, 220),
      height: clamp(Math.max(node.height, 150), 150, 190),
    };
  }

  return {
    width: clamp(Math.max(node.width, 220, 110 + length * 7), 200, 260),
    height: clamp(Math.max(node.height, 100), 100, 130),
  };
}

function recomputeBounds(scene) {
  const maxRight = Math.max(...scene.nodes.map((node) => node.x + node.width), 1200);
  const maxBottom = Math.max(...scene.nodes.map((node) => node.y + node.height), 720);

  return {
    ...scene,
    width: maxRight + 140,
    height: maxBottom + 140,
  };
}

function refineStructuredScene(scene) {
  const gridX = 300;
  const gridY = 200;
  const originX = 120;
  const originY = 120;
  const nodes = scene.nodes.map((node, index) => {
    const desiredRow = Math.max(0, Math.round((node.y - originY) / gridY));
    const desiredCol = Math.max(0, Math.round((node.x - originX) / gridX));
    const size = structuredNodeSize(node);

    return {
      ...node,
      width: size.width,
      height: size.height,
      desiredRow,
      desiredCol,
      originalIndex: index,
    };
  });

  const uniqueRows = [...new Set(nodes.map((node) => node.desiredRow))].sort((left, right) => left - right);
  const compactRowMap = new Map(uniqueRows.map((row, index) => [row, index]));
  const placedNodes = [];

  uniqueRows.forEach((row) => {
    const compactRow = compactRowMap.get(row) || 0;
    let colCursor = 0;

    nodes
      .filter((node) => node.desiredRow === row)
      .sort((left, right) => (
        left.desiredCol - right.desiredCol ||
        left.x - right.x ||
        left.originalIndex - right.originalIndex
      ))
      .forEach((node) => {
        const col = Math.max(node.desiredCol, colCursor);
        colCursor = col + 1;
        placedNodes.push({
          id: node.id,
          shape: node.shape,
          label: node.label,
          width: node.width,
          height: node.height,
          x: originX + col * gridX,
          y: originY + compactRow * gridY,
        });
      });
  });

  return recomputeBounds({
    ...scene,
    nodes: placedNodes,
  });
}

export function refineScene(scene, options = {}) {
  const qualityPreset = options.qualityPreset || "balanced";
  const clonedScene = cloneScene(scene);

  if (qualityPreset === "structured") {
    return refineStructuredScene(clonedScene);
  }

  return recomputeBounds(clonedScene);
}
