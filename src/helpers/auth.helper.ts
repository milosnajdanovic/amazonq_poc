import { BrowserContext } from "@playwright/test";
import { getAuthToken } from "./api.helper";
import { logStep } from "../utils/logger";
import { envConfig } from "../config/environment";

export async function injectAuthState(context: BrowserContext): Promise<string> {
  const email = envConfig.ADMIN_EMAIL;
  const password = envConfig.ADMIN_PASSWORD;

  logStep("Authenticating via API and injecting token into browser context");
  const token = await getAuthToken(email, password);

  // Set the Authorization header for all subsequent API requests made by the browser
  await context.setExtraHTTPHeaders({
    Authorization: `Bearer ${token}`,
  });

  // Inject token into localStorage so the SPA picks it up on page load
  await context.addInitScript((tkn: string) => {
    window.localStorage.setItem("jwtSandboxToken", tkn);
  }, token);

  return token;
}
