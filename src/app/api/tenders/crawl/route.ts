import { NextRequest, NextResponse } from "next/server";
import {
  crawlHistoryManager,
  crawlProgressManager,
  schoolManager,
  tenderManager,
} from "@/storage/database";
import { excludedDomainManager } from "@/storage/database/excludedDomainManager";
import { HeaderUtils } from "coze-coding-dev-sdk";
import { searchWebBatch } from "@/lib/search/searchWebBatch";
import {
  getSearchProviderLabel,
  normalizeSearchProvider,
} from "@/lib/search/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CRAWL_DURATION = 15 * 60 * 1000;
const SEARCH_RESULT_LIMIT = 10;
const TENDER_KEYWORDS = [
  "\u62db\u6807",
  "\u91c7\u8d2d",
  "\u4e2d\u6807\u516c\u544a",
  "\u6210\u4ea4\u516c\u544a",
  "\u62db\u6807\u516c\u544a",
  "\u91c7\u8d2d\u516c\u544a",
  "\u8be2\u4ef7",
  "\u7ade\u4e89\u6027\u8c08\u5224",
  "\u5355\u4e00\u6765\u6e90",
  "\u6bd4\u9009",
  "\u7ade\u4ef7",
  "\u62db\u6807\u6587\u4ef6",
  "\u91c7\u8d2d\u9879\u76ee",
];
const DEFAULT_KEYWORDS: SearchKeyword[] = [
  { name: "\u57f9\u8bad" },
  { name: "\u62db\u6807" },
];

interface SearchKeyword {
  name: string;
  logic?: "AND" | "OR";
}

interface TenderItem {
  title?: string;
  url: string;
  snippet?: string;
}

