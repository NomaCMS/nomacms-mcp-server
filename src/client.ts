/**
 * NomaClient - thin HTTP wrapper around the Noma REST API.
 */
export class NomaClient {
  private baseUrl: string;
  private apiKey: string;
  private projectId: string;

  constructor(baseUrl: string, apiKey: string, projectId: string) {
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  private headers(): Record<string, string> {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "project-id": this.projectId,
    };
  }

  private async handleResponse(response: Response): Promise<unknown> {
    const text = await response.text();

    if (!text) {
      // 204 No Content or empty body
      return { success: true, status: response.status };
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        `Noma API returned non-JSON response (${response.status}): ${text.slice(0, 200)}`
      );
    }

    if (!response.ok) {
      const msg =
        (json as Record<string, unknown>)?.message ?? `HTTP ${response.status}`;
      const errors = (json as Record<string, unknown>)?.errors;
      const detail = errors ? `\n${JSON.stringify(errors, null, 2)}` : "";
      throw new Error(`Noma API error: ${msg}${detail}`);
    }

    return json;
  }

  /**
   * Recursively flatten a nested object into bracket-notation query params.
   * e.g. { where: { price: { lt: 50 }, or: [{ tags: "sale" }] } }
   *  → [ ["where[price][lt]", "50"], ["where[or][0][tags]", "sale"] ]
   */
  private flattenParams(
    obj: Record<string, unknown>,
    prefix = ""
  ): [string, string][] {
    const pairs: [string, string][] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      const paramKey = prefix ? `${prefix}[${key}]` : key;

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            pairs.push(
              ...this.flattenParams(
                item as Record<string, unknown>,
                `${paramKey}[${index}]`
              )
            );
          } else {
            pairs.push([`${paramKey}[${index}]`, String(item)]);
          }
        });
      } else if (typeof value === "object") {
        pairs.push(
          ...this.flattenParams(value as Record<string, unknown>, paramKey)
        );
      } else {
        pairs.push([paramKey, String(value)]);
      }
    }

    return pairs;
  }

  async get(
    path: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      const flatPairs = this.flattenParams(params);
      for (const [key, value] of flatPairs) {
        url.searchParams.append(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.headers(),
    });

    return this.handleResponse(response);
  }

  async post(path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse(response);
  }

  async put(path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse(response);
  }

  async patch(path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse(response);
  }

  async delete(path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse(response);
  }

  /**
   * Upload a file via multipart/form-data.
   * Accepts a Buffer, the original filename, and its MIME type.
   */
  async uploadFile(
    path: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<unknown> {
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    const formData = new FormData();
    formData.append("file", blob, filename);

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "project-id": this.projectId,
      // Do NOT set Content-Type — fetch sets it with the boundary automatically
    };

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    return this.handleResponse(response);
  }

  /**
   * Upload multiple files via multipart/form-data under files[].
   */
  async uploadFiles(
    path: string,
    files: Array<{ fileBuffer: Buffer; filename: string; mimeType: string }>
  ): Promise<unknown> {
    const formData = new FormData();

    for (const file of files) {
      const blob = new Blob([new Uint8Array(file.fileBuffer)], { type: file.mimeType });
      formData.append("files[]", blob, file.filename);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "project-id": this.projectId,
      // Do NOT set Content-Type — fetch sets it with the boundary automatically
    };

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    return this.handleResponse(response);
  }
}
