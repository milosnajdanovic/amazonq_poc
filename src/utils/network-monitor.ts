import { Page } from "@playwright/test";
import { logApiResponse } from "./logger";

const DEFAULT_THRESHOLD_MS = 2000;

interface NetworkEntry {
  method: string;
  url: string;
  status: number;
  durationMs: number;
}

export class NetworkMonitor {
  private entries: NetworkEntry[] = [];
  private thresholdMs: number;

  constructor(thresholdMs = DEFAULT_THRESHOLD_MS) {
    this.thresholdMs = thresholdMs;
  }

  attach(page: Page): void {
    page.on("response", async (response) => {
      const request = response.request();
      const timing = response.request().timing();
      const durationMs = timing.responseEnd > 0 ? Math.round(timing.responseEnd) : -1;
      const method = request.method();
      const url = request.url();
      const status = response.status();

      const entry: NetworkEntry = { method, url, status, durationMs };
      this.entries.push(entry);
      logApiResponse(method, url, status, durationMs);
    });
  }

  getSlowRequests(): NetworkEntry[] {
    return this.entries.filter((e) => e.durationMs > this.thresholdMs);
  }

  getFailedRequests(): NetworkEntry[] {
    return this.entries.filter((e) => e.status >= 400);
  }

  getEntries(): NetworkEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}
