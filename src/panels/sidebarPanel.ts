import * as vscode from "vscode";
import { ConfigService, type SelectedProject } from "../services/configService";
import { ConfigurationMissingError, CognizClient, type Project, type MemoryItem } from "../services/cognizClient";

export class SidebarProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly cognizClient: CognizClient,
    private readonly configService: ConfigService
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.view = webviewView;
    const { webview } = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "media"),
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
      ],
    };

    webview.html = this.getHtml(webview);

    webview.onDidReceiveMessage(async message => {
      switch (message?.type) {
        case "refresh":
          console.log("[Cogniz] Refresh button clicked - clearing cache");
          this.cognizClient.forceRefresh();
          await this.refresh();
          console.log("[Cogniz] Refresh complete");
          break;
        case "openDashboard":
          await vscode.commands.executeCommand("cognizVs.openDashboard");
          break;
        case "configure":
          await vscode.commands.executeCommand("cognizVs.configureConnection");
          break;
        case "copy":
          if (typeof message?.content === "string") {
            await vscode.env.clipboard.writeText(message.content);
            void vscode.window.showInformationMessage("Memory copied to clipboard.");
          }
          break;
        case "insert":
          if (typeof message?.content === "string") {
            await this.insertIntoEditor(message.content);
          }
          break;
        case "selectProject":
          if (typeof message?.projectId === "string") {
            const selection: SelectedProject = {
              projectId: message.projectId,
              projectName: typeof message?.projectName === "string" && message.projectName.trim()
                ? message.projectName.trim()
                : undefined,
            };
            await this.configService.setSelectedProject(selection);
            this.cognizClient.forceRefresh();
            await this.refresh();
          }
          break;
        default:
          break;
      }
    });

    return this.refresh();
  }

  public async refresh(): Promise<void> {
    if (!this.view) {
      return;
    }

    const webview = this.view.webview;

    const configured = await this.cognizClient.hasConfiguration();
    if (!configured) {
      webview.postMessage({
        type: "memories",
        payload: {
          configured: false,
          items: [],
          projects: [],
        },
      });
      return;
    }

    const connection = this.configService.getConnection();
    if (!connection) {
      webview.postMessage({
        type: "memories",
        payload: {
          configured: false,
          items: [],
          projects: [],
        },
      });
      return;
    }

    let projects: Project[] = [];
    let projectError: string | undefined;
    try {
      projects = await this.cognizClient.listProjects();
    } catch (error) {
      projectError = error instanceof Error ? error.message : "Unable to load projects.";
      projects = [
        {
          project_id: connection.projectId,
          name: connection.projectName ?? undefined,
        },
      ];
    }

    if (!projects.length) {
      projects = [
        {
          project_id: connection.projectId,
          name: connection.projectName ?? undefined,
        },
      ];
    }

    let active = this.configService.getSelectedProject();
    if (!active?.projectId) {
      active = {
        projectId: connection.projectId,
        projectName: connection.projectName,
      };
      await this.configService.setSelectedProject(active);
    }

    if (!projects.some(project => project.project_id === active?.projectId)) {
      const fallback = projects[0];
      active = {
        projectId: fallback.project_id,
        projectName: fallback.name,
      };
      await this.configService.setSelectedProject(active);
    }

    let items: MemoryItem[] = [];
    let errorMessage: string | undefined;
    try {
      console.log("[Cogniz] Fetching memories for project:", active?.projectId);
      items = await this.cognizClient.listRecentMemories(50, active?.projectId);
      console.log("[Cogniz] Retrieved", items.length, "memories");
    } catch (error) {
      if (error instanceof ConfigurationMissingError) {
        errorMessage = "Configure Cogniz to load memories.";
      } else {
        errorMessage = error instanceof Error ? error.message : "Unable to load memories.";
      }
    }

    webview.postMessage({
      type: "memories",
      payload: {
        configured: true,
        items,
        error: errorMessage,
        projects: projects.map(project => ({
          id: project.project_id,
          name: project.name ?? project.project_id,
        })),
        activeProjectId: active?.projectId ?? connection.projectId,
        activeProjectName: active?.projectName ?? connection.projectName,
        projectError,
      },
    });
  }

  private async insertIntoEditor(content: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showErrorMessage("Open an editor to insert the memory.");
      return;
    }

    await editor.edit(editBuilder => {
      const selection = editor.selection;
      if (selection && !selection.isEmpty) {
        editBuilder.replace(selection, content);
      } else {
        editBuilder.insert(selection.active, content);
      }
    });

    void vscode.window.showInformationMessage("Memory inserted into editor.");
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview", "index.js")
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cogniz Memory</title>
  <style>
    :root { color-scheme: var(--vscode-color-scheme); }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      margin: 0;
      padding: 0;
      background: var(--vscode-sideBar-background);
      color: var(--vscode-foreground);
    }
    .container { display: flex; flex-direction: column; height: 100vh; }
    header {
      padding: 12px 16px 8px;
      border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    header h1 { font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 0.08em; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .controls { display: flex; align-items: center; gap: 8px; }
    .controls select {
      border: 1px solid var(--vscode-editorWidget-border);
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 12px;
      max-width: 220px;
    }
    .controls button {
      border: none;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
    }
    .controls button:hover { background: var(--vscode-button-secondaryHoverBackground); }
    main { overflow-y: auto; padding: 12px 16px 24px; display: flex; flex-direction: column; gap: 12px; }
    .project-error {
      border-radius: 4px;
      border: 1px solid var(--vscode-editorWidget-border);
      padding: 8px 10px;
      font-size: 12px;
      color: var(--vscode-errorForeground);
      display: none;
    }
    .empty-state, .no-data, .error-state {
      border-radius: 6px;
      border: 1px solid var(--vscode-editorWidget-border);
      padding: 16px;
      text-align: center;
    }
    .empty-state { border-style: dashed; }
    .actions { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .actions button {
      border: none;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 4px;
      padding: 6px 10px;
      cursor: pointer;
    }
    .actions button.secondary { background: transparent; border: 1px solid var(--vscode-button-border, var(--vscode-button-background)); color: var(--vscode-foreground); }
    .actions button:hover { background: var(--vscode-button-hoverBackground); }
    .memory-card {
      border-radius: 6px;
      border: 1px solid var(--vscode-editorWidget-border);
      padding: 12px;
      background: var(--vscode-editor-background);
      box-shadow: 0 1px 2px rgba(0,0,0,0.12);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .memory-card h2 { font-size: 13px; margin: 0; line-height: 1.4; }
    .memory-card p { margin: 0; white-space: pre-wrap; word-break: break-word; color: var(--vscode-descriptionForeground); font-size: 12px; }
    .memory-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .memory-tag {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--vscode-editorWidget-border);
      background: var(--vscode-sideBarSectionHeader-background, var(--vscode-editor-background));
      white-space: nowrap;
    }
    .memory-details {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      word-break: break-word;
    }
    .memory-detail a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }
    .memory-detail a:hover {
      text-decoration: underline;
    }
    .memory-actions { display: flex; gap: 6px; margin-top: 8px; }
    .memory-actions button { flex: 1; border: none; border-radius: 4px; padding: 6px; cursor: pointer; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .memory-actions button:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .error-state { color: var(--vscode-errorForeground); display: none; }
    .no-data { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Cogniz Memory</h1>
      <div class="controls">
        <label for="projectSelect" class="sr-only">Project</label>
        <select id="projectSelect"></select>
        <button id="refreshBtn">Refresh</button>
      </div>
    </header>
    <main>
      <div id="projectError" class="project-error"></div>
      <div class="empty-state" id="emptyState">
        <p>Configure Cogniz to see your memories.</p>
        <div class="actions">
          <button id="configureBtn">Configure</button>
          <button id="openDashboardBtn" class="secondary">Open Dashboard</button>
        </div>
      </div>
      <div class="no-data" id="noDataState">
        <p>No memories captured yet. Try saving a selection or searching.</p>
        <div class="actions">
          <button id="openDashboardBtnSecond">Open Dashboard</button>
        </div>
      </div>
      <div class="error-state" id="errorState"></div>
      <div id="memoryList" style="display:none;"></div>
    </main>
  </div>
  <script nonce="${nonce}">
    (function() {
      const globalObj = typeof globalThis !== "undefined" ? globalThis : window;
      if (typeof globalObj.exports === "undefined") {
        globalObj.exports = {};
      }
      if (typeof globalObj.module === "undefined") {
        globalObj.module = { exports: globalObj.exports };
      }
    })();
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}



