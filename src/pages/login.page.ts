import { Locator, Page, Response } from "@playwright/test";
import { logStep } from "../utils/logger";

export class LoginPage {
  readonly page: Page;

  // --- Locators (rules.md §2: user-facing first, CSS fallback only) ---

  // Level 1 – getByRole / getByLabel / getByPlaceholder (user-facing)
  // The form uses <input placeholder="Email"> with <label>Email*</label> but
  // the label is not programmatically associated (no `for` attr), so getByLabel
  // won't work. getByPlaceholder is the next best user-facing option.
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;

  // <button class="full-width-btn">Login</button> — getByRole("button") works.
  // exact:true distinguishes it from the <a>Login</a> nav link.
  private readonly loginButton: Locator;

  // Toast notification uses role="alert" via Toastify
  private readonly toastMessage: Locator;

  // Inline validation label shown on login failure
  private readonly validationMessage: Locator;

  // These may not exist on all app versions — kept for test plan coverage
  private readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // User-facing locators (Level 1)
    this.emailInput = page.getByPlaceholder("Email");
    this.passwordInput = page.getByPlaceholder("Password");
    this.loginButton = page.getByRole("button", { name: "Login", exact: true });
    this.forgotPasswordLink = page.getByRole("link", { name: "Forgot Password" });
    this.toastMessage = page.getByRole("alert");
    this.validationMessage = page.locator("#validation-msg");
  }

  // --- Navigation ---

  async goto(): Promise<void> {
    logStep("Navigating to login page");
    await this.page.goto("/login");
  }

  // --- Actions ---

  async login(email: string, password: string): Promise<void> {
    logStep(`Logging in as ${email}`);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL("**/dashboard");
  }

  /**
   * Performs login while intercepting the login API response.
   * Useful for TC16 (performance) — returns the response for timing assertions.
   */
  async loginAndCaptureResponse(email: string, password: string): Promise<Response> {
    logStep(`Logging in as ${email} (capturing API response)`);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    const [response] = await Promise.all([
      this.page.waitForResponse("**/api/candidate/login"),
      this.loginButton.click(),
    ]);

    return response;
  }

  async clickForgotPassword(): Promise<void> {
    logStep("Clicking Forgot Password link");
    await this.forgotPasswordLink.click();
  }

  // --- Element accessors (for assertions in spec files) ---

  getEmailInput(): Locator {
    return this.emailInput;
  }

  getPasswordInput(): Locator {
    return this.passwordInput;
  }

  getLoginButton(): Locator {
    return this.loginButton;
  }

  getToastMessage(): Locator {
    return this.toastMessage;
  }

  getValidationMessage(): Locator {
    return this.validationMessage;
  }
}
