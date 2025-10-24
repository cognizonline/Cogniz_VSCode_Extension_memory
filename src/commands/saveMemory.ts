import * as vscode from "vscode";
import { basename } from "path";
import { CognizClient, ConfigurationMissingError } from "../services/cognizClient";
import { logEvent } from "../services/telemetry";

type Metadata = Record<string, unknown>;

async function storeMemoryWithFeedback(
  cognizClient: CognizClient,
  payload: string,
  metadata: Metadata,
  telemetryName: string,
  telemetryProps?: Record<string, unknown>
): Promise<void> {
  try {
    const memoryId = await cognizClient.storeMemory(payload, {
      metadata,
    });
    void vscode.window.showInformationMessage(`Saved to Cogniz${memoryId ? ` (#${memoryId})` : ""}.`);
    logEvent({
      name: telemetryName,
      properties: {
        hasMemoryId: Boolean(memoryId),
        ...telemetryProps,
      },
    });
  } catch (error) {
    if (error instanceof ConfigurationMissingError) {
      void vscode.window.showErrorMessage("Configure Cogniz first via 'Cogniz: Configure Connection'.");
      return;
    }
    const message = error instanceof Error ? error.message : "Failed to store memory";
    void vscode.window.showErrorMessage(message);
  }
}

export async function saveSelectedText(cognizClient: CognizClient): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showErrorMessage("No active editor. Open a file to capture a memory.");
    return;
  }

  const selection = editor.selection;
  const selectedText = editor.document.getText(selection).trim();
  if (!selectedText) {
    void vscode.window.showInformationMessage("Select some text before running this command.");
    return;
  }

  const filePath = editor.document.uri;
  const fileName = basename(filePath.fsPath);
  const relativePath = vscode.workspace.asRelativePath(filePath, false);
  const language = editor.document.languageId;

  const timestamp = new Date().toISOString();
  const header = `Source: ${relativePath || fileName}`;
  const languageLine = language ? `Language: ${language}` : undefined;
  const captured = `Captured: ${timestamp}`;

  const parts = [
    "Captured Selection:",
    selectedText,
    "",
    header,
    captured,
  ];
  if (languageLine) {
    parts.splice(3, 0, languageLine);
  }

  const payload = parts.join("\n");

  const metadata: Metadata = {
    provider: "vscode",
    origin: "selection",
  };
  if (relativePath || fileName) {
    metadata.file = relativePath || fileName;
  }
  if (language) {
    metadata.language = language;
  }

  await storeMemoryWithFeedback(cognizClient, payload, metadata, "store_memory", { origin: "selection" });
}

export async function saveClipboardText(cognizClient: CognizClient): Promise<void> {
  let clipboardText = await vscode.env.clipboard.readText();
  clipboardText = clipboardText.trim();

  if (!clipboardText) {
    void vscode.window.showInformationMessage("Clipboard is empty or contains only whitespace.");
    return;
  }

  const sourceInput = await vscode.window.showInputBox({
    prompt: "Optional: label the clipboard source (stored with the memory)",
    placeHolder: "e.g. Claude Code response, browser note",
    ignoreFocusOut: true,
  });

  if (sourceInput === undefined) {
    return;
  }

  const sourceLabel = sourceInput.trim() || "Clipboard";
  const timestamp = new Date().toISOString();
  const header = `Source: ${sourceLabel}`;
  const captured = `Captured: ${timestamp}`;

  const parts = [
    "Captured Clipboard:",
    clipboardText,
    "",
    header,
    captured,
  ];
  const payload = parts.join("\n");

  const metadata: Metadata = {
    provider: "vscode",
    origin: "clipboard",
  };
  if (sourceLabel) {
    metadata.source = sourceLabel;
  }

  await storeMemoryWithFeedback(cognizClient, payload, metadata, "store_memory_clipboard", { origin: "clipboard" });
}
