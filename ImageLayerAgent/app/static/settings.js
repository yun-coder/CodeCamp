const form = document.querySelector("#settingsForm");
const statusBox = document.querySelector("#settingsStatus");

const fieldNames = [
  "ocr_provider",
  "paddleocr_base_url",
  "paddleocr_model",
  "paddleocr_request_timeout",
  "paddleocr_poll_timeout",
  "paddleocr_use_doc_orientation_classify",
  "paddleocr_use_doc_unwarping",
  "paddleocr_use_chart_recognition",
  "paddleocr_prompt",
  "sam2_enabled",
  "sam2_model_cfg",
  "sam2_checkpoint",
  "openai_base_url",
  "openai_model",
  "openai_api_mode",
  "openai_request_timeout",
  "openai_vision_plan_enabled",
  "openai_vision_model",
  "openai_image_edit_enabled",
  "image_edit_provider",
  "openai_image_model",
  "openai_image_quality",
  "custom_image_edit_endpoint",
  "custom_image_edit_model",
  "qwen_vl_endpoint",
  "flux_kontext_endpoint",
];

function setStatus(text) {
  statusBox.textContent = text;
}

function getField(name) {
  return form.elements.namedItem(name);
}

function setField(name, value) {
  const field = getField(name);
  if (!field) return;
  if (field.type === "checkbox") {
    field.checked = Boolean(value);
  } else {
    field.value = value ?? "";
  }
}

function readField(name) {
  const field = getField(name);
  if (!field) return null;
  if (field.type === "checkbox") return field.checked;
  if (field.type === "number") return Number(field.value || 0);
  return field.value.trim() || null;
}

function applySecretPlaceholder(name, configured) {
  const field = getField(name);
  if (!field) return;
  field.placeholder = configured ? "已保存，留空不修改" : "";
}

function resetSecretField(name, clearName, configured) {
  const field = getField(name);
  const clearField = getField(clearName);
  if (field) field.value = "";
  if (clearField) clearField.checked = false;
  applySecretPlaceholder(name, configured);
}

async function loadSettings() {
  const response = await fetch("/api/settings");
  if (!response.ok) throw new Error(await response.text());
  const settings = await response.json();
  for (const name of fieldNames) {
    setField(name, settings[name]);
  }
  applySecretPlaceholder("paddleocr_access_token", settings.paddleocr_access_token_configured);
  applySecretPlaceholder("openai_api_key", settings.openai_api_key_configured);
  applySecretPlaceholder("custom_image_edit_api_key", settings.custom_image_edit_api_key_configured);
}

async function saveSettings(event) {
  event.preventDefault();
  setStatus("正在保存...");
  const payload = {};
  for (const name of fieldNames) {
    payload[name] = readField(name);
  }
  payload.paddleocr_access_token = getField("paddleocr_access_token").value.trim() || null;
  payload.clear_paddleocr_access_token = getField("clear_paddleocr_access_token").checked;
  payload.openai_api_key = getField("openai_api_key").value.trim() || null;
  payload.clear_openai_api_key = getField("clear_openai_api_key").checked;
  payload.custom_image_edit_api_key = getField("custom_image_edit_api_key").value.trim() || null;
  payload.clear_custom_image_edit_api_key = getField("clear_custom_image_edit_api_key").checked;

  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  const settings = await response.json();
  resetSecretField("paddleocr_access_token", "clear_paddleocr_access_token", settings.paddleocr_access_token_configured);
  resetSecretField("openai_api_key", "clear_openai_api_key", settings.openai_api_key_configured);
  resetSecretField(
    "custom_image_edit_api_key",
    "clear_custom_image_edit_api_key",
    settings.custom_image_edit_api_key_configured,
  );
  setStatus("已保存");
}

form.addEventListener("submit", (event) => {
  saveSettings(event).catch((error) => {
    setStatus(`保存失败：${error.message}`);
  });
});

loadSettings().catch((error) => {
  setStatus(`加载失败：${error.message}`);
});
