FROM nginx:stable-alpine

# 创建一个简单的测试页面
RUN echo "<h1>Zeabur Nginx Test Success</h1><p>Time: $(date)</p>" > /usr/share/nginx/html/index.html

EXPOSE 80
