"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, GraduationCap, Search, Database, AlertTriangle, FileText, Clock, Shield } from "lucide-react";

interface HelpManualProps {
  page: "schools" | "tenders";
}

export function HelpManual({ page }: HelpManualProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6" />
            使用手册
          </DialogTitle>
          <DialogDescription>
            系统使用详细说明
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* 系统介绍 */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                系统介绍
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                高职院校培训招标信息搜集系统是一站式招标信息搜集平台，帮助用户自动爬取和管理高职院校的培训招标信息。系统支持批量爬取、地区筛选、进度追踪、数据导出等功能，大幅提升工作效率。
              </p>
            </section>

            {/* 功能说明 */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                核心功能
              </h3>
              <div className="grid gap-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <h4 className="font-semibold">目标院校管理</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1 ml-6">
                    <li>• 查看、添加、编辑、删除学校信息</li>
                    <li>• 一键爬取中国教育在线的学校列表</li>
                    <li>• 支持按名称搜索和筛选学校</li>
                    <li>• 查看学校的爬取来源和详情信息</li>
                  </ul>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="h-4 w-4 text-purple-600" />
                    <h4 className="font-semibold">招标信息爬取</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1 ml-6">
                    <li>• 循环爬取所有学校的培训招标信息</li>
                    <li>• 支持按地区筛选爬取范围</li>
                    <li>• 实时显示爬取进度和日志</li>
                    <li>• 支持暂停、恢复、断点续传</li>
                    <li>• 自动过滤相关招标信息</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 详细步骤 */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                使用步骤
              </h3>
              <div className="space-y-4">
                {page === "schools" && (
                  <>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold">查看学校列表</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          进入目标院校管理页面，查看所有学校列表。列表包含编号、名称、地区、类型、官网等信息。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold">爬取学校数据</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          点击"爬取学校"按钮，系统将自动从中国教育在线爬取最新学校列表。爬取过程需要几分钟时间，请耐心等待。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold">添加/编辑学校</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          点击"添加学校"按钮手动添加新学校，或点击列表中的"编辑"按钮修改学校信息。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                        4
                      </div>
                      <div>
                        <h4 className="font-semibold">删除学校</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          点击列表中的"删除"按钮，确认后即可删除学校。删除操作不可恢复。
                        </p>
                      </div>
                    </div>
                  </>
                )}
                {page === "tenders" && (
                  <>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold">准备学校列表</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          确保目标院校管理页面中已有学校列表。如没有，请先到"目标院校管理"页面爬取或添加学校。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold">选择筛选地区（可选）</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          点击"筛选地区"按钮，选择要爬取的地区。系统将只爬取这些地区的学校。如不选择，则爬取所有学校。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold">开始爬取</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          点击"开始爬取"按钮，系统将使用关键词"学校名称 + 培训 + 招标/采购"进行搜索，并过滤相关招标信息。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                        4
                      </div>
                      <div>
                        <h4 className="font-semibold">监控爬取进度</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          爬取过程中，可以实时查看进度、日志和结果。如需暂停，点击"暂停爬取"按钮。
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                        5
                      </div>
                      <div>
                        <h4 className="font-semibold">查看和导出结果</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          爬取完成后，在下方表格查看所有招标信息。支持按学校筛选，点击"导出CSV"按钮可导出数据。
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 注意事项 */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                注意事项
              </h3>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>爬取频率：</strong>系统已添加延迟机制避免触发限流，但请避免频繁连续爬取。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>爬取时间：</strong>爬取过程可能需要较长时间（取决于学校数量和网络状况），请耐心等待。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>自动暂停：</strong>单次爬取时长超过15分钟会自动暂停，可点击"恢复爬取"继续。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Database className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>数据准确：</strong>系统会自动过滤招标相关关键词，但建议人工审核爬取结果。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>历史记录：</strong>每次爬取会自动保存历史记录，可在"爬取历史"页面查看。</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 爬取关键词说明 */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                爬取关键词说明
              </h3>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-gray-600 mb-3">
                  系统使用以下关键词组合进行搜索，并自动过滤包含招标相关关键词的结果：
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">关键词1</Badge>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">学校名称 + 培训 + 招标</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">关键词2</Badge>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">学校名称 + 培训 + 采购</code>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  <strong>过滤关键词：</strong>
                  <span className="ml-2">招标、采购、中标公告、成交公告、招标公告、采购公告、询价、竞争性谈判、单一来源、比选、竞价</span>
                </p>
              </div>
            </section>

            {/* 常见问题 */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-green-600" />
                常见问题
              </h3>
              <div className="space-y-3">
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm">Q: 为什么爬取失败？</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    A: 可能原因包括网络问题、目标网站限制、或触发限流。请检查网络连接，稍后重试。
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm">Q: 如何恢复中断的爬取？</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    A: 如果爬取被暂停或中断，点击"恢复爬取"按钮即可从上次中断的位置继续。
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm">Q: 爬取的数据准确吗？</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    A: 系统会自动过滤相关关键词，但建议人工审核爬取结果，确保数据准确性。
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-sm">Q: 如何导出数据？</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    A: 点击"导出CSV"按钮，系统会将当前页面的数据导出为CSV格式文件。
                  </p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
