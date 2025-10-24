/* eslint-disable @typescript-eslint/naming-convention */

type ProjectInfo = {
  id: string;
  name?: string;
};

type ConnectionInfo = {
  baseUrl?: string;
  projectId?: string;
  projectName?: string;
};

type MemoryItemPayload = {
  id: string;
  content: string;
  category?: string;
  relevance?: number;
  metadata?: Record<string, unknown>;
  storedAt?: string;
};

type MemoryItemMessage = {
  type: "memories";
  payload: {
    configured: boolean;
    items: MemoryItemPayload[];
    error?: string;
    projectError?: string;
    projects?: ProjectInfo[];
    activeProjectId?: string;
    activeProjectName?: string;
    connection?: ConnectionInfo;
  };
};

 type ConfigResultMessage = {
  type: "configResult";
  payload: {
    success: boolean;
    message: string;
  };
};

type MessageFromExtension = MemoryItemMessage | ConfigResultMessage;

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

const vscode = acquireVsCodeApi();

function post(type: string, payload?: Record<string, unknown>): void {
  vscode.postMessage({ type, ...payload });
}

const refreshBtn = document.getElementById("refreshBtn");
const configureBtn = document.getElementById("configureBtn");
const openDashboardBtn = document.getElementById("openDashboardBtn");
const openDashboardBtnSecond = document.getElementById("openDashboardBtnSecond");
const emptyState = document.getElementById("emptyState");
const noDataState = document.getElementById("noDataState");
const memoryList = document.getElementById("memoryList");
const errorState = document.getElementById("errorState");
const projectSelect = document.getElementById("projectSelect") as HTMLSelectElement | null;
const projectPanel = document.getElementById("projectPanel");
const projectError = document.getElementById("projectError");
const configStatus = document.getElementById("configStatus");
const configSection = document.getElementById("configSection");

const baseUrlInput = document.getElementById("configBaseUrl") as HTMLInputElement | null;
const projectIdInput = document.getElementById("configProjectId") as HTMLInputElement | null;
const projectNameInput = document.getElementById("configProjectName") as HTMLInputElement | null;
const apiKeyInput = document.getElementById("configApiKey") as HTMLInputElement | null;
const saveConfigBtn = document.getElementById("saveConfigBtn");
const clearConfigBtn = document.getElementById("clearConfigBtn");

refreshBtn?.addEventListener("click", () => post("refresh"));
configureBtn?.addEventListener("click", () => focusConfig());
openDashboardBtn?.addEventListener("click", () => post("openDashboard"));
openDashboardBtnSecond?.addEventListener("click", () => post("openDashboard"));
saveConfigBtn?.addEventListener("click", () => {
  const payload = {
    baseUrl: baseUrlInput?.value ?? "",
    projectId: projectIdInput?.value ?? "",
    projectName: projectNameInput?.value ?? "",
    apiKey: apiKeyInput?.value ?? "",
  };
  post("saveConfig", payload);
});
clearConfigBtn?.addEventListener("click", () => post("clearConfig"));

projectSelect?.addEventListener("change", () => {
  if (!projectSelect || projectSelect.disabled) {
    return;
  }
  const value = projectSelect.value;
  const label = projectSelect.options[projectSelect.selectedIndex]?.text ?? "";
  post("selectProject", { projectId: value, projectName: label });
});

window.addEventListener("message", event => {
  const message = event.data as MessageFromExtension;
  if (message?.type === "memories") {
    renderMemories(message.payload);
  } else if (message?.type === "configResult") {
    renderConfigStatus(message.payload);
  }
});

post("refresh");

function focusConfig(): void {
  configSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  baseUrlInput?.focus();
}

function renderConfigStatus(payload: ConfigResultMessage["payload"]): void {
  if (!configStatus) {
    return;
  }
  configStatus.textContent = payload.message;
  configStatus.classList.remove("error", "success", "info");
  configStatus.classList.add(payload.success ? "success" : "error");
}

