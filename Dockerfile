FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production

# 健康检查端口：8000（可被平台覆盖）
ENV PORT=8000
EXPOSE 8000

CMD ["node", "index.js"]
