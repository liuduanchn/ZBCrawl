import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { Config, SearchClient } from "coze-coding-dev-sdk";
import {
  SearchBatchResult,
  SearchProvider,
  SearchWebItem,
} from "@/lib/search/types";

const PYTHON_SEARCH_TIMEOUT_MS = 30000;
const COZE_MAX_RETRIES = 3;
const COZE_RATE_LIMIT_DELAY_MS = 2000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSearchItem(item: unknown): SearchWebItem | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const raw = item as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  const snippet = typeof raw.snippet === "string" ? raw.snippet.trim() : "";
  const siteName =
    typeof raw.site_name === "string" ? raw.site_name.trim() : "";

  if (!title || !url) {
    return null;
  }

  return {
    title,
    url,
    snippet,
    site_name: siteName,
  };
}

async function searchWithCoze(
  queries: string[],
  count: number,
  headers: Record<string, string>,
): Promise<SearchBatchResult> {
  const config = new Config();
  const searchClient = new SearchClient(config, headers);
  const webItems: SearchWebItem[] = [];
  const errors: string[] = [];

  for (const query of queries) {
    let retryCount = 0;

    while (retryCount < COZE_MAX_RETRIES) {
      try {
        const response = await searchClient.webSearch(query, count, false);
        const normalizedItems = Array.isArray(response.web_items)
          ? response.web_items
              .map((item) => normalizeSearchItem(item))
              .filter((item): item is SearchWebItem => item !== null)
          : [];

        webItems.push(...normalizedItems);
        await delay(COZE_RATE_LIMIT_DELAY_MS);
        break;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        const isRateLimited =
          message.includes("ErrTooManyRequests") ||
          message.toLowerCase().includes("too many requests") ||
          message.includes("限流");

        if (isRateLimited) {
          retryCount += 1;
          if (retryCount < COZE_MAX_RETRIES) {
            await delay(10000 * retryCount);
            continue;
          }
        }

        errors.push(`${query}: ${message}`);
        break;
      }
    }
  }

  return { web_items: webItems, errors };
}

async function searchWithPython(
  queries: string[],
  count: number,
): Promise<SearchBatchResult> {
  const scriptPath = path.join(process.cwd(), "scripts", "ddg_search.py");
  if (!existsSync(scriptPath)) {
    throw new Error(`Python search script not found: ${scriptPath}`);
  }

  const pythonBin = process.env.PYTHON_BIN || "python";

  return new Promise<SearchBatchResult>((resolve, reject) => {
    const child = spawn(pythonBin, [scriptPath], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill();
      reject(new Error("Python search timed out"));
    }, PYTHON_SEARCH_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);

      const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

      if (code !== 0) {
        reject(
          new Error(
            stderr || `Python search exited unexpectedly, code: ${code ?? "unknown"}`,
          ),
        );
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as {
          success?: boolean;
          web_items?: unknown[];
          errors?: unknown[];
        };

        if (!parsed.success) {
          reject(new Error(stderr || "Python search returned a failure status"));
          return;
        }

        const webItems = Array.isArray(parsed.web_items)
          ? parsed.web_items
              .map((item) => normalizeSearchItem(item))
              .filter((item): item is SearchWebItem => item !== null)
          : [];

        const errors = Array.isArray(parsed.errors)
          ? parsed.errors
              .filter((item): item is string => typeof item === "string")
          : [];

        resolve({ web_items: webItems, errors });
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Python search output: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    });

    const payload = JSON.stringify({ queries, count });
    child.stdin.write(payload, "utf8");
    child.stdin.end();
  });
}

export async function searchWebBatch(params: {
  queries: string[];
  count: number;
  provider: SearchProvider;
  headers?: Record<string, string>;
}): Promise<SearchBatchResult> {
  const queries = params.queries.map((query) => query.trim()).filter(Boolean);

  if (queries.length === 0) {
    return { web_items: [], errors: [] };
  }

  if (params.provider === "coze") {
    return searchWithCoze(queries, params.count, params.headers || {});
  }

  return searchWithPython(queries, params.count);
}
