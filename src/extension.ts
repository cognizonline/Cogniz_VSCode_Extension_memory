import * as vscode from "vscode";
import { ConfigService } from "./services/configService";
import { CognizClient } from "./services/cognizClient";
import { configureConnection } from "./commands/configureConnection";
import { saveSelectedText, saveClipboardText } from "./commands/saveMemory";
import { searchMemories } from "./commands/searchMemories";
import { openDashboard } from "./commands/openDashboard";
import { showConfiguration } from "./commands/showConfig";
import { SidebarProvider } from "./panels/sidebarPanel";
import { logEvent } from "./services/telemetry";

class StatusBarController {
  private readonly item: vscode.StatusBarItem;

  constructor(private readonly configService: ConfigService) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "cognizVs.configureConnection";
    this.item.tooltip = "Configure Cogniz connection";
    this.refresh();
  }

  public refresh(): void {
    if (this.configService.isConfiguredSync()) {
      this.item.text = "$(database) Cogniz";
      this.item.color = undefined;
    } else {
      this.item.text = "$(warning) Cogniz not configured";
      this.item.color = new vscode.ThemeColor("statusBarItem.warningForeground");
    }
    this.item.show();
  }

  public dispose(): void {
    this.item.dispose();
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const configService = new ConfigService(context);
  const cognizClient = new CognizClient(configService);
  const statusBar = new StatusBarController(configService);
  const sidebarProvider = new SidebarProvider(context, cognizClient, configService);

  context.subscriptions.push(statusBar);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("cognizVs.memoryView", sidebarProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cognizVs.configureConnection", async () => {
      const updated = await configureConnection(configService);
      if (updated) {
        statusBar.refresh();
        sidebarProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cognizVs.saveSelection", async () => {
      await saveSelectedText(cognizClient);
      sidebarProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cognizVs.saveClipboard", async () => {
      await saveClipboardText(cognizClient);
      sidebarProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cognizVs.searchMemories", async () => {
      await searchMemories(cognizClient);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cognizVs.openDashboard", async () => {
      await openDashboard(cognizClient);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cognizVs.showConfiguration", async () => {
      await showConfiguration(configService);
    })
  );

  logEvent({ name: "activate" });
}

export function deactivate(): void {
  // nothing to clean up explicitly
}
