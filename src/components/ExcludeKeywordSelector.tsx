"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, RefreshCw, Trash2 } from "lucide-react";

interface Keyword {
  id: string;
  name: string;
  category: string;
  isDefault: number;
  isActive: number;
  createdAt: string;
  updatedAt: string | null;
}

interface ExcludeKeywordSelectorProps {
  selectedKeywords: string[];
  onSelectionChange: (keywords: string[]) => void;
}

export function ExcludeKeywordSelector({
  selectedKeywords,
  onSelectionChange,
}: ExcludeKeywordSelectorProps) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // 加载排除关键词列表（category = 'exclude'）
  const fetchKeywords = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/keywords?category=exclude");
      const result = await response.json();

      if (result.success) {
        setKeywords(result.data);

        // 如果没有关键词，自动初始化默认排除关键词
        if (result.data.length === 0) {
          await initDefaultKeywords();
        }
      }
    } catch (error) {
      console.error("加载排除关键词失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化默认排除关键词
  const initDefaultKeywords = async () => {
    try {
      const response = await fetch("/api/keywords/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "exclude", keywords: ["废标", "流标"] }),
      });
      const result = await response.json();
      
      if (result.success) {
        await fetchKeywords();
      }
    } catch (error) {
      console.error("初始化默认排除关键词失败:", error);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  // 切换关键词选择
  const toggleKeyword = (keywordName: string) => {
    if (selectedKeywords.includes(keywordName)) {
      onSelectionChange(selectedKeywords.filter((k) => k !== keywordName));
    } else {
      onSelectionChange([...selectedKeywords, keywordName]);
    }
  };

  // 添加新关键词
  const addKeyword = async () => {
    if (!newKeyword.trim()) return;

    // 检查是否已存在
    if (keywords.some((k) => k.name === newKeyword.trim())) {
      alert("该关键词已存在");
      return;
    }

    try {
      const response = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyword.trim(),
          category: "exclude",
          isDefault: 0,
          isActive: 1,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchKeywords();
        // 自动选中新添加的关键词
        toggleKeyword(newKeyword.trim());
        setNewKeyword("");
        setShowDropdown(true);
      } else {
        alert(result.error || "添加失败");
      }
    } catch (error) {
      console.error("添加关键词失败:", error);
      alert("添加失败，请稍后重试");
    }
  };

  // 删除关键词
  const deleteKeyword = async (id: string, name: string) => {
    if (!confirm(`确定要删除关键词"${name}"吗？`)) return;

    try {
      const response = await fetch(`/api/keywords/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        await fetchKeywords();
        // 如果删除的关键词在选中列表中，移除它
        if (selectedKeywords.includes(name)) {
          toggleKeyword(name);
        }
      } else {
        alert(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除关键词失败:", error);
      alert("删除失败");
    }
  };

  const availableKeywords = keywords.filter(
    (k) => k.isActive && !selectedKeywords.includes(k.name)
  );

  return (
    <div className="space-y-2 relative">
      {/* 已选关键词标签 */}
      <div className="flex flex-wrap items-center gap-2 min-h-[40px] p-2 border rounded-md bg-background">
        <div
          className="flex flex-wrap items-center gap-1 flex-1 cursor-pointer min-h-[24px]"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {selectedKeywords.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              选择要排除的关键词...
            </span>
          ) : (
            selectedKeywords.map((keyword) => (
              <Badge
                key={keyword}
                variant="destructive"
                className="gap-1 pr-1"
                onClick={(e) => e.stopPropagation()}
              >
                {keyword}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleKeyword(keyword);
                  }}
                  className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>

        {/* 右侧按钮组 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {showDropdown ? "收起" : "展开"}
          </Button>
          <Input
            placeholder="添加关键词"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword();
              }
            }}
            className="w-24 h-7 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            onClick={(e) => {
              e.stopPropagation();
              addKeyword();
            }}
            size="sm"
            className="h-7 px-2"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={fetchKeywords}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 下拉选择框 */}
      {showDropdown && (
        <div className="absolute z-50 w-full border rounded-md bg-background p-2 shadow-lg">
          {availableKeywords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              暂无可选关键词
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {availableKeywords.map((keyword) => (
                <div key={keyword.id} className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleKeyword(keyword.name)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {keyword.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteKeyword(keyword.id, keyword.name)}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
