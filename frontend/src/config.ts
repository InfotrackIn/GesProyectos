interface AppConfig {
  apiUrl: string;
  region: string;
}

declare global {
  interface Window {
    APP_CONFIG?: Partial<AppConfig>;
  }
}

const runtime = window.APP_CONFIG ?? {};

export const config: AppConfig = {
  apiUrl: runtime.apiUrl || import.meta.env.VITE_API_URL || "",
  region: runtime.region || import.meta.env.VITE_REGION || "us-east-1",
};

export const isConfigured = Boolean(config.apiUrl);
