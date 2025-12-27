# 使用 Debian 轻量镜像
FROM debian:stable-slim

# 更新并安装常用工具
# 包含：SSH服务, 编辑器(nano, vim), 压缩工具(unzip), 常用网络工具(curl, wget, git, net-tools)
RUN apt-get update && apt-get install -y \
    openssh-server \
    nano \
    unzip \
    vim \
    curl \
    wget \
    git \
    net-tools \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# 配置 SSH
RUN mkdir /var/run/sshd
# 允许 root 密码登录
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# 暴露常用端口
# 22: SSH, 80: HTTP, 443: HTTPS, 8080: Web应用
EXPOSE 22 80 443 8080

# 容器启动时：
# 1. 根据环境变量 $ROOT_PASSWORD 动态设置 root 密码
# 2. 以非守护进程方式启动 SSH 服务
CMD ["sh", "-c", "echo \"root:$ROOT_PASSWORD\" | chpasswd && /usr/sbin/sshd -D"]
