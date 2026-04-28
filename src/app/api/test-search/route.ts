import { NextRequest, NextResponse } from "next/server";
import { SearchClient, Config, APIError } from "coze-coding-dev-sdk";

export const runtime = "nodejs";

// 测试搜索功能
export async function GET(request: NextRequest) {
  try {
    console.log("开始测试搜索...");

    // 打印环境变量
    console.log("环境变量检查:");
    console.log("COZE_WORKLOAD_IDENTITY_API_KEY 存在:", !!process.env.COZE_WORKLOAD_IDENTITY_API_KEY);
    console.log("COZE_INTEGRATION_BASE_URL:", process.env.COZE_INTEGRATION_BASE_URL);

    // 尝试不同的配置方式，启用 verbose 模式
    const config = new Config();
    console.log("Config创建成功");
    console.log("Config.baseUrl:", config.baseUrl);
    console.log("Config.apiKey 存在:", !!config.apiKey);

    const searchClient = new SearchClient(config, {}, true);
    console.log("SearchClient创建成功");

    const query = "深圳职业技术学院 培训 招标";
    console.log(`测试搜索: ${query}`);

    const response = await searchClient.webSearch(query, 10, false);
    console.log("搜索调用成功");

    console.log(`搜索返回:`, {
      hasWebItems: !!response.web_items,
      webItemsCount: response.web_items?.length,
    });

    if (response.web_items && response.web_items.length > 0) {
      const results = response.web_items.map((item, index) => ({
        index: index + 1,
        title: item.title,
        url: item.url,
        snippet: item.snippet,
        siteName: item.site_name,
      }));

      return NextResponse.json({
        success: true,
        query,
        count: results.length,
        results,
      });
    }

    return NextResponse.json({
      success: true,
      query,
      count: 0,
      message: "没有找到搜索结果",
    });
  } catch (error) {
    console.error("搜索测试失败:", error);
    console.error("错误类型:", error?.constructor?.name);
    console.error("错误详情:", JSON.stringify(error, null, 2));

    if (error instanceof APIError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          statusCode: error.statusCode,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        name: (error as Error).name,
        constructor: error?.constructor?.name,
      },
      { status: 500 }
    );
  }
}
