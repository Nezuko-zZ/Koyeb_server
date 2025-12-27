FROM debian:stable-slim

# 安装 nginx, nano, unzip 以及 ttyd 运行所需的依赖
RUN apt-get update && apt-get install -y \
    nginx \
    nano \
    unzip \
    curl \
    wget \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 下载 ttyd 二进制文件 (x86_64)
# 如果是 ARM 架构，请将链接中的 x86_64 改为 aarch64
RUN wget -O /usr/local/bin/ttyd https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.x86_64 \
    && chmod +x /usr/local/bin/ttyd

# 暴露端口：80 (Nginx), 7681 (ttyd)
EXPOSE 80 7681

# 创建启动脚本，以便同时启动 Nginx 和 ttyd
RUN echo '#!/bin/sh\n\
nginx\n\
# 使用 admin 作为账号，环境变量 $ROOT_PASSWORD 作为密码\n\
ttyd -p 7681 -c admin:$ROOT_PASSWORD bash' > /start.sh && chmod +x /start.sh

CMD ["/start.sh"]
