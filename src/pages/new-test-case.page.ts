import { Locator, Page } from "@playwright/test";
import { logStep } from "../utils/logger";

export interface TestCaseFormData {
  title: string;
  description?: string;
  expectedResult: string;
  testSteps: string[];
  automated?: boolean;
}

export class NewTestCasePage {
  readonly page: Page;

  // --- Locators (rules.md §2: user-facing first, CSS fallback only) ---

  // Level 1 – getByLabel: The form has <label class="form-element--label">Title*</label>
  // but labels are NOT programmatically associated to inputs (no `for`/`id` pairing),
  // so getByLabel won't work. Falling to getByPlaceholder (still user-facing).
  private readonly titleInput: Locator;
  private readonly expectedResultInput: Locator;

  // <textarea placeholder="Description"> — getByPlaceholder works for textareas too
  private readonly descriptionInput: Locator;

  // Level 1 – getByRole: <button class="btn btn-primary float-right">Submit</button>
  private readonly submitButton: Locator;

  // Level 3 – CSS fallback: "Add Test Step" is a <div>, not a <button> or <a>,
  // so no semantic role exists. getByText would match but is fragile across the page.
  // Using class selector scoped to the specific component.
  private readonly addTestStepButton: Locator;

  // Level 3 – CSS fallback: The Automated toggle is a react-switch component.
  // The actual <input type="checkbox" role="switch"> is visually hidden (clip: rect(0,0,0,0)).
  // Clicks must target the visible .react-switch-bg container.
  private readonly automatedSwitch: Locator;

  // Level 3 – CSS fallback: Back arrow is a plain <a> with an icon, no accessible name.
  private readonly backArrow: Locator;

  // Toast notification uses role="alert" via Toastify
  private readonly toastMessage: Locator;

  // Inline validation label shown on form errors
  private readonly validationMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // User-facing locators (Level 1)
    this.titleInput = page.getByPlaceholder("Title");
    this.descriptionInput = page.getByPlaceholder("Description");
    this.expectedResultInput = page.getByPlaceholder("Expected Result");
    this.submitButton = page.getByRole("button", { name: "Submit" });
    this.toastMessage = page.getByRole("alert");
    this.validationMessage = page.locator("#validation-msg");

    // CSS fallback locators (Level 3) — justified above
    this.addTestStepButton = page.locator(".full-width-btn--label", { hasText: "Add Test Step" });
    this.automatedSwitch = page.locator(".switch-element .react-switch-bg");
    this.backArrow = page.locator(".navigate-left");
  }

  // --- Navigation ---

  async goto(): Promise<void> {
    logStep("Navigating to New Test Case page");
    await this.page.goto("/new-testcase");
  }

  // --- Individual field actions ---

  async fillTitle(title: string): Promise<void> {
    logStep(`Filling title: ${title}`);
    await this.titleInput.fill(title);
  }

  async fillDescription(description: string): Promise<void> {
    logStep(`Filling description: ${description}`);
    await this.descriptionInput.fill(description);
  }

  async fillExpectedResult(result: string): Promise<void> {
    logStep(`Filling expected result: ${result}`);
    await this.expectedResultInput.fill(result);
  }

  /**
   * Fills an existing test step input by its index.
   * Step 0 is always present by default on page load.
   */
  async fillTestStep(step: string, index = 0): Promise<void> {
    logStep(`Filling test step ${index}: ${step}`);
    await this.page.locator(`input#step-${index}`).fill(step);
  }

  async addTestStep(): Promise<void> {
    logStep("Clicking Add Test Step");
    await this.addTestStepButton.click();
  }

  /**
   * Adds a new test step input and fills it.
   * Use this for steps beyond the default step-0.
   */
  async addAndFillTestStep(step: string): Promise<void> {
    await this.addTestStep();
    const count = await this.getAllTestStepInputs().count();
    await this.fillTestStep(step, count - 1);
  }

  async toggleAutomated(): Promise<void> {
    logStep("Toggling Automated switch");
    await this.automatedSwitch.click();
  }

  async submit(): Promise<void> {
    logStep("Submitting test case form");
    await this.submitButton.click();
  }

  async goBack(): Promise<void> {
    logStep("Clicking back arrow to return to Test Cases list");
    await this.backArrow.click();
  }

  // --- Convenience method: fill entire form and submit ---

  /**
   * Creates a test case by filling all fields and submitting.
   * Encapsulates the full creation flow for use in beforeEach or hybrid setup.
   */
  async createTestCase(data: TestCaseFormData): Promise<void> {
    logStep(`Creating test case: ${data.title}`);

    await this.fillTitle(data.title);

    if (data.description) {
      await this.fillDescription(data.description);
    }

    await this.fillExpectedResult(data.expectedResult);

    // Fill the default step-0, then add additional steps
    for (let i = 0; i < data.testSteps.length; i++) {
      if (i === 0) {
        await this.fillTestStep(data.testSteps[i], 0);
      } else {
        await this.addAndFillTestStep(data.testSteps[i]);
      }
    }

    if (data.automated) {
      await this.toggleAutomated();
    }

    await this.submit();
  }

  // --- Element accessors (for assertions in spec files) ---

  getTitleInput(): Locator {
    return this.titleInput;
  }

  getDescriptionInput(): Locator {
    return this.descriptionInput;
  }

  getExpectedResultInput(): Locator {
    return this.expectedResultInput;
  }

  getSubmitButton(): Locator {
    return this.submitButton;
  }

  getTestStepInput(index = 0): Locator {
    return this.page.locator(`input#step-${index}`);
  }

  getAllTestStepInputs(): Locator {
    return this.page.locator("input[id^='step-']");
  }

  getToastMessage(): Locator {
    return this.toastMessage;
  }

  getValidationMessage(): Locator {
    return this.validationMessage;
  }

  getAddTestStepButton(): Locator {
    return this.addTestStepButton;
  }
}
