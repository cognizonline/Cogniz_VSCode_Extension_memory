import { ConfigService, type CognizSecrets } from "./configService";

export type Skill = {
  skill_id: string;
  name: string;
  description: string;
  category: string;
  access_level: "free" | "premium" | "enterprise";
};

export type SkillExecutionOptions = {
  input: string;
  context?: Record<string, unknown>;
  projectId?: string;
};

export type SkillResult = {
  success: boolean;
  output: string;
  metadata?: {
    execution_time_ms: number;
    tokens_used?: number;
  };
  error?: string;
};

type GlobalWithUndici = typeof globalThis & {
  fetch?: typeof globalThis.fetch;
};

let fetchInitialization: Promise<typeof globalThis.fetch> | undefined;

async function ensureFetch(): Promise<typeof globalThis.fetch> {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch;
  }

  if (!fetchInitialization) {
    fetchInitialization = import("undici")
      .then(module => {
        const { fetch } = module;
        const globalTarget = globalThis as GlobalWithUndici;

        if (typeof globalTarget.fetch !== "function") {
          globalTarget.fetch = fetch as typeof globalTarget.fetch;
        }

        return globalTarget.fetch!;
      })
      .catch(error => {
        fetchInitialization = undefined;
        throw error;
      });
  }

  return fetchInitialization;
}

export class SkillsClient {
  constructor(private readonly configService: ConfigService) {}

  /**
   * List all available skills for the current user
   */
  public async listSkills(): Promise<Skill[]> {
    const config = await this.requireConfig();
    const fetchFn = await ensureFetch();

    const response = await fetchFn(this.buildEndpoint(config, "/cogniz/v1/skills"), {
      method: "GET",
      headers: this.getAuthHeaders(config, false),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load skills: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as { skills?: Skill[] };
    return data.skills || [];
  }

  /**
   * Execute a skill with given input
   */
  public async executeSkill(
    skillId: string,
    options: SkillExecutionOptions
  ): Promise<SkillResult> {
    const config = await this.requireConfig();
    const fetchFn = await ensureFetch();

    const response = await fetchFn(
      this.buildEndpoint(config, `/cogniz/v1/skills/${skillId}/execute`),
      {
        method: "POST",
        headers: this.getAuthHeaders(config, true),
        body: JSON.stringify({
          input: options.input,
          context: options.context,
          project_id: options.projectId || config.projectId,
        }),
      }
    );

    const data = await response.json() as SkillResult;

    if (!response.ok) {
      return {
        success: false,
        output: "",
        error: data.error || "Skill execution failed",
      };
    }

    return data;
  }

  /**
   * Get details about a specific skill
   */
  public async getSkill(skillId: string): Promise<Skill> {
    const config = await this.requireConfig();
    const fetchFn = await ensureFetch();

    const response = await fetchFn(
      this.buildEndpoint(config, `/cogniz/v1/skills/${skillId}`),
      {
        method: "GET",
        headers: this.getAuthHeaders(config, false),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load skill: ${response.statusText} - ${errorText}`);
    }

    return await response.json() as Skill;
  }

  private async requireConfig(): Promise<CognizSecrets> {
    const config = await this.configService.getSecrets();
    if (!config) {
      throw new Error("Cogniz connection not configured. Run 'Cogniz: Configure Connection' first.");
    }
    return config;
  }

  private getAuthHeaders(config: CognizSecrets, includeJson: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      "X-Memory-Platform-Client": "vscode-extension",
      "X-Requested-With": "XMLHttpRequest",
    };
    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }

  private buildEndpoint(config: CognizSecrets, path: string): string {
    const base = config.baseUrl.replace(/\/$/, "");
    const safePath = path.startsWith("/") ? path : `/${path}`;

    if (base.endsWith("/wp-json")) {
      return `${base}${safePath}`;
    }
    return `${base}/wp-json${safePath}`;
  }
}
