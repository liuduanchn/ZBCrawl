#!/bin/bash

# 简单测试暂停API

echo "=== 测试1: 发送暂停请求（无爬取任务） ==="
curl -s -X POST http://localhost:5000/api/tenders/crawl/pause
echo ""

echo ""
echo "=== 测试2: 获取暂停状态 ==="
curl -s -X GET http://localhost:5000/api/tenders/crawl/pause
echo ""

echo ""
echo "=== 测试完成 ==="
