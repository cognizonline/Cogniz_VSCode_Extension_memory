import * as vscode from "vscode";
import { ConfigService } from "../services/configService";
import { logEvent } from "../services/telemetry";

export async function configureConnection(configService: ConfigService): Promise<boolean> {
  const existing = configService.getConnection();
  const hasExistingKey = configService.hasApiKeySync();

  const baseUrl = await vscode.window.showInputBox({
    prompt: "Enter the Cogniz base URL (e.g. https://cogniz.online)",
    placeHolder: "https://example.com",
    value: existing?.baseUrl ?? "",
    ignoreFocusOut: true,
  });
  if (baseUrl === undefined) {
    return false;
  }
  if (!baseUrl.trim()) {
    void vscode.window.showErrorMessage("Base URL is required.");
    return false;
  }

  const projectId = await vscode.window.showInputBox({
    prompt: "Enter the default Cogniz project ID",
    value: existing?.projectId ?? "",
    ignoreFocusOut: true,
  });
  if (projectId === undefined) {
    return false;
  }
  if (!projectId.trim()) {
    void vscode.window.showErrorMessage("Project ID is required.");
    return false;
  }

  const projectName = await vscode.window.showInputBox({
    prompt: "Optional project name (for display)",
    value: existing?.projectName ?? "",
    ignoreFocusOut: true,
  });
  if (projectName === undefined) {
    return false;
  }

  const apiKeyInput = await vscode.window.showInputBox({
    prompt: hasExistingKey
      ? "Enter your Cogniz API key/token (leave blank to keep existing)"
      : "Enter your Cogniz API key/token",
    password: true,
    placeHolder: hasExistingKey ? "Leave blank to keep current key" : undefined,
    ignoreFocusOut: true,
  });
  if (apiKeyInput === undefined) {
    return false;
  }

  if (!apiKeyInput.trim() && !hasExistingKey) {
    void vscode.window.showErrorMessage("API key is required.");
    return false;
  }

  try {
    await configService.updateConnection({
      baseUrl,
      projectId,
      projectName: projectName || undefined,
    });

    if (apiKeyInput.trim()) {
      await configService.setApiKey(apiKeyInput.trim());
    }

    void vscode.window.showInformationMessage("Cogniz connection saved.");
    logEvent({
      name: "configure_connection",
      properties: { hasProjectName: Boolean(projectName?.trim()) },
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save connection";
    void vscode.window.showErrorMessage(message);
    return false;
  }
}
