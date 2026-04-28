import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/health/database - 数据库连接健康检查
export async function GET() {
  try {
    console.log("开始数据库连接检查...");
    console.log("DATABASE_URL 状态:", process.env.DATABASE_URL ? "已设置" : "未设置");

    const startTime = Date.now();
    const db = await getDb();

    // 执行简单查询测试连接
    const result = await db.execute(`SELECT 1 as test`);
    const endTime = Date.now();

    const responseTime = endTime - startTime;

    console.log("数据库连接成功，响应时间:", responseTime, "ms");
    console.log("查询结果:", result);

    return NextResponse.json({
      success: true,
      message: "数据库连接正常",
      details: {
        responseTime: `${responseTime}ms`,
        databaseUrl: process.env.DATABASE_URL ? "已配置" : "未配置",
        queryResult: result.rows?.[0] || result,
      },
    });
  } catch (error) {
    console.error("数据库连接失败:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        error: "数据库连接失败",
        details: {
          message: errorMessage,
          databaseUrl: process.env.DATABASE_URL ? "已配置" : "未配置",
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      { status: 500 }
    );
  }
}
