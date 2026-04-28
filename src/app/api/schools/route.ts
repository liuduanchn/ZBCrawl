import { NextRequest, NextResponse } from "next/server";
import { schoolManager } from "@/storage/database";

// 明确指定使用 Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 获取学校列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");
    const name = searchParams.get("name") || undefined;

    const filters: { name?: string } = {};
    if (name) {
      filters.name = name;
    }

    const schools = await schoolManager.getSchools({ skip, limit, filters });
    const total = await schoolManager.getSchoolCount(filters);

    return NextResponse.json({
      success: true,
      data: schools,
      total,
    });
  } catch (error) {
    console.error("获取学校列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取学校列表失败" },
      { status: 500 }
    );
  }
}

// 创建学校或按地区筛选学校
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 如果请求体包含 regions 参数，则按地区筛选学校
    if (body.regions !== undefined) {
      const { regions, limit } = body;
      console.log("按地区筛选学校，regions:", regions, "limit:", limit);

      const filters: any = {};
      if (regions && regions.trim()) {
        filters.region = regions;
      }

      console.log("filters:", filters);

      const schools = await schoolManager.getSchools({
        skip: 0,
        limit: limit || 9999,
        filters,
      });

      console.log("查询结果数量:", schools.length);

      return NextResponse.json({
        success: true,
        data: schools,
      });
    }

    // 如果请求体包含 batchUpdate 参数，则批量更新学校地区
    if (body.batchUpdate && body.updates) {
      const { updates } = body;
      let successCount = 0;
      let errorCount = 0;

      for (const update of updates) {
        try {
          await schoolManager.updateSchool(update.id, { region: update.region });
          successCount++;
        } catch (error) {
          console.error(`更新学校 ${update.id} 失败:`, error);
          errorCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `成功更新 ${successCount} 所学校，失败 ${errorCount} 所`,
        successCount,
        errorCount,
      });
    }

    // 如果请求体包含 cleanupRegions 参数，则批量清理地区字段（只保留省份）
    if (body.cleanupRegions) {
      const result = await schoolManager.batchUpdateRegions();
      return NextResponse.json({
        success: true,
        message: `成功更新 ${result.updated} 所学校的地区字段${result.failed > 0 ? `，失败 ${result.failed} 所` : ''}`,
        updated: result.updated,
        failed: result.failed,
      });
    }

    // 否则创建学校
    const { name, website, region, schoolType } = body;

    console.log("创建学校请求:", { name, website, region, schoolType });

    if (!name) {
      return NextResponse.json(
        { success: false, error: "学校名称不能为空" },
        { status: 400 }
      );
    }

    const schoolData: any = { name };
    if (website !== undefined) schoolData.website = website || null;
    if (region !== undefined) schoolData.region = region || null;
    if (schoolType !== undefined) schoolData.schoolType = schoolType || null;

    console.log("准备创建学校，数据:", schoolData);

    const school = await schoolManager.createSchool(schoolData);

    console.log("学校创建成功:", school);

    return NextResponse.json({
      success: true,
      data: school,
    });
  } catch (error) {
    console.error("处理请求失败:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 检测部署环境
    const isProduction = process.env.NODE_ENV === 'production';

    // 添加详细的诊断信息
    console.error("错误详情:", {
      message: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      isProduction,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      env: process.env.NODE_ENV,
    });

    return NextResponse.json(
      {
        success: false,
        error: `处理请求失败: ${errorMessage}${isProduction ? ' (生产环境)' : ''}`,
        details: isProduction ? undefined : {
          message: errorMessage,
          type: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      { status: 500 }
    );
  }
}

// 清除所有学校数据
export async function DELETE(request: NextRequest) {
  try {
    const deletedCount = await schoolManager.deleteAllSchools();

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      message: `成功清除 ${deletedCount} 所学校数据`,
    });
  } catch (error) {
    console.error("清除学校数据失败:", error);
    return NextResponse.json(
      { success: false, error: "清除学校数据失败" },
      { status: 500 }
    );
  }
}

// 带超时的 fetch 工具函数（增加更长的超时时间）
async function fetchWithTimeout(url: string, timeoutMs: number = 60000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`请求超时（${timeoutMs}ms），可能是网络连接缓慢或服务器无响应。请检查网络配置和防火墙设置。`);
      }
      throw error;
    }
    throw new Error(String(error));
  }
}

