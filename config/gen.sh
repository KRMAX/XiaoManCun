#!/usr/bin/env bash
# 生成《小满村》客户端配置代码与数据。
# 依赖：.NET 8 运行时 + Luban（focus-creative-games/luban）。
#
# 用法：
#   1) 下载 Luban：从 https://github.com/focus-creative-games/luban 获取 Luban.dll
#      或解压官方 release，将路径写入环境变量 LUBAN_DLL。
#   2) 执行：  ./gen.sh
#
# 输出：
#   - TS 代码 -> ../client/assets/scripts/config/generated
#   - JSON 数据 -> ../client/assets/resources/config

set -euo pipefail

cd "$(dirname "$0")"

LUBAN_DLL="${LUBAN_DLL:-./Luban/Luban.dll}"
CONF="luban.conf"
CODE_OUT="../client/assets/scripts/config/generated"
DATA_OUT="../client/assets/resources/config"

if [ ! -f "$LUBAN_DLL" ]; then
    echo "找不到 Luban.dll：$LUBAN_DLL"
    echo "请设置环境变量 LUBAN_DLL 指向 Luban.dll，例如："
    echo "  export LUBAN_DLL=/path/to/Luban/Luban.dll"
    exit 1
fi

mkdir -p "$CODE_OUT" "$DATA_OUT"

dotnet "$LUBAN_DLL" \
    -t client \
    -c typescript-json \
    -d json \
    --conf "$CONF" \
    -x outputCodeDir="$CODE_OUT" \
    -x outputDataDir="$DATA_OUT"

echo "配置生成完成："
echo "  代码 -> $CODE_OUT"
echo "  数据 -> $DATA_OUT"
