"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TenderItem {
  id: string;
  schoolName: string;
  crawledAt: string;
  link: string | null;
  remark: string | null;
  createdAt: string;
}

interface TenderDataTableProps {
  data: TenderItem[];
}

const ITEMS_PER_PAGE = 10;

export function TenderDataTable({ data }: TenderDataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // 分页
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIndex, endIndex);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("zh-CN");
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("zh-CN");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      {/* 统计信息 */}
      <div className="flex items-center justify-end">
        <Badge variant="outline">
          共 {data.length} 条记录
        </Badge>
      </div>

      {/* 表格 */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6 text-center text-xs">#</TableHead>
              <TableHead className="w-14 text-xs">学校</TableHead>
              <TableHead className="text-xs" style={{ width: '180px' }}>招标信息</TableHead>
              <TableHead className="w-14 text-xs">发布时间</TableHead>
              <TableHead className="w-18 text-xs">爬取时间</TableHead>
              <TableHead className="w-10 text-right text-xs">操作</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    暂无招标信息
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-xs text-muted-foreground px-1">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell className="px-1 py-1">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        <span className="truncate max-w-[60px] block" title={item.schoolName}>
                          {item.schoolName}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs py-1">
                      <p className="text-xs font-medium truncate" title={item.remark || ""}>
                        {item.remark || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="px-1 py-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="px-1 py-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(item.crawledAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-1 py-1">
                      {item.link ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            if (item.link) {
                              window.open(item.link, "_blank", "noopener,noreferrer");
                            }
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            显示 {startIndex + 1}-{Math.min(endIndex, data.length)} 条，共 {data.length} 条
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {currentPage} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
