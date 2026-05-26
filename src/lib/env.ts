const required = (name: string, value: string | undefined): string => {
  if (!value || value.length === 0) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

export const env = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  SESSION_COOKIE_NAME:
    process.env.SESSION_COOKIE_NAME ?? "b4bc_session",
  SESSION_SECRET:
    process.env.SESSION_SECRET ??
    "dev-only-secret-please-change-in-prod-32bytes-min",
};

export const serverEnv = {
  get sessionSecret() {
    return required("SESSION_SECRET", env.SESSION_SECRET);
  },
};
