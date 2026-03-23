import { test as base, Page, BrowserContext } from "@playwright/test";
import { injectAuthState } from "../helpers/auth.helper";
import { NetworkMonitor } from "../utils/network-monitor";
import { envConfig } from "../config/environment";

type CustomFixtures = {
  authenticatedPage: Page;
  authToken: string;
  networkMonitor: NetworkMonitor;
};

export const test = base.extend<CustomFixtures>({
  authToken: async ({}, use) => {
    const { getAuthToken } = await import("../helpers/api.helper");
    const token = await getAuthToken(envConfig.ADMIN_EMAIL, envConfig.ADMIN_PASSWORD);
    await use(token);
  },

  authenticatedPage: async ({ context, page }, use) => {
    await injectAuthState(context);
    await use(page);
  },

  networkMonitor: async ({ page }, use) => {
    const monitor = new NetworkMonitor();
    monitor.attach(page);
    await use(monitor);
  },
});

export { expect } from "@playwright/test";
