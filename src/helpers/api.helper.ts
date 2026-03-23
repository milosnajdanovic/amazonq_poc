import { APIRequestContext, request } from "@playwright/test";
import { logApiRequest, logApiResponse } from "../utils/logger";
import { envConfig } from "../config/environment";

// ---------------------------------------------------------------------------
// Internal: shared API context (singleton per process)
// ---------------------------------------------------------------------------

let apiContext: APIRequestContext;

async function getApiContext(): Promise<APIRequestContext> {
  if (!apiContext) {
    apiContext = await request.newContext({
      baseURL: envConfig.API_URL.replace(/\/?$/, "/"), // ensure trailing slash
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }
  return apiContext;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken: string;
}

export interface TestStepResponse {
  id: number;
  testcase_id: number;
  value: string;
}

export interface TestCaseResponse {
  id: number;
  candidate_id: number;
  title: string;
  expected_result: string;
  description: string;
  automated: boolean;
  candidate_scenario_id: number;
  test_steps: TestStepResponse[];
}

export interface TestStepPayload {
  id: number;
  value: string;
}

export interface CreateTestCasePayload {
  title: string;
  description: string;
  expected_result: string;
  test_steps: TestStepPayload[];
  automated: boolean;
}

// ---------------------------------------------------------------------------
// Primary methods (as requested)
// ---------------------------------------------------------------------------

/**
 * Authenticates via POST /login and returns the Bearer token.
 *
 * Endpoint: POST https://qa-sandbox.ni.htec.rs/api/candidate/login
 * Payload:  { email, password }
 * Response: { success: true, token: "...", refreshToken: "..." }
 */
export async function getAuthToken(email: string, password: string): Promise<string> {
  const ctx = await getApiContext();
  const endpoint = "login";
  logApiRequest("POST", endpoint);

  const start = Date.now();
  const response = await ctx.post(endpoint, {
    data: { email, password },
  });
  const durationMs = Date.now() - start;
  logApiResponse("POST", endpoint, response.status(), durationMs);

  if (!response.ok()) {
    throw new Error(`Auth failed: ${response.status()} ${response.statusText()}`);
  }

  const body = (await response.json()) as LoginResponse;

  if (!body.success || !body.token) {
    throw new Error("Auth response missing token");
  }

  return body.token;
}

/**
 * Fetches all test cases via GET /testcases, then deletes each one
 * via DELETE /testcases/{id}. Used for teardown in afterAll hooks.
 *
 * GET  https://qa-sandbox.ni.htec.rs/api/candidate/testcases  → TestCaseResponse[]
 * DELETE https://qa-sandbox.ni.htec.rs/api/candidate/testcases/{id}
 */
export async function deleteAllTestCases(token: string): Promise<void> {
  const testCases = await getAllTestCases(token);

  if (testCases.length === 0) {
    return;
  }

  for (const tc of testCases) {
    await deleteTestCase(token, tc.id);
  }
}

// ---------------------------------------------------------------------------
// Supporting CRUD methods (used by primary methods and available for specs)
// ---------------------------------------------------------------------------

export async function getAllTestCases(token: string): Promise<TestCaseResponse[]> {
  const { status, body } = await apiGet("testcases", token);
  if (status !== 200) {
    throw new Error(`GET /testcases failed: ${status}`);
  }
  return body as TestCaseResponse[];
}

export async function createTestCase(
  token: string,
  payload: CreateTestCasePayload,
): Promise<TestCaseResponse[]> {
  const { status, body } = await apiPost("testcases", token, payload);
  if (status !== 200) {
    throw new Error(`POST /testcases failed: ${status}`);
  }
  return body as TestCaseResponse[];
}

export async function deleteTestCase(token: string, testCaseId: number): Promise<number> {
  return apiDelete(`testcases/${testCaseId}`, token);
}

// ---------------------------------------------------------------------------
// Low-level HTTP primitives (all requests logged per rules.md §6)
// ---------------------------------------------------------------------------

export async function apiGet(
  path: string,
  token: string,
): Promise<{ status: number; body: unknown }> {
  const ctx = await getApiContext();
  logApiRequest("GET", path);

  const start = Date.now();
  const response = await ctx.get(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const durationMs = Date.now() - start;
  logApiResponse("GET", path, response.status(), durationMs);

  const ct = response.headers()["content-type"] || "";
  const body = ct.includes("application/json") ? await response.json() : await response.text();
  return { status: response.status(), body };
}

export async function apiPost(
  path: string,
  token: string,
  data: unknown,
): Promise<{ status: number; body: unknown }> {
  const ctx = await getApiContext();
  logApiRequest("POST", path);

  const start = Date.now();
  const response = await ctx.post(path, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  const durationMs = Date.now() - start;
  logApiResponse("POST", path, response.status(), durationMs);

  const ct = response.headers()["content-type"] || "";
  const body = ct.includes("application/json") ? await response.json() : await response.text();
  return { status: response.status(), body };
}

export async function apiDelete(path: string, token: string): Promise<number> {
  const ctx = await getApiContext();
  logApiRequest("DELETE", path);

  const start = Date.now();
  const response = await ctx.delete(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const durationMs = Date.now() - start;
  logApiResponse("DELETE", path, response.status(), durationMs);

  return response.status();
}

export async function disposeApiContext(): Promise<void> {
  if (apiContext) {
    await apiContext.dispose();
  }
}
