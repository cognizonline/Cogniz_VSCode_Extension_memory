import { ConfigService, type CognizSecrets, type SelectedProject, normalizeBaseUrl } from "./configService";

type GlobalWithUndici = typeof globalThis & {
  fetch?: typeof globalThis.fetch;
  Headers?: typeof globalThis.Headers;
  Request?: typeof globalThis.Request;
  Response?: typeof globalThis.Response;
};

let fetchInitialization: Promise<typeof globalThis.fetch> | undefined;

async function ensureFetch(): Promise<typeof globalThis.fetch> {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch;
  }

  if (!fetchInitialization) {
    fetchInitialization = import("undici")
      .then(module => {
        const { fetch, Headers, Request, Response } = module;
        const globalTarget = globalThis as GlobalWithUndici;

        if (typeof globalTarget.fetch !== "function") {
          globalTarget.fetch = fetch as typeof globalTarget.fetch;
        }
        if (!globalTarget.Headers && Headers) {
          globalTarget.Headers = Headers as typeof globalTarget.Headers;
        }
        if (!globalTarget.Request && Request) {
          globalTarget.Request = Request as typeof globalTarget.Request;
        }
        if (!globalTarget.Response && Response) {
          globalTarget.Response = Response as typeof globalTarget.Response;
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

export type MemoryItem = {
  id: string;
  content: string;
  category?: string;
  relevance?: number;
  metadata?: Record<string, unknown>;
  storedAt?: string;
};

export type SearchOptions = {
  limit?: number;
  projectId?: string;
};

export type StoreMemoryOptions = {
  category?: string;
  metadata?: Record<string, unknown>;
  projectId?: string;
  projectName?: string;
};

export type Project = {
  project_id: string;
  name?: string;
  description?: string;
};

export class ConfigurationMissingError extends Error {
  constructor() {
    super("Cogniz connection is not configured. Run 'Cogniz: Configure Connection' first.");
    this.name = "ConfigurationMissingError";
  }
}

export class CognizClient {
  private recentCache: MemoryItem[] = [];
  private recentCacheTimestamp = 0;
  private recentCacheProjectId?: string;
  private recentCacheQuery?: string;

  constructor(private readonly configService: ConfigService) {}

  public async hasConfiguration(): Promise<boolean> {
    try {
      const secrets = await this.configService.getSecrets();
      return Boolean(secrets?.apiKey && secrets?.baseUrl && secrets?.projectId);
    } catch {
      return false;
    }
  }

  public async storeMemory(content: string, options?: StoreMemoryOptions): Promise<string> {
    const config = await this.requireConfig();
    const active = this.getActiveProject(config);
    const fetchFn = await ensureFetch();

    const payload = {
      content,
      project_id: options?.projectId ?? active.projectId,
      project_name: options?.projectName ?? active.projectName,
      category: options?.category,
      metadata: options?.metadata,
    };

    const response = await fetchFn(this.buildEndpoint(config, "/memory/v1/store"), {
      method: "POST",
      headers: this.getAuthHeaders(config),
      body: JSON.stringify(payload),
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(this.extractError(raw, response.status, "Failed to store memory"));
    }

    const data = this.parseJson<{ memory_id?: string }>(raw, "Unexpected response from Cogniz.");
    this.invalidateCache();
    return data.memory_id ?? "";
  }

  public async searchMemories(query: string, options?: SearchOptions): Promise<MemoryItem[]> {
    const config = await this.requireConfig();
    const active = this.getActiveProject(config);
    const fetchFn = await ensureFetch();
    const url = new URL(this.buildEndpoint(config, "/memory/v1/search"));
    const projectIdToUse = options?.projectId ?? active.projectId;
    const normalizedQuery = !query || query.trim() === "" ? "*" : query;
    url.searchParams.set("project_id", projectIdToUse);
    url.searchParams.set("query", normalizedQuery);
    const limit = options?.limit ?? 10;
    url.searchParams.set("limit", String(limit));

    console.log("[Cogniz] API Request:", url.toString());

    const response = await fetchFn(url.toString(), {
      method: "GET",
      headers: this.getAuthHeaders(config, false),
    });

    const raw = await response.text();
    console.log("[Cogniz] API Response status:", response.status, "- Body length:", raw.length);
    if (!response.ok) {
      throw new Error(this.extractError(raw, response.status, "Failed to search memories"));
    }

    const data = this.parseJson<{
      results?: Array<{
        memory_id?: string;
        content?: string;
        memory?: string;
        category?: string;
        categories?: string[];
        relevance?: number;
        metadata?: Record<string, unknown>;
        stored_at?: string;
        created_at?: string;
        timestamp?: string;
      }>;
    }>(raw, "Unexpected response from Cogniz while searching.");
    console.log("[Cogniz] API returned", (data.results ?? []).length, "memories from API");
    let items = (data.results ?? []).map<MemoryItem>(item => {
      const text = item.content ?? item.memory ?? "";
      const category = item.category ?? (Array.isArray(item.categories) ? item.categories[0] : undefined);
      const metadata =
        item.metadata && typeof item.metadata === "object"
          ? (item.metadata as Record<string, unknown>)
          : undefined;
      const storedAt =
        typeof item.stored_at === "string"
          ? item.stored_at
          : typeof item.created_at === "string"
          ? item.created_at
          : typeof item.timestamp === "string"
          ? item.timestamp
          : undefined;
      return {
        id: item.memory_id ?? text,
        content: text,
        category,
        relevance: item.relevance,
        metadata,
        storedAt,
      };
    });

    // Deduplicate by content to prevent same memory showing multiple times
    const beforeDedup = items.length;
    items = this.deduplicateMemories(items);
    console.log("[Cogniz] Deduplication:", beforeDedup, "->", items.length, "memories");

    if (normalizedQuery === "*") {
      this.recentCache = items;
      this.recentCacheTimestamp = Date.now();
      this.recentCacheProjectId = projectIdToUse;
      this.recentCacheQuery = normalizedQuery;
      console.log("[Cogniz] Cache updated for project:", projectIdToUse);
    }

    return items;
  }

  public async listRecentMemories(limit = 10, projectId?: string): Promise<MemoryItem[]> {
    const cacheFresh = Date.now() - this.recentCacheTimestamp < 10_000;
    const matchesProject = projectId === this.recentCacheProjectId;
    const matchesQuery = !this.recentCacheQuery || this.recentCacheQuery === "*";

    console.log("[Cogniz] Cache check:", {
      cacheFresh,
      matchesProject,
      matchesQuery,
      cacheSize: this.recentCache.length,
      requestedProject: projectId,
      cachedProject: this.recentCacheProjectId
    });

    if (this.recentCache.length && cacheFresh && matchesProject && matchesQuery) {
      console.log("[Cogniz] Using cached memories");
      return this.recentCache.slice(0, limit);
    }
    console.log("[Cogniz] Fetching fresh memories from API");
    const items = await this.searchMemories("*", { limit, projectId });
    return items.slice(0, limit);
  }

  public forceRefresh(): void {
    console.log("[Cogniz] Force refresh called - invalidating cache");
    this.invalidateCache();
  }

  private deduplicateMemories(items: MemoryItem[]): MemoryItem[] {
    const seen = new Map<string, MemoryItem>();

    for (const item of items) {
      // Create a unique key based on content (first 100 chars to handle duplicates)
      const contentKey = item.content.substring(0, 100).trim().toLowerCase();

      if (!seen.has(contentKey)) {
        seen.set(contentKey, item);
      } else {
        // If we've seen this content before, keep the one with the most recent timestamp
        const existing = seen.get(contentKey);
        if (existing && item.storedAt && existing.storedAt) {
          const existingDate = new Date(existing.storedAt).getTime();
          const itemDate = new Date(item.storedAt).getTime();
          if (itemDate > existingDate) {
            seen.set(contentKey, item);
          }
        }
      }
    }

    return Array.from(seen.values());
  }

  public async listProjects(): Promise<Project[]> {
    const config = await this.requireConfig();
    const fetchFn = await ensureFetch();
    const response = await fetchFn(this.buildEndpoint(config, "/memory/v1/projects"), {
      method: "GET",
      headers: this.getAuthHeaders(config, false),
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(this.extractError(raw, response.status, "Failed to load projects"));
    }

    const data = this.parseJson<
      | Project[]
      | {
        projects?: Project[];
      }
    >(raw, "Unexpected response from Cogniz while loading projects.");
    const rawProjects: Project[] = Array.isArray(data)
      ? data
      : Array.isArray((data as { projects?: Project[] }).projects)
      ? ((data as { projects?: Project[] }).projects as Project[])
      : [];

    const projects = rawProjects
      .map(project => {
        const rawId =
          (project as { project_id?: unknown }).project_id ??
          (project as { id?: unknown }).id;
        const projectId = rawId !== undefined && rawId !== null ? String(rawId) : "";
        const projectName =
          project.name ??
          (project as { project_name?: string }).project_name ??
          undefined;
        const projectDescription =
          project.description ??
          (project as { project_description?: string }).project_description ??
          undefined;
        return {
          project_id: projectId,
          name: projectName,
          description: projectDescription,
        };
      })
      .filter(project => Boolean(project.project_id));

    if (!projects.length) {
      throw new Error("No projects returned by Cogniz.");
    }

    return projects;
  }

  public async getDashboardUrl(): Promise<string> {
    // Always link to cogniz.online dashboard
    return "https://cogniz.online/dashboard";
  }

  private async requireConfig(): Promise<CognizSecrets> {
    const config = await this.configService.getSecrets();
    if (!config) {
      throw new ConfigurationMissingError();
    }
    return config;
  }

  private getActiveProject(config: CognizSecrets): SelectedProject {
    const selected = this.configService.getSelectedProject();
    if (selected?.projectId) {
      return selected;
    }
    return {
      projectId: config.projectId,
      projectName: config.projectName,
    };
  }

  private getAuthHeaders(config: CognizSecrets, includeJson = true): Record<string, string> {
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
    const base = normalizeBaseUrl(config.baseUrl);
    const safePath = path.startsWith("/") ? path : `/${path}`;
    if (base.endsWith("/wp-json")) {
      return `${base}${safePath}`;
    }
    return `${base}/wp-json${safePath}`;
  }

  private invalidateCache(): void {
    this.recentCache = [];
    this.recentCacheTimestamp = 0;
    this.recentCacheProjectId = undefined;
    this.recentCacheQuery = undefined;
  }

  private parseJson<T>(raw: string, fallback: string): T {
    if (!raw) {
      throw new Error(`${fallback}: received an empty response.`);
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error(this.buildInvalidJsonMessage(raw, fallback));
    }
  }

  private extractError(raw: string, status: number, fallback: string): string {
    if (raw) {
      const message = this.extractMessageFromBody(raw);
      if (message) {
        return message;
      }
      const snippet = this.sanitizeBody(raw);
      if (snippet) {
        return `${fallback}: ${snippet}`;
      }
    }
    return `${fallback} (HTTP ${status})`;
  }

  private extractMessageFromBody(raw: string): string | undefined {
    try {
      const data = JSON.parse(raw) as unknown;
      return this.extractMessageFromObject(data);
    } catch {
      return undefined;
    }
  }

  private extractMessageFromObject(data: unknown): string | undefined {
    if (!data || typeof data !== "object") {
      return undefined;
    }
    const obj = data as Record<string, unknown>;
    const candidates = ["message", "error", "detail", "reason", "description"];
    for (const key of candidates) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
      if (Array.isArray(value)) {
        const first = value.find(item => typeof item === "string" && item.trim());
        if (typeof first === "string") {
          return first.trim();
        }
      }
      if (value && typeof value === "object") {
        const nested = this.extractMessageFromObject(value);
        if (nested) {
          return nested;
        }
      }
    }
    return undefined;
  }

  private buildInvalidJsonMessage(raw: string, fallback: string): string {
    const snippet = this.sanitizeBody(raw);
    if (snippet) {
      return `${fallback}: ${snippet}`;
    }
    return `${fallback}: response could not be parsed.`;
  }

  private sanitizeBody(raw: string): string {
    const decoded = this.decodeEntities(raw);
    return decoded
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
  }

  private decodeEntities(value: string): string {
    return value
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, "\"")
      .replace(/&#039;/gi, "'")
      .replace(/&#39;/gi, "'")
      .replace(/&nbsp;/gi, " ");
  }
}

