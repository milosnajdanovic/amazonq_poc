import { Locator, Page } from "@playwright/test";
import { logStep } from "../utils/logger";

export class TestCasesListPage {
  readonly page: Page;

  private readonly newTestCaseButton: Locator;
  private readonly noContentMessage: Locator;
  private readonly backArrow: Locator;
  private readonly testCaseCards: Locator;
  private readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTestCaseButton = page.getByRole("link", { name: "New Test Case" });
    this.noContentMessage = page.locator(".no-content");
    this.backArrow = page.locator(".navigate-left");
    this.testCaseCards = page.locator("a.preview-card");
    this.successToast = page.locator(".Toastify__toast-body");
  }

  async goto(): Promise<void> {
    logStep("Navigating to Test Cases list page");
    await this.page.goto("/testcases");
  }

  async clickNewTestCase(): Promise<void> {
    logStep("Clicking New Test Case button");
    await this.newTestCaseButton.click();
  }

  async goBack(): Promise<void> {
    logStep("Clicking back arrow to return to dashboard");
    await this.backArrow.click();
  }

  async openTestCaseByTitle(title: string): Promise<void> {
    logStep(`Opening test case: ${title}`);
    await this.testCaseCards
      .filter({ has: this.page.locator(".preview-card-title-value", { hasText: title }) })
      .click();
  }

  async openTestCaseByIndex(index: number): Promise<void> {
    logStep(`Opening test case at index: ${index}`);
    await this.testCaseCards.nth(index).click();
  }

  getTestCaseCardByTitle(title: string): Locator {
    return this.testCaseCards.filter({
      has: this.page.locator(".preview-card-title-value", { hasText: title }),
    });
  }

  getTestCaseCardTitle(index: number): Locator {
    return this.testCaseCards.nth(index).locator(".preview-card-title-value");
  }

  getTestCaseCardDescription(index: number): Locator {
    return this.testCaseCards
      .nth(index)
      .locator(".preview-card-body--items-single")
      .filter({ has: this.page.locator("div", { hasText: "Description:" }) })
      .locator(".preview-card-body--items-single-value");
  }

  getAllTestCaseCards(): Locator {
    return this.testCaseCards;
  }

  getNoContentMessage(): Locator {
    return this.noContentMessage;
  }

  getNewTestCaseButton(): Locator {
    return this.newTestCaseButton;
  }

  getSuccessToast(): Locator {
    return this.successToast;
  }

  /**
   * Extracts the test case ID from the card's href attribute.
   * href format: /edit-testcase/{id}
   */
  async getTestCaseId(index: number): Promise<string> {
    const href = await this.testCaseCards.nth(index).getAttribute("href");
    if (!href) throw new Error(`No href found on test case card at index ${index}`);
    const id = href.split("/edit-testcase/")[1];
    if (!id) throw new Error(`Could not extract ID from href: ${href}`);
    return id;
  }

  async getAllTestCaseIds(): Promise<string[]> {
    const count = await this.testCaseCards.count();
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(await this.getTestCaseId(i));
    }
    return ids;
  }
}
