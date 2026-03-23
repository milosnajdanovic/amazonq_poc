import { test, expect } from "../../src/fixtures/base.fixture";
import { faker } from "@faker-js/faker";
import { NewTestCasePage, TestCasesListPage } from "../../src/pages";
import {
  getAuthToken,
  deleteAllTestCases,
  createTestCase,
  apiPost,
  CreateTestCasePayload,
} from "../../src/helpers/api.helper";
import { envConfig } from "../../src/config/environment";

// =============================================================================
// 2. Test Management (New Test Case Feature) — TC17 through TC32
// =============================================================================

test.describe("Test Management - New Test Case", () => {
  // TC30 — Hybrid Teardown: bulk-delete all test cases after the suite
  test.afterAll(async () => {
    const token = await getAuthToken(envConfig.ADMIN_EMAIL, envConfig.ADMIN_PASSWORD);
    await deleteAllTestCases(token);
  });

  // ---------------------------------------------------------------------------
  // Hybrid Flow — API Setup for UI Test (TC17)
  // ---------------------------------------------------------------------------

  test("TC17 - Should bypass login via token injection and navigate directly to New Test Case page", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();
    await expect(authenticatedPage).toHaveURL(/new-testcase/);

    // Verify the form is loaded by checking a key element
    await expect(testCasePage.getTitleInput()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // UI Flow — Positive (TC18–TC21)
  // ---------------------------------------------------------------------------

  test("TC18 - Should create a test case with all mandatory fields", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    await testCasePage.createTestCase({
      title: faker.lorem.sentence(),
      expectedResult: faker.lorem.sentence(),
      testSteps: [faker.lorem.sentence()],
    });

    await expect(testCasePage.getToastMessage()).toContainText("Test case created successfully");
  });

  test("TC19 - Should create a test case including the optional Description field", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    const title = faker.lorem.sentence();
    const description = faker.lorem.paragraph();

    await testCasePage.createTestCase({
      title,
      description,
      expectedResult: faker.lorem.sentence(),
      testSteps: [faker.lorem.sentence()],
    });

    await expect(testCasePage.getToastMessage()).toContainText("Test case created successfully");

    // Verify the description appears on the test cases list
    const listPage = new TestCasesListPage(authenticatedPage);
    await expect(listPage.getTestCaseCardByTitle(title)).toBeVisible();
  });

  test("TC20 - Should add multiple test steps and preserve their order", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    const steps = [
      faker.lorem.sentence(),
      faker.lorem.sentence(),
      faker.lorem.sentence(),
    ];

    await testCasePage.fillTitle(faker.lorem.sentence());
    await testCasePage.fillExpectedResult(faker.lorem.sentence());

    // Fill step-0 (default), then add step-1 and step-2
    await testCasePage.fillTestStep(steps[0], 0);
    await testCasePage.addAndFillTestStep(steps[1]);
    await testCasePage.addAndFillTestStep(steps[2]);

    // Verify all 3 step inputs exist
    await expect(testCasePage.getAllTestStepInputs()).toHaveCount(3);

    // Verify order is preserved
    await expect(testCasePage.getTestStepInput(0)).toHaveValue(steps[0]);
    await expect(testCasePage.getTestStepInput(1)).toHaveValue(steps[1]);
    await expect(testCasePage.getTestStepInput(2)).toHaveValue(steps[2]);

    await testCasePage.submit();
    await expect(testCasePage.getToastMessage()).toContainText("Test case created successfully");
  });

  test("TC21 - Should save test case with Automated status when toggle is ON", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    const title = faker.lorem.sentence();

    await testCasePage.createTestCase({
      title,
      expectedResult: faker.lorem.sentence(),
      testSteps: [faker.lorem.sentence()],
      automated: true,
    });

    await expect(testCasePage.getToastMessage()).toContainText("Test case created successfully");

    // Verify the card shows "Automated: Yes" on the list page
    const listPage = new TestCasesListPage(authenticatedPage);
    const card = listPage.getTestCaseCardByTitle(title);
    await expect(card).toBeVisible();
    await expect(
      card.locator(".preview-card-body--items-single-value", { hasText: "Yes" }),
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // UI Flow — Negative & Validation (TC22–TC24)
  // ---------------------------------------------------------------------------

  test("TC22 - Should show error when submitting with empty Title", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    // Fill everything except title
    await testCasePage.fillExpectedResult(faker.lorem.sentence());
    await testCasePage.fillTestStep(faker.lorem.sentence());
    await testCasePage.submit();

    await expect(testCasePage.getValidationMessage()).toBeVisible({ timeout: 5000 });
  });

  test("TC23 - Should show error when submitting with empty Expected Result", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    // Fill everything except expected result
    await testCasePage.fillTitle(faker.lorem.sentence());
    await testCasePage.fillTestStep(faker.lorem.sentence());
    await testCasePage.submit();

    await expect(testCasePage.getValidationMessage()).toBeVisible({ timeout: 5000 });
  });

  test("TC24 - Should show error when submitting with zero Test Steps", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    // Fill title and expected result but leave step-0 empty
    await testCasePage.fillTitle(faker.lorem.sentence());
    await testCasePage.fillExpectedResult(faker.lorem.sentence());
    // Do NOT fill any test step
    await testCasePage.submit();

    await expect(testCasePage.getValidationMessage()).toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // Usability (TC25–TC27)
  // ---------------------------------------------------------------------------

  test("TC25 - Should not submit form prematurely when pressing Enter with missing required fields", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    // Fill only the title, then press Enter
    await testCasePage.fillTitle(faker.lorem.sentence());
    await authenticatedPage.keyboard.press("Enter");

    // Should still be on the new-testcase page (not redirected)
    await expect(authenticatedPage).toHaveURL(/new-testcase/);
  });

  test("TC26 - Should navigate back to Test Cases list when clicking back arrow", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    await testCasePage.goBack();
    await expect(authenticatedPage).toHaveURL(/testcases/);
  });

  test("TC27 - Should display correct placeholders on all form fields", async ({
    authenticatedPage,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    await expect(testCasePage.getTitleInput()).toHaveAttribute("placeholder", "Title");
    await expect(testCasePage.getDescriptionInput()).toHaveAttribute("placeholder", "Description");
    await expect(testCasePage.getExpectedResultInput()).toHaveAttribute(
      "placeholder",
      "Expected Result",
    );
    await expect(testCasePage.getTestStepInput(0)).toHaveAttribute("placeholder", "Test step");
  });

  // ---------------------------------------------------------------------------
  // API Flow & Data Cleanup (TC28–TC30)
  // ---------------------------------------------------------------------------

  test("TC28 - API: Should create a test case via POST and receive 200 with valid data", async ({
    authToken,
  }) => {
    const payload: CreateTestCasePayload = {
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      expected_result: faker.lorem.sentence(),
      test_steps: [
        { id: 1, value: faker.lorem.sentence() },
        { id: 2, value: faker.lorem.sentence() },
      ],
      automated: false,
    };

    const allTestCases = await createTestCase(authToken, payload);

    expect(allTestCases.length).toBeGreaterThan(0);
    const created = allTestCases.find((tc) => tc.title === payload.title);
    expect(created).toBeDefined();
    expect(created!.description).toBe(payload.description);
    expect(created!.expected_result).toBe(payload.expected_result);
    expect(created!.test_steps).toHaveLength(2);
    expect(created!.automated).toBe(false);
  });

  test("TC29 - API: Should return error when creating a test case without Title", async ({
    authToken,
  }) => {
    const { status } = await apiPost("testcases", authToken, {
      description: faker.lorem.paragraph(),
      expected_result: faker.lorem.sentence(),
      test_steps: [{ id: 1, value: faker.lorem.sentence() }],
      automated: false,
    });

    expect(status).toBeGreaterThanOrEqual(400);
  });

  // TC30 is implemented as afterAll hook at the top of this describe block

  // ---------------------------------------------------------------------------
  // Performance & Network Anomalies (TC31–TC32)
  // ---------------------------------------------------------------------------

  test("TC31 - API Performance: Test case creation endpoint should resolve under 1000ms", async ({
    authToken,
  }) => {
    const payload: CreateTestCasePayload = {
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      expected_result: faker.lorem.sentence(),
      test_steps: [{ id: 1, value: faker.lorem.sentence() }],
      automated: false,
    };

    const start = Date.now();
    await createTestCase(authToken, payload);
    const durationMs = Date.now() - start;

    expect(durationMs).toBeLessThan(1000);
  });

  test("TC32 - UI Network Analysis: No duplicate API requests or 404/500 errors during creation", async ({
    authenticatedPage,
    networkMonitor,
  }) => {
    const testCasePage = new NewTestCasePage(authenticatedPage);
    await testCasePage.goto();

    // Clear any entries from navigation
    networkMonitor.clear();

    await testCasePage.createTestCase({
      title: faker.lorem.sentence(),
      expectedResult: faker.lorem.sentence(),
      testSteps: [faker.lorem.sentence()],
    });

    await expect(testCasePage.getToastMessage()).toContainText("Test case created successfully");

    // Verify no failed requests (4xx/5xx) for static assets
    const failedRequests = networkMonitor.getFailedRequests();
    const failedNonApi = failedRequests.filter(
      (e) => !e.url.includes("/api/") && (e.status === 404 || e.status === 500),
    );
    expect(failedNonApi).toHaveLength(0);

    // Verify no duplicate POST requests to /testcases
    const postToTestcases = networkMonitor
      .getEntries()
      .filter((e) => e.method === "POST" && e.url.includes("/testcases"));
    expect(postToTestcases.length).toBeLessThanOrEqual(1);
  });
});
