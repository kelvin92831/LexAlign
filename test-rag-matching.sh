#!/bin/bash

# ============================================
# RAG 匹配效果测试脚本
# 功能：测试向量检索的准确性和相关性
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
API_BASE="http://localhost:3001/api"
REGULATION_FILE="/Users/kelvin92831/Ｔ_final/data/official_documents/0002_114000918附件1(差異比較表).docx"
TOP_K=10  # 每条法规检索前10个最相关的内规文档

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         RAG 匹配效果测试（查询优化版本）          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 步骤 1：上传法规文件
# ============================================
echo -e "${GREEN}[步骤 1/5]${NC} 上传法规文件..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/upload/regulation" \
  -F "file=@$REGULATION_FILE")

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ 上传失败${NC}"
  exit 1
fi

TASK_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.taskId')
ITEM_COUNT=$(echo $UPLOAD_RESPONSE | jq -r '.data.itemCount')

if [ "$TASK_ID" = "null" ] || [ -z "$TASK_ID" ]; then
  echo -e "${RED}✗ 获取 Task ID 失败${NC}"
  echo $UPLOAD_RESPONSE | jq '.'
  exit 1
fi

echo -e "   ${GREEN}✓${NC} 上传成功"
echo -e "   Task ID: ${YELLOW}$TASK_ID${NC}"
echo -e "   法规条文数: ${YELLOW}$ITEM_COUNT${NC} 条"
echo ""

# ============================================
# 步骤 2：检查内规文件夹
# ============================================
echo -e "${GREEN}[步骤 2/5]${NC} 检查内规文件夹..."
CHECK_RESPONSE=$(curl -s "$API_BASE/upload/policy/check")
FILE_COUNT=$(echo $CHECK_RESPONSE | jq -r '.data.fileCount')
VECTOR_DB_COUNT=$(echo $CHECK_RESPONSE | jq -r '.data.vectorDbDocuments')

echo -e "   文件夹中的文件数: ${YELLOW}$FILE_COUNT${NC}"
echo -e "   向量库中的文档数: ${YELLOW}$VECTOR_DB_COUNT${NC}"

if [ "$FILE_COUNT" = "0" ]; then
  echo -e "   ${RED}✗ 内规文件夹为空${NC}"
  exit 1
fi
echo ""

# ============================================
# 步骤 3：加载内规文件到向量库
# ============================================
if [ "$VECTOR_DB_COUNT" = "0" ]; then
  echo -e "${GREEN}[步骤 3/5]${NC} 加载内规文件到向量库..."
  LOAD_RESPONSE=$(curl -s -X POST "$API_BASE/upload/policy/auto-load")
  SUCCEEDED=$(echo $LOAD_RESPONSE | jq -r '.data.succeeded')
  FAILED=$(echo $LOAD_RESPONSE | jq -r '.data.failed')
  
  echo -e "   成功加载: ${GREEN}$SUCCEEDED${NC} 个文件"
  
  if [ "$FAILED" != "0" ]; then
    echo -e "   ${RED}加载失败: $FAILED 个文件${NC}"
    echo "   错误详情:"
    echo $LOAD_RESPONSE | jq -r '.data.results[] | select(.success == false) | "     - \(.filename): \(.error[0:100])..."'
  fi
  
  if [ "$SUCCEEDED" = "0" ]; then
    echo -e "   ${RED}✗ 没有文件成功加载${NC}"
    exit 1
  fi
  
  echo -e "   ${GREEN}✓${NC} 加载完成"
  echo ""
  
  # 等待向量库准备
  echo -e "${YELLOW}   ⏳ 等待向量库索引建立...${NC}"
  sleep 3
  echo ""
else
  echo -e "${GREEN}[步骤 3/5]${NC} 向量库已有数据，跳过加载"
  echo ""
fi

# ============================================
# 步骤 4：运行 RAG 匹配
# ============================================
echo -e "${GREEN}[步骤 4/5]${NC} 运行 RAG 匹配（使用优化查询）..."
echo -e "   检索参数: Top-K = ${YELLOW}$TOP_K${NC}"
echo ""

MATCH_RESPONSE=$(curl -s -X POST "$API_BASE/match" \
  -H "Content-Type: application/json" \
  -d "{\"taskId\": \"$TASK_ID\", \"topK\": $TOP_K}")

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ 匹配失败${NC}"
  exit 1
fi

MATCH_COUNT=$(echo $MATCH_RESPONSE | jq -r '.data.matchCount')

if [ "$MATCH_COUNT" = "0" ] || [ "$MATCH_COUNT" = "null" ]; then
  echo -e "${RED}✗ 匹配结果为空${NC}"
  echo $MATCH_RESPONSE | jq '.'
  exit 1
fi

echo -e "   ${GREEN}✓${NC} 匹配完成，共 ${YELLOW}$MATCH_COUNT${NC} 条法规"
echo ""

# ============================================
# 步骤 5：生成匹配结果报告
# ============================================
echo -e "${GREEN}[步骤 5/5]${NC} 生成匹配结果报告"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                   匹配结果摘要                      ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

