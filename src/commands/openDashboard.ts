import * as vscode from "vscode";
import { ConfigurationMissingError, CognizClient } from "../services/cognizClient";

export async function openDashboard(cognizClient: CognizClient): Promise<void> {
  try {
    const url = await cognizClient.getDashboardUrl();
    await vscode.env.openExternal(vscode.Uri.parse(url));
  } catch (error) {
    if (error instanceof ConfigurationMissingError) {
      void vscode.window.showErrorMessage("Configure Cogniz first via 'Cogniz: Configure Connection'.");
      return;
    }
    const message = error instanceof Error ? error.message : "Unable to open Cogniz dashboard";
    void vscode.window.showErrorMessage(message);
  }
}
