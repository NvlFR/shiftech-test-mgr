import type { ServerConfig } from "../config.js";
import {
  AuthenticationError,
  type AuthenticatedToken,
  type AuthRepository,
} from "../repositories/authRepository.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ProjectScopeError extends Error {
  constructor() {
    super("Cross-project access is forbidden");
    this.name = "ProjectScopeError";
  }
}

export class ProjectSession {
  readonly projectId: string;
  readonly tokenId: string;
  readonly scopes: ReadonlySet<string>;

  constructor(config: ServerConfig, identity: AuthenticatedToken) {
    if (identity.projectId !== config.projectId) {
      throw new ProjectScopeError();
    }

    this.projectId = config.projectId;
    this.tokenId = identity.tokenId;
    this.scopes = new Set(identity.scopes);
  }

  assertProject(projectId: string): void {
    if (projectId !== this.projectId) {
      throw new ProjectScopeError();
    }
  }

  assertToolArguments(arguments_: unknown): void {
    this.inspectProjectReferences(arguments_);
  }

  private inspectProjectReferences(value: unknown): void {
    if (Array.isArray(value)) {
      for (const item of value) this.inspectProjectReferences(item);
      return;
    }

    if (!value || typeof value !== "object") return;

    for (const [key, nestedValue] of Object.entries(value)) {
      if ((key === "project_id" || key === "projectId") && typeof nestedValue === "string") {
        this.assertProject(nestedValue);
      }
      this.inspectProjectReferences(nestedValue);
    }
  }
}

export class AuthService {
  constructor(
    private readonly config: ServerConfig,
    private readonly repository: AuthRepository,
  ) {}

  async createSession(): Promise<ProjectSession> {
    if (!UUID_PATTERN.test(this.config.projectId)) {
      throw new AuthenticationError("TM_PROJECT_ID must be a valid UUID");
    }

    const identity = await this.repository.authenticate();
    return new ProjectSession(this.config, identity);
  }
}
