# Test Automation Framework Rules & Standards

## 1. Architecture
* **Design Pattern:** Page Object Model (POM) must be used for all UI interactions.
* **Separation of Concerns:** Test files (`*.spec.ts`) should contain ONLY assertions and test flow logic. All element interactions, API calls, and data setups must reside in Page Objects or dedicated helper classes.
* **Hybrid Approach:** UI tests must leverage API endpoints for setup and teardown to increase execution speed. Avoid using the UI to set up prerequisites (e.g., creating a user via UI before testing a feature; use the API instead).

## 2. Locators
* **Hierarchy:** Strict adherence to user-centric locators.
    1. User-Facing Attributes (e.g., `getByRole`, `getByText`, `getByLabel`).
    2. Data Attributes (e.g., `getByTestId('submit-button')`).
    3. CSS Selectors (Fallback only).
    4. XPath (Strictly prohibited unless no other option exists).
* **Encapsulation:** Locators must be defined within the POM constructor or as private getters. They should never be hardcoded inside the test file.

## 3. Data Generation & Management
* **Dynamic Data:** Use libraries like `Faker.js` for randomized but valid test data (names, emails) to avoid data collisions in parallel runs.
* **Static Data:** Environment-specific variables (URLs, admin credentials) must be managed via `.env` files.
* **State Injection:** Use API requests to fetch a `Bearer Token` and inject it into the browser context to bypass the UI login screen for non-login-specific tests.
* **Cleanup:** All tests must clean up after themselves. Use `afterEach` or `afterAll` hooks to trigger API calls that delete test data created during the run.

## 4. Coding Standards
* **Language:** TypeScript (Strict mode enabled).
* **Static Analysis:** ESLint and Prettier must be configured and pass in the CI pipeline before tests run.
* **Naming Conventions:** * Files: `feature-name.spec.ts`, `feature-name.page.ts`.
    * Test Cases: Descriptive "Should do X when Y" format.
* **Timeouts & Retries:** * No hardcoded `sleep()` or `waitForTimeout()`. Wait for specific element states (visible, detached) or network responses.
    * Configure 1 retry for CI environments, 0 for local.

## 5. Network Analysis & Performance
* **Network Interception:** Use Playwright's `page.on('response')` to log API response times during UI flows.
* **Thresholds:** Flag or fail tests if critical backend endpoints exceed predefined response times (e.g., > 2000ms) during UI execution.

## 6. Logging & Execution
* **Logging System:** A custom logger (e.g., `winston` or simple console wrappers) must be implemented to log all API requests/responses (Method, URL, Status Code) and critical UI steps.
* **Multi-Environment:** Framework must support `--project` flags to toggle between at least two environments (e.g., `staging` and `prod`).

## 7. Reporting & CI/CD
* **Reporter:** Allure Framework (or Playwright HTML Reporter) must be used.
* **Artifacts:** * Screenshots captured ONLY on test failure.
    * Video recording enabled for all tests to trace execution.
* **Pipeline:** Nightly execution via YAML pipeline. Must support parallel execution across at least Chromium and WebKit browsers.