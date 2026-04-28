import { NextRequest, NextResponse } from "next/server";

// 明确指定使用 Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 测试网络连通性
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "请提供要测试的URL" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(30000), // 30秒超时
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      const result: any = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        headers: Object.fromEntries(response.headers.entries()),
      };

      if (response.ok) {
        const text = await response.text();
        result.contentLength = text.length;
        result.sampleContent = text.substring(0, 200); // 前200字符作为示例
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 检测部署环境
      const isProduction = process.env.NODE_ENV === 'production';
      const isVercel = process.env.VERCEL;
      const isDocker = process.env.DOCKER_CONTAINER;

      // 构建诊断信息
      const diagnostic = {
        isNetworkError: errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('fetch failed'),
        isTimeout: errorMessage.includes('timeout') || errorMessage.includes('AbortError'),
        isDNS: errorMessage.includes('ENOTFOUND') || errorMessage.includes('DNS'),
      };

      // 添加部署环境建议
      const suggestions: string[] = [];

      if (diagnostic.isNetworkError || diagnostic.isTimeout) {
        if (isProduction) {
          suggestions.push("生产环境可能有网络限制");
          if (isVercel) {
            suggestions.push("Vercel默认只允许HTTPS请求，HTTP请求会被阻止");
            suggestions.push("建议升级到Pro版本或使用外部代理");
          }
          if (isDocker) {
            suggestions.push("Docker容器可能有网络隔离");
            suggestions.push("建议检查网络配置和端口映射");
          }
          suggestions.push("确保防火墙允许出站HTTP请求");
        }
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        duration: `${duration}ms`,
        diagnostic: {
          ...diagnostic,
          environment: {
            production: isProduction,
            vercel: isVercel ? '是' : '否',
            docker: isDocker ? '是' : '否',
          },
          suggestions,
        },
      });
    }
  } catch (error) {
    console.error("网络测试失败:", error);
    return NextResponse.json(
      { success: false, error: "网络测试失败" },
      { status: 500 }
    );
  }
}
