import { extractSceneFromSvg } from "./svg-scene.js";
import { requestDiagramSpec } from "./lib/ai-client.mjs";
import { createExcalidrawFile } from "./lib/excalidraw.mjs";
import { refineScene } from "./lib/scene-refiner.mjs";
import { normalizeScene } from "./lib/scene-schema.mjs";
import { renderSceneSvg } from "./lib/svg-preview.mjs";

const providerPresets = {
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4.1-mini",
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
  },
  custom: {
    label: "Custom-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
  },
};

const fileInput = document.querySelector("#file-input");
const loadExampleButton = document.querySelector("#load-example");
const modeSelect = document.querySelector("#mode-select");
const qualityPresetSelect = document.querySelector("#quality-preset-select");
const providerSelect = document.querySelector("#provider-select");
const modelInput = document.querySelector("#model-input");
const baseUrlInput = document.querySelector("#base-url-input");
const apiKeyInput = document.querySelector("#api-key-input");
const notesInput = document.querySelector("#notes-input");
const aiSettings = document.querySelector("#ai-settings");
const modeCallout = document.querySelector("#mode-callout");
const uploadState = document.querySelector("#upload-state");
const generateForm = document.querySelector("#generate-form");
const generateButton = document.querySelector("#generate-button");
const resultShell = document.querySelector("#result-shell");
const statusPill = document.querySelector("#status-pill");

const state = {
  currentImage: null,
  latestResult: null,
};

function assetUrl(relativePath) {
  return new URL(relativePath, import.meta.url);
}

function currentMode() {
  return modeSelect.value;
}

function currentQualityPreset() {
  return qualityPresetSelect.value;
}

function setStatus(text, className = "") {
  statusPill.textContent = text;
  statusPill.className = `status-pill ${className}`.trim();
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function downloadJson(filename, payload) {
  const blob = new Blob([prettyJson(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderUploadState() {
  if (!state.currentImage) {
    uploadState.className = "upload-state";
    uploadState.innerHTML = "<p>No image selected yet.</p>";
    return;
  }

  uploadState.className = "upload-state has-preview";
  uploadState.innerHTML = `
    <img src="${state.currentImage.previewUrl}" alt="Uploaded diagram preview" />
    <div class="upload-meta">
      <strong>${escapeHtml(state.currentImage.name)}</strong>
      <span>${escapeHtml(state.currentImage.dimensions)}</span>
    </div>
    ${
      state.currentImage.isSvg
        ? "<p>This file is an SVG, so the app can try a local direct conversion without any API call.</p>"
        : "<p>This file will use the selected vision model unless you switch to a direct SVG workflow.</p>"
    }
  `;
}

function renderEmptyResult() {
  resultShell.className = "result-shell empty";
  resultShell.innerHTML = `
    <p class="empty-copy">
      Upload an image or load the bundled example, then generate a result.
    </p>
  `;
}

function renderResult() {
  if (!state.latestResult) {
    renderEmptyResult();
    return;
  }

  const { scene, excalidrawFile, previewSvg } = state.latestResult;
  resultShell.className = "result-shell";
  resultShell.innerHTML = `
    <div class="result-header">
      <h3>${escapeHtml(scene.title)}</h3>
      <p>${escapeHtml(scene.summary)}</p>
    </div>

    <div class="result-actions">
      <button id="download-button" class="primary-button" type="button">Download .excalidraw</button>
      <button id="copy-scene-button" class="secondary-button" type="button">Copy scene JSON</button>
    </div>

    <div class="preview-frame">${previewSvg}</div>

    <div class="details-grid">
      <div class="metric-card">
        <strong>Nodes</strong>
        <span>${scene.nodes.length}</span>
      </div>
      <div class="metric-card">
        <strong>Connectors</strong>
        <span>${scene.connectors.length}</span>
      </div>
    </div>

    <details>
      <summary>Normalized scene JSON</summary>
      <pre>${escapeHtml(prettyJson(scene))}</pre>
    </details>

    <details>
      <summary>Generated Excalidraw JSON</summary>
      <pre>${escapeHtml(prettyJson(excalidrawFile))}</pre>
    </details>
  `;

  resultShell.querySelector("#download-button")?.addEventListener("click", () => {
    const slug = scene.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "diagram";
    downloadJson(`${slug}.excalidraw`, excalidrawFile);
  });

  resultShell.querySelector("#copy-scene-button")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(prettyJson(scene));
  });
}

function applyProviderPreset() {
  const preset = providerPresets[providerSelect.value] || providerPresets.openrouter;
  baseUrlInput.value = preset.baseUrl;
  modelInput.value = preset.model;
}

function renderModeState() {
  const mode = currentMode();
  const usesAi = mode !== "svg";
  aiSettings.classList.toggle("hidden", !usesAi);

  if (mode === "svg") {
    modeCallout.innerHTML =
      "<strong>Direct SVG mode:</strong> converts supported SVG shapes locally without sending the file to a provider.";
    return;
  }

  if (mode === "ai") {
    modeCallout.innerHTML =
      "<strong>Vision AI mode:</strong> always sends the uploaded image to the selected provider and ignores the local SVG shortcut.";
    return;
  }

  modeCallout.innerHTML =
    "<strong>Auto mode:</strong> SVG files are converted locally when possible. Raster images go through the vision provider you choose.";
}

function projectOrigin() {
  return window.location.href;
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.readAsDataURL(file);
  });
}

async function loadImageObject(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected file could not be opened as an image."));
    image.src = url;
  });
}

