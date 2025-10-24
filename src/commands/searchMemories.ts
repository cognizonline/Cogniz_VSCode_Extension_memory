import * as vscode from "vscode";
import { CognizClient, ConfigurationMissingError, type MemoryItem } from "../services/cognizClient";
import { logEvent } from "../services/telemetry";

export async function searchMemories(cognizClient: CognizClient): Promise<void> {
  const query = await vscode.window.showInputBox({
    prompt: "Search Cogniz memories",
    placeHolder: "Keywords (leave blank to list recent memories)",
    ignoreFocusOut: true,
  });

  if (query === undefined) {
    return;
  }

  let memories: MemoryItem[] = [];
  try {
    if (!query.trim()) {
      memories = await cognizClient.listRecentMemories(10);
    } else {
      memories = await cognizClient.searchMemories(query.trim(), { limit: 10 });
    }
  } catch (error) {
    if (error instanceof ConfigurationMissingError) {
      void vscode.window.showErrorMessage("Configure Cogniz first via 'Cogniz: Configure Connection'.");
      return;
    }
    const message = error instanceof Error ? error.message : "Failed to search memories";
    void vscode.window.showErrorMessage(message);
    return;
  }

  if (!memories.length) {
    void vscode.window.showInformationMessage("No Cogniz memories were found.");
    return;
  }

  const picks = memories.map(memory => {
    const metadata = isRecord(memory.metadata) ? memory.metadata : undefined;
    const title = deriveMemoryTitle(memory, metadata);
    const snippet = deriveMemorySnippet(memory, metadata);
    const categoryLabel = formatCategory(memory.category);

    return {
      label: truncate(title, 80),
      detail: truncate(snippet, 160),
      description: categoryLabel ? `Category: ${categoryLabel}` : undefined,
      memory,
    };
  });

  const selection = await vscode.window.showQuickPick(picks, {
    placeHolder: "Select a memory to insert",
    matchOnDetail: true,
  });

  if (!selection) {
    return;
  }

  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    const doc = await vscode.workspace.openTextDocument({ content: "" });
    editor = await vscode.window.showTextDocument(doc);
  }

  await editor.edit(editBuilder => {
    const target = editor.selection;
    if (target && !target.isEmpty) {
      editBuilder.replace(target, selection.memory.content);
    } else {
      editBuilder.insert(target.active, selection.memory.content);
    }
  });

  void vscode.window.showInformationMessage("Memory inserted into editor.");
  logEvent({
    name: "insert_memory",
    properties: { queryLength: query.trim().length },
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function deriveMemoryTitle(memory: MemoryItem, metadata?: Record<string, unknown>): string {
  const metaTitle =
    getMetadataString(metadata, ["title", "page_title", "pageTitle", "name", "subject"]) ??
    getContentLabel(memory.content, "Page Title");
  if (metaTitle) {
    return metaTitle;
  }
  const lines = getFilteredContentLines(memory.content);
  if (lines.length > 0) {
    return lines[0];
  }
  return memory.content;
}

function deriveMemorySnippet(memory: MemoryItem, metadata?: Record<string, unknown>): string {
  const lines = getFilteredContentLines(memory.content);
  if (lines.length === 0) {
    const metaSummary = getMetadataString(metadata, ["summary", "description"]);
    return metaSummary ?? memory.content;
  }
  if (lines.length === 1) {
    return lines[0];
  }
  return `${lines[0]} ${lines[1]}`.replace(/\s+/g, " ").trim();
}

function formatCategory(category?: string): string | undefined {
  if (!category) {
    return undefined;
  }
  const normalised = category.replace(/[_-]/g, " " ).trim();
  if (!normalised) {
    return undefined;
  }
  return normalised.replace(/\b\w/g, char => char.toUpperCase());
}
