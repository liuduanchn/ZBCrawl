export type SearchProvider = "python" | "coze";

export const DEFAULT_SEARCH_PROVIDER: SearchProvider = "python";

export interface SearchWebItem {
  title: string;
  url: string;
  snippet: string;
  site_name: string;
}

export interface SearchBatchResult {
  web_items: SearchWebItem[];
  errors: string[];
}

export function normalizeSearchProvider(value: unknown): SearchProvider {
  return value === "coze" ? "coze" : DEFAULT_SEARCH_PROVIDER;
}

export function getSearchProviderLabel(provider: SearchProvider): string {
  return provider === "coze" ? "Coze WebSearch" : "Python/DuckDuckGo";
}