function renderMemories(payload: MemoryItemMessage["payload"]): void {
  if (!memoryList || !emptyState || !noDataState || !errorState) {
    return;
  }

  updateConfigForm(payload);
  updateProjectSelect(payload);

  if (!payload.configured) {
    emptyState.style.display = "block";
    noDataState.style.display = "none";
    memoryList.style.display = "none";
    errorState.style.display = "none";
    projectPanel?.classList.add("hidden");
    return;
  }

  emptyState.style.display = "none";
  projectPanel?.classList.remove("hidden");
  errorState.textContent = payload.error ?? "";
  errorState.style.display = payload.error ? "block" : "none";

  if (!payload.items.length) {
    noDataState.style.display = "block";
    memoryList.style.display = "none";
    return;
  }

  noDataState.style.display = "none";
  memoryList.style.display = "block";
  memoryList.innerHTML = "";
  payload.items.forEach(item => {
    const metadata = isRecord(item.metadata) ? item.metadata : undefined;

    const card = document.createElement("div");
    card.className = "memory-card";

    const title = document.createElement("h2");
    title.textContent = getMemoryTitle(item, metadata);
    card.appendChild(title);

    const body = document.createElement("p");
    body.textContent = getMemorySnippet(item, metadata);
    card.appendChild(body);

    const tags = document.createElement("div");
    tags.className = "memory-tags";
    addTag(tags, formatCategory(item.category));

    const source = getMetadataString(metadata, ["source", "provider", "origin"]) ?? getContentLabel(item.content, "Source");
    addTag(tags, source);

    const relevance = typeof item.relevance === "number" ? `Score ${item.relevance.toFixed(2)}` : undefined;
    addTag(tags, relevance);

    const storedAtLabel = formatTimestamp(item.storedAt);
    addTag(tags, storedAtLabel);

    if (tags.childElementCount > 0) {
      card.appendChild(tags);
    }

    const details = document.createElement("div");
    details.className = "memory-details";

    const pageTitle = getMetadataString(metadata, ["title", "page_title", "pageTitle"]) ?? getContentLabel(item.content, "Page Title");
    const pageUrl = getMetadataString(metadata, ["page_url", "pageUrl", "url", "link"]) ?? getContentLabel(item.content, "Page URL");

    if (pageTitle && pageTitle !== title.textContent) {
      appendDetail(details, "Page", pageTitle);
    }
    if (pageUrl) {
      appendDetail(details, "Link", pageUrl, true);
    }

    const categoryDetail = formatCategory(item.category);
    if (categoryDetail && !tagsContainsText(tags, categoryDetail)) {
      appendDetail(details, "Category", categoryDetail);
    }

    if (details.childElementCount > 0) {
      card.appendChild(details);
    }

    const actions = document.createElement("div");
    actions.className = "memory-actions";
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => post("copy", { content: item.content }));
    const insertBtn = document.createElement("button");
    insertBtn.textContent = "Insert";
    insertBtn.addEventListener("click", () => post("insert", { content: item.content }));
    actions.appendChild(copyBtn);
    actions.appendChild(insertBtn);
    card.appendChild(actions);

    memoryList.appendChild(card);
  });
}

function updateConfigForm(payload: MemoryItemMessage["payload"]): void {
  const connection = payload.connection ?? {};

  if (baseUrlInput) {
    baseUrlInput.value = connection.baseUrl ?? baseUrlInput.value ?? "";
  }
  if (projectIdInput) {
    projectIdInput.value = connection.projectId ?? projectIdInput.value ?? "";
  }
  if (projectNameInput) {
    projectNameInput.value = connection.projectName ?? projectNameInput.value ?? "";
  }
  if (payload.configured && apiKeyInput) {
    apiKeyInput.placeholder = "(API key stored)";
    apiKeyInput.value = "";
  }
  if (!payload.configured && apiKeyInput) {
    apiKeyInput.placeholder = "Paste your API key";
  }
  if (!payload.configured && configStatus) {
    configStatus.textContent = "Provide your Cogniz connection details to get started.";
    configStatus.classList.remove("error", "success");
    configStatus.classList.add("info");
  }
}

