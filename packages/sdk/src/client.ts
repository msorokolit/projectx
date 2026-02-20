export interface SdkClientOptions {
  baseUrl: string;
  accessToken?: string;
}

export class OneCClient {
  private readonly baseUrl: string;
  private accessToken?: string;

  constructor(options: SdkClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.accessToken = options.accessToken;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  async login(username: string, password: string): Promise<{ accessToken: string }> {
    const response = await this.request("POST", "/api/auth/login", { username, password });
    this.accessToken = response.accessToken as string;
    return { accessToken: this.accessToken };
  }

  async getMetadata(): Promise<unknown> {
    return this.request("GET", "/api/metadata");
  }

  async createCatalogRecord(catalog: string, payload: Record<string, unknown>): Promise<unknown> {
    return this.request("POST", `/api/catalog/${catalog}`, payload);
  }

  async createDocument(document: string, payload: Record<string, unknown>): Promise<unknown> {
    return this.request("POST", `/api/document/${document}`, payload);
  }

  async postDocument(document: string, id: string): Promise<unknown> {
    return this.request("POST", `/api/document/${document}/${id}/post`);
  }

  private async request(
    method: string,
    path: string,
    payload?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {})
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error((body.message as string | undefined) ?? `Request failed: ${method} ${path}`);
    }
    return body;
  }
}
