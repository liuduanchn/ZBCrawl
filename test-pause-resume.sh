#!/bin/bash

# 测试爬取暂停功能

echo "=== 测试1: 开始爬取（后台运行） ==="
echo "提示：需要手动点击前端页面的'开始爬取'按钮"
echo "等待5秒后测试暂停功能..."
sleep 5

echo ""
echo "=== 测试2: 发送暂停请求 ==="
curl -s -X POST http://localhost:5000/api/tenders/crawl/pause
echo ""

echo ""
echo "=== 测试3: 检查暂停状态 ==="
curl -s -X GET http://localhost:5000/api/tenders/crawl/pause
echo ""

echo ""
echo "=== 测试4: 获取爬取进度 ==="
curl -s -X GET http://localhost:5000/api/tenders/crawl
echo ""

echo ""
echo "=== 测试5: 恢复爬取 ==="
curl -s -X DELETE http://localhost:5000/api/tenders/crawl/pause
echo ""

echo ""
echo "=== 测试完成 ==="
echo "请在前端页面查看暂停和恢复功能是否正常工作"
