#!/bin/bash

# 测试招标信息爬取断点续传功能

echo "=== 测试1: 获取当前爬取进度 ==="
curl -s -X GET http://localhost:5000/api/tenders/crawl
echo ""
echo ""

echo "=== 测试2: 模拟插入一个未完成的爬取进度 ==="
curl -s -X POST http://localhost:5000/api/test/insert-progress \
  -H "Content-Type: application/json" \
  -d '{
    "crawlType": "tenders",
    "schoolName": "测试学校",
    "currentIndex": 10,
    "totalSchools": 100,
    "status": "running",
    "completedSchools": 10,
    "failedSchools": 1,
    "totalCount": 50
  }'
echo ""
echo ""

echo "=== 测试3: 再次获取爬取进度 ==="
curl -s -X GET http://localhost:5000/api/tenders/crawl
echo ""
echo ""

echo "=== 测试4: 重置爬取进度 ==="
curl -s -X DELETE http://localhost:5000/api/tenders/crawl
echo ""
echo ""

echo "=== 测试5: 确认进度已重置 ==="
curl -s -X GET http://localhost:5000/api/tenders/crawl
echo ""
echo ""

echo "=== 测试完成 ==="
