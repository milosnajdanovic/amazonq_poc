import path from "path";
import { config } from "dotenv";

export type EnvName = "prod" | "staging";

const ENV: EnvName = (process.env.TEST_ENV as EnvName) || "prod";

config({ path: path.resolve(__dirname, `../../.env.${ENV}`) });

export interface EnvConfig {
  ENV: EnvName;
  BASE_URL: string;
  API_URL: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env variable: ${key} (TEST_ENV=${ENV})`);
  }
  return value;
}

export const envConfig: EnvConfig = {
  ENV,
  BASE_URL: requireEnv("BASE_URL"),
  API_URL: requireEnv("API_URL"),
  ADMIN_EMAIL: requireEnv("ADMIN_EMAIL"),
  ADMIN_PASSWORD: requireEnv("ADMIN_PASSWORD"),
};
