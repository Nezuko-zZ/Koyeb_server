# 使用官方 Node 运行时
FROM node:20-slim

# 容器内工作目录
WORKDIR /app

# 先复制依赖声明并安装依赖（利用缓存）
COPY package*.json ./
RUN npm install --omit=dev

# 再复制代码
COPY . .

# 可选：设置环境
ENV NODE_ENV=production

# 默认启动命令
CMD ["node", "index.js"]