async function fileToPngData(file) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageObject(objectUrl);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is not available in this browser.");
    }

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      previewUrl: await readFileAsDataUrl(file),
      dimensions: `${image.width} × ${image.height}`,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function setCurrentFile(file) {
  const imageData = await fileToPngData(file);
  const isSvg =
    file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  const svgText = isSvg ? await file.text() : null;
  state.currentImage = {
    name: file.name,
    dataUrl: imageData.dataUrl,
    previewUrl: imageData.previewUrl,
    dimensions: imageData.dimensions,
    isSvg,
    svgText,
  };
  renderUploadState();
}

async function loadBundledExample() {
  setStatus("Loading example", "busy");

  try {
    const response = await fetch(assetUrl("./examples/sample-flow.svg"));
    const blob = await response.blob();
    const file = new File([blob], "sample-flow.svg", { type: "image/svg+xml" });
    await setCurrentFile(file);
    setStatus("Idle");
  } catch (error) {
    setStatus("Example failed", "error");
    window.alert(error instanceof Error ? error.message : "Failed to load the bundled example.");
  }
}

async function handleGenerate(event) {
  event.preventDefault();

  if (!state.currentImage) {
    window.alert("Select an image first.");
    return;
  }

  setStatus("Generating", "busy");
  generateButton.disabled = true;

  try {
    const preset = providerPresets[providerSelect.value] || providerPresets.openrouter;
    const mode = currentMode();
    const canUseDirectSvg =
      state.currentImage.isSvg && (mode === "svg" || mode === "auto");
    let requestPayload;

    if (canUseDirectSvg) {
      try {
        requestPayload = {
          scene: normalizeScene(
            extractSceneFromSvg(
              state.currentImage.svgText,
              state.currentImage.name,
            ),
          ),
        };
      } catch (error) {
        if (mode === "svg") {
          throw error;
        }

        if (!apiKeyInput.value.trim()) {
          throw new Error(
            "Local SVG conversion failed and there is no API key available for an AI fallback.",
          );
        }

        requestPayload = null;
      }
    }

    if (!requestPayload) {
      if (!apiKeyInput.value.trim()) {
        throw new Error("Paste an API key first.");
      }

      const extractedSpec = await requestDiagramSpec({
        providerName: preset.label,
        baseUrl: baseUrlInput.value.trim(),
        model: modelInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        qualityPreset: currentQualityPreset(),
        userNotes: notesInput.value.trim(),
        imageDataUrl: state.currentImage.dataUrl,
        refererUrl: projectOrigin(),
        appTitle: "image-to-excalidraw",
      });

      requestPayload = {
        scene: normalizeScene(extractedSpec),
      };
    }

    const refinedScene = refineScene(requestPayload.scene, {
      qualityPreset: currentQualityPreset(),
    });
    state.latestResult = {
      scene: refinedScene,
      excalidrawFile: createExcalidrawFile(refinedScene, {
        attachConnectors: true,
      }),
      previewSvg: renderSceneSvg(refinedScene),
    };
    renderResult();
    setStatus("Ready", "success");
  } catch (error) {
    setStatus("Failed", "error");
    window.alert(error instanceof Error ? error.message : "Generation failed.");
  } finally {
    generateButton.disabled = false;
  }
}

modeSelect.addEventListener("change", renderModeState);
providerSelect.addEventListener("change", applyProviderPreset);
fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files || [];
  if (file) {
    await setCurrentFile(file);
  }
});
loadExampleButton.addEventListener("click", loadBundledExample);
generateForm.addEventListener("submit", handleGenerate);

applyProviderPreset();
renderModeState();
renderUploadState();
renderEmptyResult();
