import * as vscode from "vscode";
import { ConfigService } from "../services/configService";

export async function showConfiguration(configService: ConfigService): Promise<void> {
  const connection = configService.getConnection();
  const apiKey = await configService.getApiKey();

  const lines: string[] = [];
  lines.push(`Configured: ${configService.isConfiguredSync()}`);
  if (connection) {
    lines.push(`Base URL: ${connection.baseUrl || "<empty>"}`);
    lines.push(`Project ID: ${connection.projectId || "<empty>"}`);
    lines.push(`Project Name: ${connection.projectName || "<none>"}`);
  } else {
    lines.push("Connection: <not set>");
  }
  lines.push(`API key stored: ${apiKey ? "yes" : "no"}`);

  void vscode.window.showInformationMessage(lines.join("\n"));
}
