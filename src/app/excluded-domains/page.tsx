"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  Plus,
  Globe,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExcludedDomain {
  id: string;
  domain: string;
  createdAt: string;
}

export default function ExcludedDomainsPage() {
  const [domains, setDomains] = useState<ExcludedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 加载排除名单
  const fetchDomains = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/excluded-domains");
      const result = await response.json();
      if (result.success) {
        setDomains(result.data);
      } else {
        console.error("获取排除域名列表失败:", result.error);
      }
    } catch (error) {
      console.error("获取排除域名列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  // 删除域名
  const handleDelete = async (id: string, domain: string) => {
    if (!confirm(`确定要从排除名单中移除 "${domain}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/excluded-domains/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        setDomains(domains.filter((d) => d.id !== id));
      } else {
        alert(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除域名失败:", error);
      alert("删除失败，请稍后重试");
    }
  };

  // 批量添加域名
  const handleAddDomains = async () => {
    if (!textInput.trim()) {
      alert("请输入要排除的域名");
      return;
    }

    setSubmitting(true);
    setResultMessage(null);

    try {
      const response = await fetch("/api/excluded-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput }),
      });

      const result = await response.json();

      if (result.success) {
        const { added, skipped, errors } = result.data;
        let message = `成功添加 ${added} 个域名`;
        if (skipped > 0) {
          message += `，跳过 ${skipped} 个已存在的域名`;
        }
        if (errors.length > 0) {
          message += `，${errors.length} 个失败`;
          console.error("添加失败:", errors);
        }

        setResultMessage({ type: "success", text: message });
        setTextInput("");
        await fetchDomains();

        // 3秒后关闭对话框
        setTimeout(() => {
          setIsAddDialogOpen(false);
          setResultMessage(null);
        }, 2000);
      } else {
        setResultMessage({
          type: "error",
          text: result.error || "添加失败",
        });
      }
    } catch (error) {
      console.error("添加域名失败:", error);
      setResultMessage({
        type: "error",
        text: "添加失败，请稍后重试",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">排除名单管理</h1>
        <Badge variant="secondary" className="ml-auto">
          共 {domains.length} 个域名
        </Badge>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              排除名单中的域名及其子页面将在爬取时被跳过
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            添加域名
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            加载中...
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无排除的域名
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">域名</TableHead>
                <TableHead>添加时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell className="font-mono text-sm">
                    {domain.domain}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(domain.createdAt).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(domain.id, domain.domain)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 添加域名对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加排除域名</DialogTitle>
            <DialogDescription>
              支持多行粘贴，每行一个域名。系统会自动提取标准域名并去除重复项。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                输入域名（每行一个）
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`支持以下格式：&#10;example.com&#10;www.example.com&#10;https://example.com/page&#10;www.baidu.com`}
                className="w-full h-48 px-3 py-2 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {resultMessage && (
              <div
                className={`flex items-center gap-2 p-3 rounded-md ${
                  resultMessage.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {resultMessage.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{resultMessage.text}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setTextInput("");
                setResultMessage(null);
              }}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleAddDomains} disabled={submitting}>
              {submitting ? "添加中..." : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