# 遍历每条法规的匹配结果
for i in $(seq 0 $((MATCH_COUNT - 1))); do
  echo -e "${YELLOW}【法规 #$((i + 1))】${NC}"
  
  # 提取法规信息
  SECTION_TITLE=$(echo $MATCH_RESPONSE | jq -r ".data.results[$i].diffItem.sectionTitle")
  EXPLANATION=$(echo $MATCH_RESPONSE | jq -r ".data.results[$i].diffItem.explanation")
  
  echo -e "📌 ${BLUE}条文：${NC}${SECTION_TITLE:0:80}..."
  echo -e "💬 ${BLUE}说明：${NC}${EXPLANATION:0:100}..."
  echo ""
  
  # 提取 Top 3 匹配结果
  echo -e "   ${GREEN}Top 3 匹配文档：${NC}"
  echo "$MATCH_RESPONSE" | jq -r ".data.results[$i].policyContexts[:3] | to_entries | .[] | 
    \"   \" + ((.key + 1) | tostring) + \". \" + 
    (.value.meta.doc_name | if length > 55 then .[0:55] + \"...\" else . end) + 
    \"\n      📊 相似度: \" + (((1 - .value.distance) * 100) | (. * 100 | round) / 100 | tostring) + \"%\" +
    \"\n      📁 章节: \" + (.value.meta.section_path // \"(无)\")"
  echo ""
  echo -e "${BLUE}────────────────────────────────────────────────────${NC}"
  echo ""
done

# ============================================
# 统计分析
# ============================================
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                   统计分析                          ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}📊 Top-1 文档分布（最相关的文档被选中的次数）：${NC}"
echo ""
echo "$MATCH_RESPONSE" | jq -r '[.data.results[].policyContexts[0].meta.doc_name] | 
  group_by(.) | 
  map({doc: .[0], count: length}) | 
  sort_by(-.count) | 
  to_entries | .[] |
  "   " + ((.key + 1) | tostring) + ". " +
  (.value.doc | if length > 60 then .[0:60] + "..." else . end) +
  "\n      🎯 被选为 Top-1: " + (.value.count | tostring) + " 次"'

# echo ""
# echo -e "${BLUE}────────────────────────────────────────────────────${NC}"
# echo ""

# echo -e "${GREEN}📈 相似度分布分析：${NC}"
# echo ""
# MAX_SIM=$(echo "$MATCH_RESPONSE" | jq -r '[.data.results[].policyContexts[0].distance] | map(1 - .) | max * 100 | round / 100')
# MIN_SIM=$(echo "$MATCH_RESPONSE" | jq -r '[.data.results[].policyContexts[0].distance] | map(1 - .) | min * 100 | round / 100')
# AVG_SIM=$(echo "$MATCH_RESPONSE" | jq -r '[.data.results[].policyContexts[0].distance] | map(1 - .) | add / length * 100 | round / 100')

# echo -e "   🔝 最高相似度: ${MAX_SIM}%"
# echo -e "   📉 最低相似度: ${MIN_SIM}%"
# echo -e "   📊 平均相似度: ${AVG_SIM}%"

echo ""
echo -e "${BLUE}────────────────────────────────────────────────────${NC}"
echo ""

# ============================================
# 文档质量检查
# ============================================
echo -e "${GREEN}🔍 匹配质量检查：${NC}"
echo ""

# 检查是否有相关的 SO-02-002 系列文档被选中
SO_COUNT=$(echo $MATCH_RESPONSE | jq -r '[.data.results[].policyContexts[0].meta.doc_name] | map(select(startswith("SO-02-002"))) | length')
TOTAL_COUNT=$(echo $MATCH_RESPONSE | jq -r '[.data.results[]] | length')

echo -e "   📋 SO-02-002 系列文档（目标内规）在 Top-1 出现: ${YELLOW}$SO_COUNT${NC} / ${YELLOW}$TOTAL_COUNT${NC} 次"

if [ "$SO_COUNT" -gt "$((TOTAL_COUNT / 2))" ]; then
  echo -e "   ${GREEN}✓ 匹配质量良好（超过50%命中目标内规）${NC}"
else
  echo -e "   ${YELLOW}⚠ 匹配质量待提升（目标内规命中率较低）${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

# ============================================
# 输出文件信息
# ============================================
MATCH_FILE="/Users/kelvin92831/Ｔ_final/backend/tmp/uploads/match_${TASK_ID}.json"

echo -e "${GREEN}✅ 测试完成！${NC}"
echo ""
echo -e "📁 ${BLUE}详细匹配结果已保存至：${NC}"
echo -e "   ${YELLOW}$MATCH_FILE${NC}"
echo ""
echo -e "💡 ${BLUE}查看详细结果：${NC}"
echo -e "   ${YELLOW}cat $MATCH_FILE | jq '.'${NC}"
echo ""
echo -e "🔍 ${BLUE}查看特定法规的匹配结果（例如第2条）：${NC}"
echo -e "   ${YELLOW}cat $MATCH_FILE | jq '.[1]'${NC}"
echo ""
echo -e "📊 ${BLUE}分析所有匹配的文档分布：${NC}"
echo -e "   ${YELLOW}cat $MATCH_FILE | jq '[.[].policyContexts[].meta.doc_name] | group_by(.) | map({doc: .[0], count: length}) | sort_by(-.count)'${NC}"
echo ""

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

