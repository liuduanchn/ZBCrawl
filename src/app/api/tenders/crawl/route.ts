import { NextRequest, NextResponse } from "next/server";
import { schoolManager, tenderManager, crawlProgressManager, crawlHistoryManager } from "@/storage/database";
import { excludedDomainManager } from "@/storage/database/excludedDomainManager";
import { SearchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// 爬取招标信息（SSE流式输出，支持断点续传和暂停）
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  let startTime: Date | null = null;
  const MAX_CRAWL_DURATION = 15 * 60 * 1000; // 15分钟

  // 获取请求参数
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch (e) {
    // 如果没有body或解析失败，使用空对象
    body = {};
  }

  const regions: string | undefined = body.regions as string | undefined; // 省份/地区筛选（多个地区用逗号分隔）
  const keywords: Array<{name: string, logic?: "AND" | "OR"}> | undefined = body.keywords as Array<{name: string, logic?: "AND" | "OR"}> | undefined; // 搜索关键词列表（带逻辑关系）
  const excludeKeywords: string[] | undefined = body.excludeKeywords as string[] | undefined; // 排除关键词列表

  // 招标信息关键词过滤
  const tenderKeywords = [
    "招标", "采购", "中标公告", "成交公告", "招标公告",
    "采购公告", "询价", "竞争性谈判", "单一来源",
    "比选", "竞价", "招标文件", "采购项目"
  ];

  // 检查是否包含招标相关关键词
  const isTenderRelated = (text: string): boolean => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return tenderKeywords.some(keyword => lowerText.includes(keyword));
  };

  const stream = new ReadableStream({
    async start(controller) {
      let progressId: string | null = null;
      let isControllerClosed = false;

      const safeEnqueue = (data: Uint8Array) => {
        if (isControllerClosed) return;
        try {
          controller.enqueue(data);
        } catch (e) {
          isControllerClosed = true;
          console.error("Controller 已关闭，无法写入数据");
        }
      };

      const sendEvent = (data: string | object) => {
        return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
      };

      try {
        console.log("开始爬取招标信息...");

        // 获取学校列表（支持按地区筛选）
        const filters: Record<string, string> = {};
        if (regions && regions.trim()) {
          filters.region = regions;
        }
        const schools = await schoolManager.getSchools({
          limit: 999999,
          filters
        });
        console.log(`获取到 ${schools.length} 个学校${regions ? `（筛选地区：${regions}）` : ''}`);

        if (schools.length === 0) {
          safeEnqueue(sendEvent({
            type: "error",
            message: regions && regions.trim()
              ? `没有找到指定地区（${regions}）的学校，请先添加相关学校或更改筛选条件`
              : "没有找到目标学校，请先添加学校",
          }));
          controller.close();
          return;
        }

        // 获取排除域名列表
        const excludedDomains = await excludedDomainManager.getAllDomains();
        const excludedDomainList = excludedDomains.map(d => d.domain);
        if (excludedDomainList.length > 0) {
          console.log(`加载了 ${excludedDomainList.length} 个排除域名`);
        }

        // 查找是否有未完成的爬取进度
        const existingProgress = await crawlProgressManager.getCrawlProgress("tenders");

        let startIndex = 0;
        let completedSchools = 0;
        let failedSchools = 0;
        let totalCount = 0;
        let baseCount = 0; // 本次爬取的基准招标信息数

        const total = schools.length;

        if (existingProgress && existingProgress.status === "running") {
          // 从上次中断的位置继续
          startIndex = existingProgress.currentIndex + 1;
          completedSchools = existingProgress.completedSchools || 0;
          failedSchools = existingProgress.failedSchools || 0;
          totalCount = existingProgress.totalCount || 0;
          baseCount = totalCount; // 记录基准值，用于计算本次新增数量

          safeEnqueue(sendEvent({
            type: "resume",
            message: `检测到未完成的爬取任务，从第 ${startIndex + 1} 个学校继续...`,
            startIndex,
            completedSchools,
            failedSchools,
            totalCount,
            total,
            baseCount,
          }));

          progressId = existingProgress.id;
        } else {
          // 如果是已完成的任务，询问是否重新开始
          if (existingProgress && existingProgress.status === "completed") {
            safeEnqueue(sendEvent({
              type: "warning",
              message: `上次爬取已完成，共爬取 ${existingProgress.completedSchools} 个学校，找到 ${existingProgress.totalCount} 条招标信息。如有需要，可先清除进度重新开始。`,
            }));
          }

          // 创建新的进度记录
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
          startIndex = 0;
          completedSchools = 0;
          failedSchools = 0;
          totalCount = 0;
        }

        // 如果所有学校都已爬取完成
        if (startIndex >= total) {
          await crawlProgressManager.markAsCompleted(progressId!, totalCount);
          safeEnqueue(sendEvent({
            type: "complete",
            message: "所有学校已爬取完成！",
            summary: {
              total,
              completedSchools,
              failedSchools: total - completedSchools,
              totalCount,
            },
          }));
          controller.close();
          return;
        }

        // 记录开始时间
        startTime = new Date();

        safeEnqueue(sendEvent({
          type: "start",
          message: `开始爬取招标信息...`,
          total,
          startIndex,
        }));

        const config = new Config();
        const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
        const searchClient = new SearchClient(config, customHeaders);

        // 从 startIndex 开始爬取
        for (let i = startIndex; i < total; i++) {
          if (isControllerClosed) break;

          // 检查是否暂停（从数据库读取）
          const currentProgress = await crawlProgressManager.getCrawlProgress("tenders");
          if (currentProgress && currentProgress.status === "paused") {
            console.log(`检测到暂停请求，在第 ${i + 1} 个学校暂停`);

            // 计算本次新增的招标信息条数
            const currentCount = totalCount - baseCount;

            safeEnqueue(sendEvent({
              type: "paused",
              message: `爬取已暂停，已完成 ${completedSchools} 个学校，共爬取 ${currentCount} 条招标信息`,
              reason: currentProgress.errorMessage || "用户手动暂停",
              currentCount, // 本次新增的招标信息条数
            }));

            controller.close();
            return;
          }

          // 检查是否超时（15分钟）
          if (startTime) {
            const elapsed = Date.now() - startTime.getTime();
            if (elapsed > MAX_CRAWL_DURATION) {
              console.log(`爬取超时，已运行 ${Math.floor(elapsed / 60000)} 分钟`);

              await crawlProgressManager.updateCrawlProgress(progressId!, {
                status: "paused",
                errorMessage: `单次爬取时长超过 ${MAX_CRAWL_DURATION / 60000} 分钟，自动暂停`,
                lastCrawledAt: new Date(),
              });

              safeEnqueue(sendEvent({
                type: "auto_paused",
                message: `爬取已自动暂停（单次爬取时长超过 ${MAX_CRAWL_DURATION / 60000} 分钟）`,
                reason: `单次爬取时长超过 ${MAX_CRAWL_DURATION / 60000} 分钟`,
              }));

              controller.close();
              return;
            }
          }

          const school = schools[i];
          let schoolSuccessCount = 0;

          try {
            console.log(`[${i + 1}/${total}] 正在爬取 ${school.name} 的招标信息...`);

            // 更新进度
            await crawlProgressManager.updateCrawlProgress(progressId!, {
              currentIndex: i,
              schoolName: school.name,
              lastCrawledAt: new Date(),
            });

            // 发送开始爬取消息
            safeEnqueue(sendEvent({
              type: "progress",
              schoolName: school.name,
              message: `正在爬取 ${school.name} 的招标信息...`,
              progress: Math.round((i / total) * 100),
              current: i + 1,
              total,
              currentCount: totalCount - baseCount, // 本次爬取新增的招标信息条数
            }));

            // 使用自定义关键词进行搜索
            const defaultKeywords: Array<{ name: string; logic?: "AND" | "OR" }> = [
              { name: "培训" },
              { name: "招标" }
            ];
            const searchKeywords = keywords && keywords.length > 0 ? keywords : defaultKeywords;
            
            // 根据每个关键词的逻辑关系构建搜索查询
            // OR 块内的关键词分别搜索，AND 连接的关键词组合搜索
            const searchQueries: string[] = [];
            let keywordIndex = 0;
            
            while (keywordIndex < searchKeywords.length) {
              // 找出 OR 块
              const orBlock: string[] = [];
              let j = keywordIndex;
              
              orBlock.push(searchKeywords[j].name);
              let hasOr = false;
              
              while (j < searchKeywords.length - 1 && searchKeywords[j].logic === "OR") {
                hasOr = true;
                j++;
                orBlock.push(searchKeywords[j].name);
              }
              
              if (hasOr) {
                // OR 块内的每个关键词单独搜索
                for (const keyword of orBlock) {
                  searchQueries.push(`${school.name} ${keyword}`);
                }
                keywordIndex = j + 1;
              } else {
                // AND 连接的关键词，找出连续的 AND 块
                const andBlock: string[] = [searchKeywords[keywordIndex].name];
                while (keywordIndex < searchKeywords.length - 1 && searchKeywords[keywordIndex].logic === "AND") {
                  keywordIndex++;
                  andBlock.push(searchKeywords[keywordIndex].name);
                }
                searchQueries.push(`${school.name} ${andBlock.join(" ")}`);
                keywordIndex++;
              }
            }

            const allTenders: object[] = [];

            // 使用多个搜索查询以获取更全面的结果
            for (const query of searchQueries) {
              let retryCount = 0;
              const maxRetries = 3;

              while (retryCount < maxRetries) {
                try {
                  console.log(`搜索查询: ${query}${retryCount > 0 ? ` (重试 ${retryCount}/${maxRetries})` : ''}`);
                  const response = await searchClient.webSearch(query, 10, false);

                  // 添加延迟，避免触发限流
                  await new Promise(resolve => setTimeout(resolve, 2000));

                  if (response.web_items && response.web_items.length > 0) {
                    console.log(`${query} 搜索结果:`, response.web_items.length);

                    // 过滤出真正的招标信息
                    const validTenders = response.web_items.filter(item => {
                      const titleMatch = isTenderRelated(item.title);
                      const snippetMatch = isTenderRelated(item.snippet || "");
                      return titleMatch || snippetMatch;
                    });

                    console.log(`过滤后的招标信息: ${validTenders.length} 条`);

                    allTenders.push(...validTenders);

                    // 成功获取结果，退出重试循环
                    break;
                  }
                  break;
                } catch (queryError: unknown) {
                  console.error(`查询 "${query}" 失败:`, queryError);
                  // 检查是否是限流错误
                  const errorMessage = (queryError as Error)?.message || "";
                  if (errorMessage.includes("ErrTooManyRequests") ||
                      errorMessage.includes("限流")) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                      // 遇到限流，等待更长时间后重试
                      const waitTime = 10000 * retryCount; // 10s, 20s, 30s
                      console.log(`遇到限流，等待 ${waitTime / 1000} 秒后重试...`);
                      await new Promise(resolve => setTimeout(resolve, waitTime));
                      continue;
                    }
                  }
                  // 非限流错误或已达到最大重试次数，继续下一个查询
                  break;
                }
              }
            }

            // 去重（根据URL）
            interface TenderItem {
              url: string;
              snippet?: string;
              [key: string]: unknown;
            }
            const uniqueTenders = new Map<string, TenderItem>();
            allTenders.forEach(item => {
              const tender = item as TenderItem;
              if (tender.url && !uniqueTenders.has(tender.url)) {
                uniqueTenders.set(tender.url, tender);
              }
            });

            const finalTenders = Array.from(uniqueTenders.values());

            // 过滤结果：排除域名和排除关键词
            const filteredTenders = finalTenders.filter(item => {
              // 检查域名是否在排除名单中
              if (item.url && excludedDomainList.length > 0) {
                if (excludedDomainManager.isDomainExcluded(item.url, excludedDomainList)) {
                  return false;
                }
              }

              // 检查是否包含排除关键词
              if (excludeKeywords && excludeKeywords.length > 0) {
                const content = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();
                const isExcluded = excludeKeywords.some(keyword => 
                  content.includes(keyword.toLowerCase())
                );
                if (isExcluded) {
                  return false;
                }
              }

              return true;
            });

            if (filteredTenders.length > 0) {
              // 实时保存每一条招标信息
              for (const item of filteredTenders) {
                try {
                  // 尝试从snippet中提取发布时间
                  const remark: string = (item.snippet as string) || "";
                  let publishDate: Date | undefined;

                  // 尝试匹配常见的时间格式
                  const datePatterns = [
                    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
                    /(\d{4})-(\d{1,2})-(\d{1,2})/,
                    /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
                  ];

                  for (const pattern of datePatterns) {
                    const match = remark.match(pattern);
                    if (match) {
                      const year = parseInt(match[1]);
                      const month = parseInt(match[2]);
                      const day = parseInt(match[3]);
                      if (year >= 2020 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                        publishDate = new Date(year, month - 1, day);
                        break;
                      }
                    }
                  }

                  const tenderData = {
                    schoolName: school.name,
                    crawledAt: new Date(),
                    link: item.url,
                    remark: item.snippet,
                    createdAt: publishDate || new Date(),
                  };

                  const savedTender = await tenderManager.createTender(tenderData);
                  schoolSuccessCount++;
                  totalCount++;

                  // 发送实时更新的招标信息到前端
                  safeEnqueue(sendEvent({
                    type: "tender",
                    data: savedTender,
                  }));

                  console.log(`保存招标信息: ${item.title}`);
                } catch (saveError) {
                  console.error(`保存招标信息失败:`, saveError);
                }
              }

              console.log(`${school.name} 成功保存 ${finalTenders.length} 条招标信息`);

              // 发送学校完成消息
              safeEnqueue(sendEvent({
                type: "success",
                schoolName: school.name,
                count: finalTenders.length,
                message: `${school.name}：找到 ${finalTenders.length} 条招标信息`,
              }));
            } else {
              // 发送无结果消息
              safeEnqueue(sendEvent({
                type: "info",
                schoolName: school.name,
                message: `${school.name}：未找到有效的招标信息`,
              }));
            }

            // 更新成功学校计数
            completedSchools++;

          } catch (error) {
            console.error(`爬取 ${school.name} 失败:`, error);
            failedSchools++;

            // 更新失败学校计数
            await crawlProgressManager.updateCrawlProgress(progressId!, {
              failedSchools: failedSchools,
              lastCrawledAt: new Date(),
            });

            // 发送错误消息
            safeEnqueue(sendEvent({
              type: "error",
              schoolName: school.name,
              message: `${school.name}：爬取失败 - ${(error as Error).message}`,
            }));
          }

          // 更新总进度
          await crawlProgressManager.updateSchoolProgress(
            progressId!,
            i,
            completedSchools,
            failedSchools,
            totalCount,
            school.name
          );

          // 每处理完一个学校后添加延迟，避免触发限流
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // 标记爬取完成
        await crawlProgressManager.markAsCompleted(progressId!, totalCount);

        // 获取本次爬取的招标信息数据
        const tenders = await tenderManager.getTenders({
          skip: 0,
          limit: 10000, // 获取所有招标信息
        });

        // 保存历史记录
        const duration = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : 0;
        
        // 格式化关键词字符串（包含括号分组，OR 整体括起来）
        let keywordsStr: string | null = null;
        
        // 构建搜索关键词字符串
        let searchKeywordsStr = "";
        if (keywords && keywords.length > 0) {
          // 找出所有 OR 连接的关键词块
          interface Group {
            indices: number[];
            needsParentheses: boolean;
          }
          
          const groups: Group[] = [];
          let i = 0;
          
          while (i < keywords.length) {
            // 从当前位置开始，找连续的 OR 链
            const orBlock: number[] = [];
            let j = i;
            
            orBlock.push(j);
            let hasOr = false;
            
            while (j < keywords.length - 1 && keywords[j].logic === "OR") {
              hasOr = true;
              j++;
              orBlock.push(j);
            }
            
            if (hasOr) {
              // 这是一个 OR 块，需要括号
              groups.push({
                indices: orBlock,
                needsParentheses: true
              });
              i = j + 1;
            } else {
              // 这是一个单独的 AND 关键词
              groups.push({
                indices: [i],
                needsParentheses: false
              });
              i++;
            }
          }
          
          // 构建显示字符串
          const groupStrs = groups.map(group => {
            const keywordStrs = group.indices.map(i => keywords[i].name).join(" OR ");
            return group.needsParentheses ? `(${keywordStrs})` : keywordStrs;
          });
          
          searchKeywordsStr = groupStrs.join(" AND ");
        }
        
        // 构建完整的关键词字符串（包含排除关键词）
        if (searchKeywordsStr || (excludeKeywords && excludeKeywords.length > 0)) {
          const parts: string[] = [];
          if (searchKeywordsStr) {
            parts.push(searchKeywordsStr);
          }
          if (excludeKeywords && excludeKeywords.length > 0) {
            parts.push(`NOT ${excludeKeywords.join(", ")}`);
          }
          keywordsStr = parts.join(" | ");
        }
        
        try {
          await crawlHistoryManager.createCrawlHistory({
            crawlType: "tenders",
            regions: regions || null,
            keywords: keywordsStr,
            totalSchools: total,
            successSchools: completedSchools,
            failedSchools: failedSchools,
            tenderCount: totalCount,
            tenderData: JSON.stringify(tenders.slice(0, 100)), // 只保存最近100条
            duration,
            startedAt: startTime || new Date(),
            completedAt: new Date(),
          });
          console.log("已保存爬取历史记录");
        } catch (historyError) {
          console.error("保存爬取历史记录失败:", historyError);
        }

        // 发送完成消息
        safeEnqueue(sendEvent({
          type: "complete",
          message: "爬取完成！",
          summary: {
            total,
            completedSchools,
            failedSchools,
            totalCount,
          },
        }));
        console.log(`爬取完成: 总计 ${total} 个学校，成功 ${completedSchools} 个，失败 ${failedSchools} 个，共 ${totalCount} 条招标信息`);

      } catch (error) {
        console.error("爬取招标信息失败:", error);

        // 标记爬取失败
        if (progressId) {
          await crawlProgressManager.markAsFailed(progressId, (error as Error).message);
        }

        safeEnqueue(sendEvent({
          type: "error",
          message: `爬取招标信息失败: ${(error as Error).message}`,
        }));
      }

      try {
        if (!isControllerClosed) {
          controller.close();
        }
      } catch (e) {
        console.log("Controller 已关闭");
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no", // 禁用Nginx缓冲
    },
  });
}

// 获取爬取进度
export async function GET(request: NextRequest) {
  try {
    const progress = await crawlProgressManager.getCrawlProgress("tenders");

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error("获取爬取进度失败:", error);
    return NextResponse.json(
      { success: false, error: "获取爬取进度失败" },
      { status: 500 }
    );
  }
}

// 重置爬取进度
export async function DELETE(request: NextRequest) {
  try {
    await crawlProgressManager.resetCrawlProgress("tenders");

    return NextResponse.json({
      success: true,
      message: "爬取进度已重置",
    });
  } catch (error) {
    console.error("重置爬取进度失败:", error);
    return NextResponse.json(
      { success: false, error: "重置爬取进度失败" },
      { status: 500 }
    );
  }
}