function isTenderRelated(text: string): boolean {
  if (!text) {
    return false;
  }

  const normalized = text.toLowerCase();
  return TENDER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function buildSearchQueries(
  schoolName: string,
  keywords?: SearchKeyword[],
): string[] {
  const searchKeywords = keywords && keywords.length > 0 ? keywords : DEFAULT_KEYWORDS;
  const queries: string[] = [];
  let keywordIndex = 0;

  while (keywordIndex < searchKeywords.length) {
    const orBlock: string[] = [];
    let j = keywordIndex;

    orBlock.push(searchKeywords[j].name);
    let hasOr = false;

    while (j < searchKeywords.length - 1 && searchKeywords[j].logic === "OR") {
      hasOr = true;
      j += 1;
      orBlock.push(searchKeywords[j].name);
    }

    if (hasOr) {
      for (const keyword of orBlock) {
        queries.push(`${schoolName} ${keyword}`);
      }
      keywordIndex = j + 1;
      continue;
    }

    const andBlock: string[] = [searchKeywords[keywordIndex].name];
    while (
      keywordIndex < searchKeywords.length - 1 &&
      searchKeywords[keywordIndex].logic === "AND"
    ) {
      keywordIndex += 1;
      andBlock.push(searchKeywords[keywordIndex].name);
    }

    queries.push(`${schoolName} ${andBlock.join(" ")}`);
    keywordIndex += 1;
  }

  return queries;
}

function buildKeywordDisplay(
  keywords: SearchKeyword[] | undefined,
  excludeKeywords: string[] | undefined,
  providerLabel: string,
): string {
  const parts: string[] = [`Search provider: ${providerLabel}`];

  if (keywords && keywords.length > 0) {
    interface Group {
      indices: number[];
      needsParentheses: boolean;
    }

    const groups: Group[] = [];
    let i = 0;

    while (i < keywords.length) {
      const orBlock: number[] = [];
      let j = i;

      orBlock.push(j);
      let hasOr = false;

      while (j < keywords.length - 1 && keywords[j].logic === "OR") {
        hasOr = true;
        j += 1;
        orBlock.push(j);
      }

      if (hasOr) {
        groups.push({ indices: orBlock, needsParentheses: true });
        i = j + 1;
      } else {
        groups.push({ indices: [i], needsParentheses: false });
        i += 1;
      }
    }

    const searchKeywords = groups
      .map((group) => {
        const keywordStr = group.indices
          .map((index) => keywords[index].name)
          .join(" OR ");
        return group.needsParentheses ? `(${keywordStr})` : keywordStr;
      })
      .join(" AND ");

    if (searchKeywords) {
      parts.push(searchKeywords);
    }
  }

  if (excludeKeywords && excludeKeywords.length > 0) {
    parts.push(`NOT ${excludeKeywords.join(", ")}`);
  }

  return parts.join(" | ");
}

function extractPublishDate(remark: string): Date | undefined {
  const datePatterns = [
    /(\d{4})\u5e74(\d{1,2})\u6708(\d{1,2})\u65e5/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
  ];

  for (const pattern of datePatterns) {
    const match = remark.match(pattern);
    if (!match) {
      continue;
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (
      year >= 2020 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(year, month - 1, day);
    }
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  let startTime: Date | null = null;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const regions = body.regions as string | undefined;
  const keywords = body.keywords as SearchKeyword[] | undefined;
  const excludeKeywords = body.excludeKeywords as string[] | undefined;
  const searchProvider = normalizeSearchProvider(body.searchProvider);
  const searchProviderLabel = getSearchProviderLabel(searchProvider);

  const stream = new ReadableStream({
    async start(controller) {
      let progressId: string | null = null;
      let isControllerClosed = false;

      const safeEnqueue = (payload: object) => {
        if (isControllerClosed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          isControllerClosed = true;
        }
      };

      try {
        const filters: Record<string, string> = {};
        if (regions && regions.trim()) {
          filters.region = regions;
        }

        const schools = await schoolManager.getSchools({
          limit: 999999,
          filters,
        });

        if (schools.length === 0) {
          safeEnqueue({
            type: "error",
            message: regions && regions.trim()
              ? `No schools found for region: ${regions}`
              : "No target schools found",
          });
          controller.close();
          return;
        }

        const excludedDomains = await excludedDomainManager.getAllDomains();
        const excludedDomainList = excludedDomains.map((domain) => domain.domain);
        const existingProgress = await crawlProgressManager.getCrawlProgress("tenders");

        let startIndex = 0;
        let completedSchools = 0;
        let failedSchools = 0;
        let totalCount = 0;
        let baseCount = 0;
        const total = schools.length;

        if (existingProgress && existingProgress.status === "running") {
          startIndex = existingProgress.currentIndex + 1;
          completedSchools = existingProgress.completedSchools || 0;
          failedSchools = existingProgress.failedSchools || 0;
          totalCount = existingProgress.totalCount || 0;
          baseCount = totalCount;
          progressId = existingProgress.id;

          safeEnqueue({
            type: "resume",
            message: `Resume from school ${startIndex + 1}`,
            startIndex,
            completedSchools,
            failedSchools,
            totalCount,
            total,
            baseCount,
          });
        } else {
          if (existingProgress && existingProgress.status === "completed") {
            safeEnqueue({
              type: "warning",
              message: `Previous crawl completed with ${existingProgress.totalCount} tender records.`,
            });
          }

          const newProgress = await crawlProgressManager.createCrawlProgress({
            crawlType: "tenders",
            status: "running",
            currentIndex: 0,
            totalSchools: schools.length,
            completedSchools: 0,
            failedSchools: 0,
            totalCount: 0,
            lastCrawledAt: new Date(),
          });

          progressId = newProgress.id;
        }

        if (startIndex >= total) {
          await crawlProgressManager.markAsCompleted(progressId!, totalCount);
          safeEnqueue({
            type: "complete",
            message: "All schools already crawled",
            summary: {
              total,
              completedSchools,
              failedSchools: total - completedSchools,
              totalCount,
            },
          });
          controller.close();
          return;
        }

        startTime = new Date();
        safeEnqueue({
          type: "start",
          message: `Start crawling with ${searchProviderLabel}`,
          total,
          startIndex,
        });

        const customHeaders =
          searchProvider === "coze"
            ? HeaderUtils.extractForwardHeaders(request.headers)
            : {};

        for (let i = startIndex; i < total; i += 1) {
          if (isControllerClosed) {
            break;
          }

          const currentProgress = await crawlProgressManager.getCrawlProgress("tenders");
          if (currentProgress && currentProgress.status === "paused") {
            const currentCount = totalCount - baseCount;
            safeEnqueue({
              type: "paused",
              message: `Crawl paused after ${completedSchools} schools`,
              reason: currentProgress.errorMessage || "Paused by user",
              currentCount,
            });
            controller.close();
            return;
          }

          if (startTime && Date.now() - startTime.getTime() > MAX_CRAWL_DURATION) {
            await crawlProgressManager.updateCrawlProgress(progressId!, {
              status: "paused",
              errorMessage: `Single crawl duration exceeded ${MAX_CRAWL_DURATION / 60000} minutes`,
              lastCrawledAt: new Date(),
            });

            safeEnqueue({
              type: "auto_paused",
              message: `Crawl auto-paused after ${MAX_CRAWL_DURATION / 60000} minutes`,
              reason: `Single crawl duration exceeded ${MAX_CRAWL_DURATION / 60000} minutes`,
            });
            controller.close();
            return;
          }

          const school = schools[i];

          try {
            await crawlProgressManager.updateCrawlProgress(progressId!, {
              currentIndex: i,
              schoolName: school.name,
              lastCrawledAt: new Date(),
            });

            safeEnqueue({
              type: "progress",
              schoolName: school.name,
              message: `Crawling ${school.name} with ${searchProviderLabel}`,
              progress: Math.round((i / total) * 100),
              current: i + 1,
              total,
              currentCount: totalCount - baseCount,
            });

            const searchQueries = buildSearchQueries(school.name, keywords);
            const searchResponse = await searchWebBatch({
              queries: searchQueries,
              count: SEARCH_RESULT_LIMIT,
              provider: searchProvider,
              headers: customHeaders,
            });

            for (const error of searchResponse.errors) {
              console.error("Search query failed:", error);
            }

            const allTenders = searchResponse.web_items.filter((item) => {
              const titleMatch = isTenderRelated(item.title);
              const snippetMatch = isTenderRelated(item.snippet || "");
              return titleMatch || snippetMatch;
            });

            const uniqueTenders = new Map<string, TenderItem>();
            for (const item of allTenders) {
              if (item.url && !uniqueTenders.has(item.url)) {
                uniqueTenders.set(item.url, item);
              }
            }

            const filteredTenders = Array.from(uniqueTenders.values()).filter((item) => {
              if (
                item.url &&
                excludedDomainList.length > 0 &&
                excludedDomainManager.isDomainExcluded(item.url, excludedDomainList)
              ) {
                return false;
              }

              if (excludeKeywords && excludeKeywords.length > 0) {
                const content = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();
                return !excludeKeywords.some((keyword) =>
                  content.includes(keyword.toLowerCase()),
                );
              }

              return true;
            });

            if (filteredTenders.length > 0) {
              for (const item of filteredTenders) {
                try {
                  const remark = item.snippet || "";
                  const publishDate = extractPublishDate(remark);
                  const savedTender = await tenderManager.createTender({
                    schoolName: school.name,
                    crawledAt: new Date(),
                    link: item.url,
                    remark: item.snippet || null,
                    createdAt: publishDate || new Date(),
                  });

                  totalCount += 1;
                  safeEnqueue({
                    type: "tender",
                    data: savedTender,
                  });
                } catch (saveError) {
                  console.error("Save tender failed:", saveError);
                }
              }

              safeEnqueue({
                type: "success",
                schoolName: school.name,
                count: filteredTenders.length,
                message: `${school.name}: ${filteredTenders.length} tenders found`,
              });
            } else {
              safeEnqueue({
                type: "info",
                schoolName: school.name,
                message: `${school.name}: no valid tenders found`,
              });
            }

            completedSchools += 1;
          } catch (error) {
            failedSchools += 1;
            await crawlProgressManager.updateCrawlProgress(progressId!, {
              failedSchools,
              lastCrawledAt: new Date(),
            });

            safeEnqueue({
              type: "error",
              schoolName: school.name,
              message: `${school.name}: crawl failed - ${(error as Error).message}`,
            });
          }

          await crawlProgressManager.updateSchoolProgress(
            progressId!,
            i,
            completedSchools,
            failedSchools,
            totalCount,
            school.name,
          );

          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        await crawlProgressManager.markAsCompleted(progressId!, totalCount);

        const tenders = await tenderManager.getTenders({
          skip: 0,
          limit: 10000,
        });

        const duration = startTime
          ? Math.floor((Date.now() - startTime.getTime()) / 1000)
          : 0;

        try {
          await crawlHistoryManager.createCrawlHistory({
            crawlType: "tenders",
            regions: regions || null,
            keywords: buildKeywordDisplay(keywords, excludeKeywords, searchProviderLabel),
            totalSchools: total,
            successSchools: completedSchools,
            failedSchools,
            tenderCount: totalCount,
            tenderData: JSON.stringify(tenders.slice(0, 100)),
            duration,
            startedAt: startTime || new Date(),
            completedAt: new Date(),
          });
        } catch (historyError) {
          console.error("Save crawl history failed:", historyError);
        }

        safeEnqueue({
          type: "complete",
          message: "Crawl completed",
          summary: {
            total,
            completedSchools,
            failedSchools,
            totalCount,
          },
        });
      } catch (error) {
        if (progressId) {
          await crawlProgressManager.markAsFailed(
            progressId,
            (error as Error).message,
          );
        }

        safeEnqueue({
          type: "error",
          message: `Crawl failed: ${(error as Error).message}`,
        });
      }

      try {
        if (!isControllerClosed) {
          controller.close();
        }
      } catch {
        // Ignore close errors.
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET() {
  try {
    const progress = await crawlProgressManager.getCrawlProgress("tenders");

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error("Fetch crawl progress failed:", error);
    return NextResponse.json(
      { success: false, error: "Fetch crawl progress failed" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    await crawlProgressManager.resetCrawlProgress("tenders");

    return NextResponse.json({
      success: true,
      message: "Crawl progress reset",
    });
  } catch (error) {
    console.error("Reset crawl progress failed:", error);
    return NextResponse.json(
      { success: false, error: "Reset crawl progress failed" },
      { status: 500 },
    );
  }
}
