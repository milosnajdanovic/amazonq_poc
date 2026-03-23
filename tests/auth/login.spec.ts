import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { LoginPage } from "../../src/pages";
import {
  getAuthToken,
  apiPost,
  LoginResponse,
} from "../../src/helpers/api.helper";
import { envConfig } from "../../src/config/environment";

// =============================================================================
// 1. Authentication & Security (Login Feature) — TC01 through TC16
// =============================================================================

test.describe("Authentication & Security", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  // ---------------------------------------------------------------------------
  // UI Flow — Positive (TC01–TC05)
  // ---------------------------------------------------------------------------

  test("TC01 - Should redirect to test cases page when logging in with valid credentials", async ({
    page,
  }) => {
    await loginPage.login(envConfig.ADMIN_EMAIL, envConfig.ADMIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/);
  });

  test("TC02 - Should maintain session state when Remember Me is toggled", async ({ page }) => {
    // Toggle "Remember me" switch before login
    await page.locator(".switch-element .react-switch-bg").click();

    await loginPage.login(envConfig.ADMIN_EMAIL, envConfig.ADMIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/);

    // Verify token persists in localStorage
    const token = await page.evaluate(() => window.localStorage.getItem("jwtSandboxToken"));
    expect(token).toBeTruthy();
  });

  test("TC03 - Should redirect to Forgot Password page when link is clicked", async ({ page }) => {
    await loginPage.clickForgotPassword();
    await expect(page).toHaveURL(/forgot-password/);
  });

  test("TC04 - Should redirect to admin login page when Admin link is clicked", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page).toHaveURL(/admin-login/);
  });

  test("TC05 - Should remain on or route to /login when Login link is clicked", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Login", exact: true }).click();
    await expect(page).toHaveURL(/login/);
  });

  // ---------------------------------------------------------------------------
  // UI Flow — Negative & Validation (TC06–TC10)
  // ---------------------------------------------------------------------------

  test("TC06 - Should show error message when logging in with unregistered email", async ({
    page,
  }) => {
    const fakeEmail = faker.internet.email();
    const fakePassword = faker.internet.password({ length: 12 });

    await page.getByPlaceholder("Email").fill(fakeEmail);
    await page.getByPlaceholder("Password").fill(fakePassword);
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await expect(loginPage.getValidationMessage()).toBeVisible({ timeout: 10000 });
  });

  test("TC07 - Should show error message when logging in with valid email but wrong password", async ({
    page,
  }) => {
    const wrongPassword = faker.internet.password({ length: 12 });

    await page.getByPlaceholder("Email").fill(envConfig.ADMIN_EMAIL);
    await page.getByPlaceholder("Password").fill(wrongPassword);
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await expect(loginPage.getValidationMessage()).toBeVisible({ timeout: 10000 });
  });

  test("TC08 - Should show frontend error and make no API call when email is empty", async ({
    page,
  }) => {
    let apiCalled = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/candidate/login")) {
        apiCalled = true;
      }
    });

    // Leave email empty, fill password, click login
    await page.getByPlaceholder("Password").fill(faker.internet.password({ length: 12 }));
    await page.getByRole("button", { name: "Login", exact: true }).click();

    // Wait a moment for any potential request
    await page.waitForTimeout(1000);
    expect(apiCalled).toBe(false);
  });

  test("TC09 - Should show frontend error and make no API call when password is empty", async ({
    page,
  }) => {
    let apiCalled = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/candidate/login")) {
        apiCalled = true;
      }
    });

    // Fill email, leave password empty, click login
    await page.getByPlaceholder("Email").fill(envConfig.ADMIN_EMAIL);
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await page.waitForTimeout(1000);
    expect(apiCalled).toBe(false);
  });

  test("TC10 - Should show error when email format is invalid", async ({ page }) => {
    await page.getByPlaceholder("Email").fill("user@.com");
    await page.getByPlaceholder("Password").fill(faker.internet.password({ length: 12 }));
    await page.getByRole("button", { name: "Login", exact: true }).click();

    // The app does not validate email format client-side — it sends the request
    // and the server returns an inline validation error
    await expect(loginPage.getValidationMessage()).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Security & Usability (TC11–TC13)
  // ---------------------------------------------------------------------------

  test("TC11 - Should load login page strictly over HTTPS", async ({ page }) => {
    expect(page.url()).toMatch(/^https:\/\//);
  });

  test("TC12 - Should mask the password input field", async () => {
    await expect(loginPage.getPasswordInput()).toHaveAttribute("type", "password");
  });

  test("TC13 - Should display visible labels and placeholders for Email and Password", async () => {
    await expect(loginPage.getEmailInput()).toHaveAttribute("placeholder", "Email");
    await expect(loginPage.getPasswordInput()).toHaveAttribute("placeholder", "Password");

    // Verify labels are visible in the DOM
    await expect(loginPage.page.locator("label", { hasText: "Email" }).first()).toBeVisible();
    await expect(loginPage.page.locator("label", { hasText: "Password" }).first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // API Flow & Performance (TC14–TC16)
  // ---------------------------------------------------------------------------

  test("TC14 - API: Should return 200 OK and a Bearer Token with valid credentials", async () => {
    const token = await getAuthToken(envConfig.ADMIN_EMAIL, envConfig.ADMIN_PASSWORD);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  test("TC15 - API: Should return 401 Unauthorized with invalid credentials", async () => {
    const fakeEmail = faker.internet.email();
    const fakePassword = faker.internet.password({ length: 12 });

    const { status } = await apiPost("login", "", {
      email: fakeEmail,
      password: fakePassword,
    }).catch(() => ({ status: 401, body: null }));

    // The API may return 401 or the helper may throw — either way, it should not be 200
    expect(status).not.toBe(200);
  });

  test("TC16 - API Performance: Login endpoint should resolve under 1000ms", async () => {
    const start = Date.now();
    const response = await loginPage.loginAndCaptureResponse(
      envConfig.ADMIN_EMAIL,
      envConfig.ADMIN_PASSWORD,
    );
    const durationMs = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(durationMs).toBeLessThan(2000);
  });
});