function updateProjectSelect(payload: MemoryItemMessage["payload"]): void {
  if (!projectSelect || !projectError) {
    return;
  }

  const projects = payload.projects ?? [];
  const activeProjectId = payload.activeProjectId ?? "";

  projectSelect.innerHTML = "";

  if (!projects.length) {
    const option = document.createElement("option");
    option.value = activeProjectId;
    option.textContent = (payload.activeProjectName ?? activeProjectId) || "No projects";
    projectSelect.appendChild(option);
    projectSelect.disabled = true;
  } else {
    projectSelect.disabled = false;
    projects.forEach(project => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.name ?? project.id;
      projectSelect.appendChild(option);
    });
    if (activeProjectId) {
      projectSelect.value = activeProjectId;
    }
  }

  projectError.textContent = payload.projectError ?? "";
  projectError.style.display = payload.projectError ? "block" : "none";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMetadataString(
  metadata: Record<string, unknown> | undefined,
  keys: string[]
): string | undefined {
  if (!metadata) {
    return undefined;
  }
  for (const key of keys) {
    const raw = metadata[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
    if (Array.isArray(raw)) {
      const firstString = raw.find(item => typeof item === "string" && item.trim());
      if (typeof firstString === "string") {
        return firstString.trim();
      }
    }
  }
  return undefined;
}

function getContentLabel(content: string, label: string): string | undefined {
  const prefix = `${label}:`;
  const lowerPrefix = prefix.toLowerCase();
  const prefixLength = prefix.length;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith(lowerPrefix)) {
      const value = trimmed.slice(prefixLength).trim();
      if (value.length > 0) {
        return value;
      }
      return undefined;
    }
  }
  return undefined;
}

const EXCLUDED_PREFIXES = [
  "captured selection",
  "captured clipboard",
  "captured memory",
  "page title",
  "page url",
  "source",
  "timestamp",
  "domain",
  "link",
];

function getFilteredContentLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => {
      const lower = line.toLowerCase();
      return !EXCLUDED_PREFIXES.some(prefix => lower.startsWith(prefix));
    });
}

function getMemoryTitle(item: MemoryItemPayload, metadata?: Record<string, unknown>): string {
  const metaTitle =
    getMetadataString(metadata, ["title", "page_title", "pageTitle", "name", "subject"]) ??
    getContentLabel(item.content, "Page Title");
  if (metaTitle) {
    return truncate(metaTitle, 80);
  }

  const lines = getFilteredContentLines(item.content);
  if (lines.length > 0) {
    return truncate(lines[0], 80);
  }
  return truncate(item.content, 80);
}

function getMemorySnippet(item: MemoryItemPayload, metadata?: Record<string, unknown>): string {
  const lines = getFilteredContentLines(item.content);
  if (lines.length === 0) {
    return truncate(item.content, 240);
  }
  const snippet =
    lines.length === 1 ? lines[0] : `${lines[0]} ${lines[1]}`.replace(/\s+/g, " ").trim();
  if (snippet && snippet.length > 0) {
    return truncate(snippet, 240);
  }
  const metaSummary = getMetadataString(metadata, ["summary", "description"]);
  if (metaSummary) {
    return truncate(metaSummary, 240);
  }
  return truncate(item.content, 240);
}

function addTag(container: HTMLElement, value?: string): void {
  if (!value) {
    return;
  }
  const tag = document.createElement("span");
  tag.className = "memory-tag";
  tag.textContent = value;
  container.appendChild(tag);
}

function tagsContainsText(container: HTMLElement, text: string): boolean {
  const target = text.trim().toLowerCase();
  if (!target) {
    return false;
  }
  for (const child of Array.from(container.children)) {
    if (child instanceof HTMLElement) {
      if ((child.textContent ?? "").trim().toLowerCase() === target) {
        return true;
      }
    }
  }
  return false;
}

function appendDetail(container: HTMLElement, label: string, value: string, isLink = false): void {
  if (!value.trim()) {
    return;
  }
  const line = document.createElement("div");
  line.className = "memory-detail";
  if (isLink) {
    line.innerHTML = `${label}: <a href="${value}" target="_blank" rel="noopener">${value}</a>`;
  } else {
    line.textContent = `${label}: ${value}`;
  }
  container.appendChild(line);
}

function formatCategory(category?: string): string | undefined {
  if (!category) {
    return undefined;
  }
  const normalised = category.replace(/[_-]/g, " ").trim();
  if (!normalised) {
    return undefined;
  }
  return normalised.replace(/\b\w/g, char => char.toUpperCase());
}

function formatTimestamp(storedAt?: string): string | undefined {
  if (!storedAt) {
    return undefined;
  }
  const date = new Date(storedAt);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) {
    return "moments ago";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
