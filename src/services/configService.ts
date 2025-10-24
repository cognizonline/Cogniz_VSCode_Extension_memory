import * as vscode from "vscode";

export type CognizConnection = {
  baseUrl: string;
  projectId: string;
  projectName?: string;
};

export type CognizSecrets = CognizConnection & {
  apiKey: string;
};

export type SelectedProject = {
  projectId: string;
  projectName?: string;
};

const SECRET_KEY = "cogniz.apiKey";
const CONNECTION_KEY = "cognizVs.connection";
const HAS_API_KEY_FLAG = "cognizVs.hasApiKey";
const SELECTED_PROJECT_KEY = "cognizVs.selectedProject";
const LEGACY_STATE_BASE_URL = "cogniz.baseUrl";
const LEGACY_STATE_PROJECT_ID = "cogniz.projectId";
const LEGACY_STATE_PROJECT_NAME = "cogniz.projectName";

export class ConfigService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public async getApiKey(): Promise<string | undefined> {
    return await this.context.secrets.get(SECRET_KEY);
  }

  public async setApiKey(value: string): Promise<void> {
    const trimmed = value.trim();
    await this.context.secrets.store(SECRET_KEY, trimmed);
    await this.context.globalState.update(HAS_API_KEY_FLAG, true);
  }

  public async clearApiKey(): Promise<void> {
    await this.context.secrets.delete(SECRET_KEY);
    await this.context.globalState.update(HAS_API_KEY_FLAG, undefined);
  }

  public getConnection(): CognizConnection | undefined {
    const stored = this.context.globalState.get<CognizConnection | undefined>(CONNECTION_KEY);
    if (stored?.baseUrl && stored?.projectId) {
      return stored;
    }

    const baseUrl = this.context.globalState.get<string>(LEGACY_STATE_BASE_URL) || "";
    const projectId = this.context.globalState.get<string>(LEGACY_STATE_PROJECT_ID) || "";
    const projectName = this.context.globalState.get<string>(LEGACY_STATE_PROJECT_NAME) || undefined;

    if (!baseUrl || !projectId) {
      return undefined;
    }

    const connection: CognizConnection = {
      baseUrl,
      projectId,
      projectName,
    };
    void this.context.globalState.update(CONNECTION_KEY, connection);
    return connection;
  }

  public async updateConnection(connection: Partial<CognizConnection>): Promise<void> {
    const existing = this.getConnection() ?? { baseUrl: "", projectId: "" };
    const next: CognizConnection = {
      baseUrl: normalizeBaseUrl(connection.baseUrl ?? existing.baseUrl),
      projectId: (connection.projectId ?? existing.projectId).trim(),
      projectName: connection.projectName?.trim() || existing.projectName,
    };

    await this.context.globalState.update(CONNECTION_KEY, next);
    await this.context.globalState.update(LEGACY_STATE_BASE_URL, next.baseUrl);
    await this.context.globalState.update(LEGACY_STATE_PROJECT_ID, next.projectId);
    await this.context.globalState.update(LEGACY_STATE_PROJECT_NAME, next.projectName);
  }

  public async clearConnection(): Promise<void> {
    await Promise.all([
      this.context.globalState.update(CONNECTION_KEY, undefined),
      this.context.globalState.update(LEGACY_STATE_BASE_URL, undefined),
      this.context.globalState.update(LEGACY_STATE_PROJECT_ID, undefined),
      this.context.globalState.update(LEGACY_STATE_PROJECT_NAME, undefined),
      this.context.globalState.update(SELECTED_PROJECT_KEY, undefined),
      this.clearApiKey(),
    ]);
  }

  public async getSecrets(): Promise<CognizSecrets | undefined> {
    const connection = this.getConnection();
    if (!connection) {
      return undefined;
    }
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return undefined;
    }
    return {
      apiKey,
      ...connection,
    };
  }

  public hasApiKeySync(): boolean {
    return this.context.globalState.get<boolean>(HAS_API_KEY_FLAG) === true;
  }

  public isConfiguredSync(): boolean {
    const connection = this.getConnection();
    return Boolean(connection?.baseUrl && connection?.projectId);
  }

  public getSelectedProject(): SelectedProject | undefined {
    const stored = this.context.globalState.get<SelectedProject | undefined>(SELECTED_PROJECT_KEY);
    if (stored?.projectId) {
      return stored;
    }
    return undefined;
  }

  public async setSelectedProject(project?: SelectedProject): Promise<void> {
    if (!project || !project.projectId.trim()) {
      await this.context.globalState.update(SELECTED_PROJECT_KEY, undefined);
      return;
    }
    await this.context.globalState.update(SELECTED_PROJECT_KEY, {
      projectId: project.projectId.trim(),
      projectName: project.projectName?.trim() || undefined,
    });
  }
}

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/\/+$/, "");
}
