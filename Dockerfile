# 使用官方轻量级 Node.js 镜像
FROM node:18-slim

# 安装必要的系统工具：
# - ca-certificates: 确保能通过 HTTPS 下载二进制文件
# - procps: 提供 ps 命令，方便你的 JS 脚本检查进程是否存在
RUN apt-get update && apt-get install -y \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装
# 确保你的 package.json 里有 axios
COPY package*.json ./
RUN npm install --production

# 复制你的 index.js
COPY . .

# 暴露端口 (对应你 JS 里的 PORT，默认 8000)
EXPOSE 8000

# 启动程序
# 启动时，Node 会执行下载和运行哪吒的逻辑
CMD ["node", "index.js"]
