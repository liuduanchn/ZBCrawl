import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, Search, Database, ArrowRight, ShieldX } from 'lucide-react';

export const metadata: Metadata = {
  title: '高职院校培训招标信息搜集系统',
  description: '爬取和管理高职院校培训招标信息',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 顶部导航 */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              高职院校培训招标信息搜集系统
            </h1>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="container mx-auto px-4 py-12">
        {/* 欢迎区域 */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            智能爬取 高效管理
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            一站式高职院校招标信息搜集平台，自动爬取最新招标公告，实时追踪培训项目，助力高效决策
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* 学校管理模块 */}
          <Link href="/schools" className="group">
            <section className="h-full rounded-2xl border bg-white/80 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                <Database className="h-8 w-8" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">目标院校管理</h3>
              <p className="mb-6 text-gray-600">
                管理目标院校列表，支持自动爬取和手动添加
              </p>
              <ul className="mb-8 space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs">
                    ✓
                  </span>
                  <span>查看目标学校列表（编号、名称、官网）</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs">
                    ✓
                  </span>
                  <span>一键爬取目标学校</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs">
                    ✓
                  </span>
                  <span>添加、编辑、删除学校</span>
                </li>
              </ul>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                  管理学校列表
                </span>
                <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </section>
          </Link>

          {/* 招标信息模块 */}
          <Link href="/tenders" className="group">
            <section className="h-full rounded-2xl border bg-white/80 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">招标信息爬取</h3>
              <p className="mb-6 text-gray-600">
                循环爬取学校列表中每个学校的培训招标信息
              </p>
              <ul className="mb-8 space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 text-xs">
                    ✓
                  </span>
                  <span>一键循环爬取所有学校招标信息</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 text-xs">
                    ✓
                  </span>
                  <span>实时显示爬取进度和结果</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 text-xs">
                    ✓
                  </span>
                  <span>按学校筛选招标信息</span>
                </li>
              </ul>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-600 group-hover:text-purple-700">
                  开始爬取
                </span>
                <ArrowRight className="h-5 w-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </section>
          </Link>

          {/* 排除名单模块 */}
          <Link href="/excluded-domains" className="group">
            <section className="h-full rounded-2xl border bg-white/80 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                <ShieldX className="h-8 w-8" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">排除名单管理</h3>
              <p className="mb-6 text-gray-600">
                管理爬取时排除的网站域名列表
              </p>
              <ul className="mb-8 space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-xs">
                    ✓
                  </span>
                  <span>多行粘贴快速添加域名</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-xs">
                    ✓
                  </span>
                  <span>自动提取标准域名格式</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-xs">
                    ✓
                  </span>
                  <span>一键删除单个或清空全部</span>
                </li>
              </ul>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-600 group-hover:text-orange-700">
                  管理排除名单
                </span>
                <ArrowRight className="h-5 w-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </section>
          </Link>
        </div>

        {/* 快速开始 */}
        <div className="mt-12 rounded-2xl border bg-white/80 p-8 shadow-lg backdrop-blur-sm">
          <h3 className="mb-8 text-2xl font-bold text-center text-gray-900">快速开始</h3>
          <div className="space-y-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold shadow-lg">
                1
              </div>
              <div className="flex-1">
                <h4 className="mb-2 text-lg font-semibold text-gray-900">添加目标学校</h4>
                <p className="text-gray-600">
                  使用"爬取学校"功能自动添加，或手动添加学校信息
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold shadow-lg">
                2
              </div>
              <div className="flex-1">
                <h4 className="mb-2 text-lg font-semibold text-gray-900">爬取招标信息</h4>
                <p className="text-gray-600">
                  点击"开始爬取"按钮，系统将循环爬取所有学校的培训招标信息
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold shadow-lg">
                3
              </div>
              <div className="flex-1">
                <h4 className="mb-2 text-lg font-semibold text-gray-900">查看和管理结果</h4>
                <p className="text-gray-600">
                  在招标信息表格中查看所有爬取结果，支持按学校筛选
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 特性标签 */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border bg-white/80 p-6 text-center backdrop-blur-sm">
            <div className="mb-3 text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              实时更新
            </div>
            <p className="text-sm text-gray-600">爬取进度和结果实时显示</p>
          </div>
          <div className="rounded-xl border bg-white/80 p-6 text-center backdrop-blur-sm">
            <div className="mb-3 text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
              智能筛选
            </div>
            <p className="text-sm text-gray-600">自动过滤相关招标信息</p>
          </div>
          <div className="rounded-xl border bg-white/80 p-6 text-center backdrop-blur-sm">
            <div className="mb-3 text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              导出便捷
            </div>
            <p className="text-sm text-gray-600">支持一键导出CSV格式</p>
          </div>
        </div>
      </main>
    </div>
  );
}
