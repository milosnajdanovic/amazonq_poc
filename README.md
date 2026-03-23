# Sandbox AI Enablement — Test Automation Framework

Hybrid UI + API test automation suite for the [QA Sandbox](https://qa-sandbox.ni.htec.rs) application, built with Playwright and TypeScript. Developed using AI-accelerated workflows with Amazon Q Developer.

## Prerequisites

- Node.js 20+
- npm 9+

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps chromium webkit
```

Create a `.env.prod` file in the project root (see `.env.staging` for the template):

```
BASE_URL=https://qa-sandbox.ni.htec.rs
API_URL=https://qa-sandbox.ni.htec.rs/api/candidate
ADMIN_EMAIL=<your-email>
ADMIN_PASSWORD=<your-password>
```

## Running Tests

```bash
# Run all tests (prod, both browsers, parallel)
npm test

# Single browser
npm run test:chromium
npm run test:webkit

# Staging environment
npm run test:staging

# Specific spec file
npx playwright test tests/auth/login.spec.ts

# Headed mode (watch the browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

## Viewing Reports

```bash
npm run report
```

Opens the Playwright HTML report in the browser. Reports include video recordings of every test and screenshots on failure.

## Project Structure

```
├── .github/workflows/
│   └── playwright.yml          # CI pipeline (nightly + PR + manual)
├── src/
│   ├── config/
│   │   └── environment.ts      # Multi-env config loader (TEST_ENV)
│   ├── fixtures/
│   │   └── base.fixture.ts     # Custom fixtures (authenticatedPage, authToken, networkMonitor)
│   ├── helpers/
│   │   ├── api.helper.ts       # API client (auth, CRUD, low-level HTTP)
│   │   └── auth.helper.ts      # Bearer token injection into browser context
│   ├── pages/
│   │   ├── login.page.ts       # Login page POM
│   │   ├── new-test-case.page.ts   # New Test Case page POM
│   │   └── test-cases-list.page.ts # Test Cases list page POM
│   └── utils/
│       ├── logger.ts           # Winston logger (console + file)
│       └── network-monitor.ts  # Browser network interception & analysis
├── tests/
│   ├── auth/
│   │   └── login.spec.ts       # TC01–TC16: Authentication & Security
│   └── test-cases/
│       └── new-test-case.spec.ts   # TC17–TC32: Test Management
├── .env.prod                   # Prod environment variables (gitignored)
├── .env.staging                # Staging environment template (gitignored)
├── playwright.config.ts
├── rules.md                    # Framework rules & coding standards
├── test-plan.md                # 32 test cases across 2 features
└── tsconfig.json
```

## Test Coverage (32 Test Cases)

**Authentication & Security (TC01–TC16)**
- UI positive: valid login, remember me, navigation links (TC01–TC05)
- UI negative: invalid creds, empty fields, bad email format (TC06–TC10)
- Security: HTTPS, password masking, labels/placeholders (TC11–TC13)
- API: token retrieval, 401 on bad creds, response time (TC14–TC16)

**Test Management (TC17–TC32)**
- Hybrid: token injection bypasses login UI (TC17)
- UI positive: create test case, description, multiple steps, automated toggle (TC18–TC21)
- UI negative: empty title/expected result/steps validation (TC22–TC24)
- Usability: Enter key, back navigation, placeholders (TC25–TC27)
- API: create via POST, missing title → 400, bulk cleanup (TC28–TC30)
- Performance: creation latency, network anomaly detection (TC31–TC32)

All 62 tests (32 × 2 browsers) pass.

## Key Design Decisions

- **Hybrid approach**: UI tests use API-injected bearer tokens (`jwtSandboxToken` in localStorage) to skip the login flow, cutting ~3s per test.
- **Data cleanup**: `afterAll` hooks call `deleteAllTestCases()` via API — no junk data left behind.
- **Network monitoring**: `NetworkMonitor` class attaches to `page.on('response')` to catch duplicate requests, 404/500 errors, and slow endpoints during UI flows.
- **Logging**: Winston logs every API request/response (method, URL, status, duration) and UI steps to both console and `test-results/test-run.log`.
- **Multi-environment**: `TEST_ENV` env var selects `.env.<env>` file. Defaults to `prod`. Centralized in `src/config/environment.ts` with fail-fast validation.

## Environments

| Environment | Config File   | Command                        |
|-------------|---------------|--------------------------------|
| prod        | `.env.prod`   | `npm test` (default)           |
| staging     | `.env.staging` | `npm run test:staging`        |

To add a new environment, create `.env.<name>`, add the name to the `EnvName` type in `src/config/environment.ts`, and add an npm script.

## CI/CD

GitHub Actions workflow (`.github/workflows/playwright.yml`):

- **Triggers**: nightly cron (2:00 AM UTC), pull requests to main, manual dispatch with environment selector
- **Jobs**: lint gate (ESLint + Prettier) → Playwright tests
- **Artifacts**: HTML report (always), videos + traces (on failure)
- **Required secrets**: `BASE_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`

## Linting & Formatting

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix
npm run format        # Format with Prettier
npm run format:check  # Verify formatting
```

ESLint and Prettier must pass before tests run in CI.
