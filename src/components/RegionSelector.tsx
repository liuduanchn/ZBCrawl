"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

// 中国省份/直辖市/自治区/特别行政区列表
const REGIONS = [
  // 直辖市
  { name: "北京市", category: "直辖市" },
  { name: "天津市", category: "直辖市" },
  { name: "上海市", category: "直辖市" },
  { name: "重庆市", category: "直辖市" },

  // 自治区
  { name: "内蒙古自治区", category: "自治区" },
  { name: "广西壮族自治区", category: "自治区" },
  { name: "西藏自治区", category: "自治区" },
  { name: "宁夏回族自治区", category: "自治区" },
  { name: "新疆维吾尔自治区", category: "自治区" },

  // 省份
  { name: "河北省", category: "省份" },
  { name: "山西省", category: "省份" },
  { name: "辽宁省", category: "省份" },
  { name: "吉林省", category: "省份" },
  { name: "黑龙江省", category: "省份" },
  { name: "江苏省", category: "省份" },
  { name: "浙江省", category: "省份" },
  { name: "安徽省", category: "省份" },
  { name: "福建省", category: "省份" },
  { name: "江西省", category: "省份" },
  { name: "山东省", category: "省份" },
  { name: "河南省", category: "省份" },
  { name: "湖北省", category: "省份" },
  { name: "湖南省", category: "省份" },
  { name: "广东省", category: "省份" },
  { name: "海南省", category: "省份" },
  { name: "四川省", category: "省份" },
  { name: "贵州省", category: "省份" },
  { name: "云南省", category: "省份" },
  { name: "陕西省", category: "省份" },
  { name: "甘肃省", category: "省份" },
  { name: "青海省", category: "省份" },
  { name: "台湾省", category: "省份" },

  // 特别行政区
  { name: "香港特别行政区", category: "特别行政区" },
  { name: "澳门特别行政区", category: "特别行政区" },
];

interface RegionSelectorProps {
  selectedRegions: string[];
  onRegionChange: (regions: string[]) => void;
  disabled?: boolean;
}

export function RegionSelector({ selectedRegions, onRegionChange, disabled = false }: RegionSelectorProps) {
  const handleRegionToggle = (region: string) => {
    if (selectedRegions.includes(region)) {
      onRegionChange(selectedRegions.filter(r => r !== region));
    } else {
      onRegionChange([...selectedRegions, region]);
    }
  };

  const handleCategoryToggle = (category: string) => {
    const regionsInCategory = REGIONS.filter(r => r.category === category).map(r => r.name);
    const allSelected = regionsInCategory.every(r => selectedRegions.includes(r));

    if (allSelected) {
      // 取消选中该分类下的所有地区
      onRegionChange(selectedRegions.filter(r => !regionsInCategory.includes(r)));
    } else {
      // 选中该分类下的所有地区
      const newRegions = [...selectedRegions];
      regionsInCategory.forEach(region => {
        if (!newRegions.includes(region)) {
          newRegions.push(region);
        }
      });
      onRegionChange(newRegions);
    }
  };

  const isCategorySelected = (category: string): boolean => {
    const regionsInCategory = REGIONS.filter(r => r.category === category).map(r => r.name);
    return regionsInCategory.length > 0 && regionsInCategory.every(r => selectedRegions.includes(r));
  };

  const isCategoryPartiallySelected = (category: string): boolean => {
    const regionsInCategory = REGIONS.filter(r => r.category === category).map(r => r.name);
    const selectedCount = regionsInCategory.filter(r => selectedRegions.includes(r)).length;
    return selectedCount > 0 && selectedCount < regionsInCategory.length;
  };

  const categories = Array.from(new Set(REGIONS.map(r => r.category)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">
          选择地区（已选 {selectedRegions.length} 个）
        </Label>
        <button
          type="button"
          onClick={() => onRegionChange([])}
          disabled={disabled || selectedRegions.length === 0}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          清空选择
        </button>
      </div>

      <ScrollArea className="h-64 rounded-md border p-4">
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`category-${category}`}
                  checked={isCategorySelected(category)}
                  onCheckedChange={() => handleCategoryToggle(category)}
                  disabled={disabled}
                />
                <Label
                  htmlFor={`category-${category}`}
                  className="cursor-pointer font-medium text-sm"
                >
                  {category}
                </Label>
                {isCategoryPartiallySelected(category) && (
                  <span className="text-xs text-gray-500">
                    (部分选中)
                  </span>
                )}
              </div>
              <div className="ml-6 grid grid-cols-2 gap-2">
                {REGIONS
                  .filter(r => r.category === category)
                  .map((region) => (
                    <div key={region.name} className="flex items-center gap-2">
                      <Checkbox
                        id={`region-${region.name}`}
                        checked={selectedRegions.includes(region.name)}
                        onCheckedChange={() => handleRegionToggle(region.name)}
                        disabled={disabled}
                      />
                      <Label
                        htmlFor={`region-${region.name}`}
                        className="cursor-pointer text-sm"
                      >
                        {region.name}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