// 带重试的 fetch（增加更详细的错误处理）
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  timeoutMs: number = 60000
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`正在请求 ${url}（第 ${attempt}/${maxRetries} 次尝试，超时: ${timeoutMs}ms）`);
      const response = await fetchWithTimeout(url, timeoutMs);
      const html = await response.text();
      console.log(`成功获取 ${url}，内容长度: ${html.length}`);

      // 验证内容有效性
      if (!html || html.length < 100) {
        throw new Error(`获取的内容为空或过短（长度: ${html.length}）`);
      }

      return html;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message;
      console.error(`第 ${attempt} 次尝试失败:`, errorMessage);

      // 检测部署环境
      const isProduction = process.env.NODE_ENV === 'production';
      const isVercel = process.env.VERCEL;
      const isDocker = process.env.DOCKER_CONTAINER;

      // 提供更详细的错误诊断和部署环境建议
      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('DNS')) {
        throw new Error(
          `DNS 解析失败，无法连接到目标服务器。URL: ${url}\n\n` +
          `环境信息:\n` +
          `- 生产环境: ${isProduction ? '是' : '否'}\n` +
          `- Vercel: ${isVercel ? '是' : '否'}\n` +
          `- Docker: ${isDocker ? '是' : '否'}\n\n` +
          `部署环境解决方案:\n` +
          `1. Vercel: 检查部署配置，确保允许出站HTTP请求（默认只允许HTTPS）\n` +
          `2. Docker/容器: 检查网络配置和安全组规则，确保允许出站HTTP请求\n` +
          `3. 自建服务器: 检查防火墙规则和DNS配置\n\n` +
          `注意: 目标URL使用HTTP协议，部分部署环境可能仅支持HTTPS`
        );
      }

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Connection refused')) {
        throw new Error(
          `连接被拒绝，目标服务器可能不可达。URL: ${url}\n\n` +
          `环境信息:\n` +
          `- 生产环境: ${isProduction ? '是' : '否'}\n` +
          `- Vercel: ${isVercel ? '是' : '否'}\n\n` +
          `可能原因:\n` +
          `1. 目标服务器拒绝连接\n` +
          `2. 部署环境禁止出站HTTP连接到特定端口\n` +
          `3. 防火墙或安全组规则拦截\n\n` +
          `建议:\n` +
          `- 检查部署环境的出站网络策略\n` +
          `- 尝试使用HTTPS协议（如果目标服务器支持）`
        );
      }

      if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
        throw new Error(
          `连接超时，网络响应过慢或被防火墙拦截。建议检查网络配置和防火墙规则。URL: ${url}\n\n` +
          `环境信息:\n` +
          `- 生产环境: ${isProduction ? '是' : '否'}\n` +
          `- 超时设置: ${timeoutMs}ms\n\n` +
          `可能原因:\n` +
          `1. 部署环境网络带宽限制\n` +
          `2. 防火墙规则拦截了长时间连接\n` +
          `3. 目标服务器响应过慢\n\n` +
          `建议:\n` +
          `- 增加超时时间（当前: ${timeoutMs}ms）\n` +
          `- 检查部署环境的网络配置和防火墙规则\n` +
          `- 确保允许HTTP出站请求`
        );
      }

      if (errorMessage.includes('fetch failed') || errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        throw new Error(
          `网络请求失败，可能是部署环境的网络限制。URL: ${url}\n\n` +
          `环境信息:\n` +
          `- 生产环境: ${isProduction ? '是' : '否'}\n` +
          `- Vercel: ${isVercel ? '是' : '否'}\n` +
          `- Docker: ${isDocker ? '是' : '否'}\n\n` +
          `部署环境常见问题:\n` +
          `1. Vercel: 默认只允许HTTPS请求，HTTP请求会被阻止\n` +
          `2. 部分云平台: 需要显式配置允许出站HTTP请求\n` +
          `3. 容器环境: 网络隔离导致无法访问外网\n\n` +
          `解决方案:\n` +
          `- Vercel: 升级到Pro版本或使用外部代理\n` +
          `- 自建服务器: 配置允许HTTP出站请求\n` +
          `- Docker: 使用 --network=host 或配置端口映射\n\n` +
          `注意: 本地开发环境可以正常工作，但生产环境可能有网络限制`
        );
      }

      if (attempt < maxRetries) {
        const waitTime = attempt * 3000; // 指数退避：3秒、6秒、9秒
        console.log(`等待 ${waitTime}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error("未知错误");
}

// 爬取目标学校（流式返回）
export async function PATCH(request: NextRequest) {
  const encoder = new TextEncoder();
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      let heartbeatInterval: NodeJS.Timeout | null = null;

      const safeEnqueue = (data: Uint8Array) => {
        if (isClosed) return;
        try {
          controller.enqueue(data);
        } catch (e) {
          isClosed = true;
          console.error("Controller 已关闭，无法写入数据");
        }
      };

      const sendEvent = (data: any) => {
        return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
      };

      // 心跳机制，防止连接超时
      const startHeartbeat = () => {
        heartbeatInterval = setInterval(() => {
          if (!isClosed) {
            safeEnqueue(sendEvent({ type: "heartbeat", message: "连接保持活跃" }));
          }
        }, 30000); // 每30秒发送一次心跳
      };

      const stopHeartbeat = () => {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      };

      try {
        const body = await request.json();
        const { query } = body;

        const baseUrl = "http://school.nseac.com/a/zkyx";
        const totalPages = 31;

        // 启动心跳
        startHeartbeat();

        safeEnqueue(sendEvent({
          type: "start",
          message: "开始爬取学校数据...",
          total: totalPages,
        }));

        // 先测试网络连通性
        safeEnqueue(sendEvent({
          type: "page",
          message: "正在测试网络连通性...",
          page: 0,
          total: totalPages,
        }));

        try {
          await fetchWithRetry(`${baseUrl}.html`, 1, 30000);
          safeEnqueue(sendEvent({
            type: "page",
            message: "网络连通性测试通过，开始正式爬取...",
            page: 0,
            total: totalPages,
          }));
        } catch (testError) {
          const errorMessage = testError instanceof Error ? testError.message : String(testError);
          safeEnqueue(sendEvent({
            type: "error",
            message: `网络连通性测试失败: ${errorMessage}。爬取可能无法正常进行，建议检查网络配置和防火墙设置。`,
          }));
          throw testError;
        }

        // 爬取所有页面
        for (let page = 1; page <= totalPages; page++) {
          if (isClosed) break;

          const url = page === 1 ? `${baseUrl}.html` : `${baseUrl}_${page}.html`;

          safeEnqueue(sendEvent({
            type: "page",
            message: `正在爬取第 ${page}/${totalPages} 页...`,
            page,
            total: totalPages,
          }));

          try {
            // 使用带重试的 fetch（超时60秒）
            const html = await fetchWithRetry(url, 3, 60000);

            // 检查是否获取到有效内容
            if (!html || html.length < 100) {
              safeEnqueue(sendEvent({
                type: "error",
                message: `第 ${page} 页内容为空或过短，可能获取失败`,
                page,
              }));
              continue;
            }

            // 解析HTML表格
            const tableRegex = /<tr class='(white|gray)'>[\s\S]*?<\/tr>/g;
            let match;
            let pageCount = 0;
            let pageCreated = 0;
            let pageUpdated = 0;
            let pageSkipped = 0;

            while ((match = tableRegex.exec(html)) !== null) {
              if (isClosed) break;

              pageCount++;
              const row = match[0];

              // 提取序号（第一个 neirong1 td）
              const sequenceMatch = row.match(/<td class='neirong1'>(\d+)<\/td>/);
              const sequence = sequenceMatch ? sequenceMatch[1] : "";

              // 提取学校名称和详情链接
              const nameMatch = row.match(/<a href='(http:\/\/school\.nseac\.com\/[^']+)' target='_blank'>([^<]+)<\/a>/);
              const detailUrl = nameMatch ? nameMatch[1] : "";
              const name = nameMatch ? nameMatch[2].trim() : "";

              // 提取所有 neirong3 td 内容
              const neirong3Matches = row.match(/<td class='neirong3'>([^<]+)<\/td>/g);
              // 提取所有 neirong1 td 内容（除序号外）
              const neirong1Matches = row.match(/<td class='neirong1'>([^<]+)<\/td>/g);

              let region = "";
              let schoolType = "";
              let educationLevel = "";
              let highLevel = "";

              if (neirong3Matches && neirong3Matches.length >= 3) {
                region = neirong3Matches[0]?.match(/<td class='neirong3'>([^<]+)<\/td>/)?.[1]?.trim() || "";
                // 只保留省份信息（空格前的部分）
                if (region.includes(' ')) {
                  region = region.split(' ')[0];
                }
                schoolType = neirong3Matches[1]?.match(/<td class='neirong3'>([^<]+)<\/td>/)?.[1]?.trim() || "";
                educationLevel = neirong3Matches[2]?.match(/<td class='neirong3'>([^<]+)<\/td>/)?.[1]?.trim() || "";
              }

              if (neirong1Matches && neirong1Matches.length >= 2) {
                highLevel = neirong1Matches[1]?.match(/<td class='neirong1'>([^<]+)<\/td>/)?.[1]?.trim() || "";
              }

              if (name) {
                // 检查学校是否已存在（按名称）
                const existingSchools = await schoolManager.getSchools({
                  filters: { name },
                  limit: 1,
                });

                const schoolData = {
                  sequence,
                  name,
                  region,
                  schoolType,
                  highLevel,
                  educationLevel,
                  detailUrl,
                  crawlSourceUrl: url,
                  crawlSourceName: "中国教育在线",
                };

                if (existingSchools.length === 0) {
                  // 创建新学校
                  const school = await schoolManager.createSchool(schoolData);
                  createdCount++;
                  pageCreated++;
                  safeEnqueue(sendEvent({
                    type: "school",
                    message: `新增学校: ${name}`,
                    school: { ...school, action: "created" },
                  }));
                } else {
                  // 检查是否需要更新（只在数据有变化时更新）
                  const existing = existingSchools[0];
                  const needsUpdate =
                    existing.sequence !== sequence ||
                    existing.region !== region ||
                    existing.schoolType !== schoolType ||
                    existing.highLevel !== highLevel ||
                    existing.educationLevel !== educationLevel ||
                    existing.detailUrl !== detailUrl;

                  if (needsUpdate) {
                    const updated = await schoolManager.updateSchool(
                      existingSchools[0].id,
                      schoolData
                    );
                    if (updated) {
                      updatedCount++;
                      pageUpdated++;
                      safeEnqueue(sendEvent({
                        type: "school",
                        message: `更新学校: ${name}`,
                        school: { ...updated, action: "updated" },
                      }));
                    }
                  } else {
                    skippedCount++;
                    pageSkipped++;
                  }
                }
              }
            }

            if (!isClosed && pageCount === 0) {
              safeEnqueue(sendEvent({
                type: "warning",
                message: `第 ${page} 页未找到学校数据，可能是页面结构变化`,
                page,
              }));
            }

            if (!isClosed) {
              safeEnqueue(sendEvent({
                type: "pageComplete",
                message: `第 ${page} 页完成: 新增 ${pageCreated} 所，更新 ${pageUpdated} 所，跳过 ${pageSkipped} 所`,
                page,
                pageCreated,
                pageUpdated,
                pageSkipped,
              }));
            }

            // 避免请求过快
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`爬取页面 ${page} 失败:`, errorMessage);
            safeEnqueue(sendEvent({
              type: "error",
              message: `第 ${page} 页爬取失败: ${errorMessage}`,
              page,
            }));
          }
        }

        if (!isClosed) {
          safeEnqueue(sendEvent({
            type: "complete",
            message: `爬取完成！总计: 新增 ${createdCount} 所，更新 ${updatedCount} 所，跳过 ${skippedCount} 所`,
            created: createdCount,
            updated: updatedCount,
            skipped: skippedCount,
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("爬取学校失败:", errorMessage);

        // 提供更详细的错误诊断
        let diagnosticMessage = `爬取失败: ${errorMessage}`;

        if (errorMessage.includes('DNS') || errorMessage.includes('ENOTFOUND')) {
          diagnosticMessage += "\n\n诊断信息: 网络DNS解析失败，可能是域名无法访问或DNS配置问题。";
        } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Connection refused')) {
          diagnosticMessage += "\n\n诊断信息: 连接被拒绝，目标服务器可能不可达或防火墙拦截了连接。";
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          diagnosticMessage += "\n\n诊断信息: 请求超时，网络响应过慢。建议检查网络带宽和防火墙规则，确保出站HTTP/HTTPS请求未被限制。";
        }

        safeEnqueue(sendEvent({
          type: "error",
          message: diagnosticMessage,
        }));
      } finally {
        // 停止心跳
        stopHeartbeat();
      }

      try {
        if (!isClosed) {
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
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
