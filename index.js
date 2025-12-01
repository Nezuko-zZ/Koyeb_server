const os = require('os');
const fs = require('fs');
const axios = require('axios');
const { exec, execSync } = require('child_process');
const crypto = require('crypto');
const http = require('http');

// ========== 配置 ==========

// UUID：优先用环境变量，没有就随机生成一个
const UUID =
  process.env.UUID ||
  (crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex'));

// 哪吒相关环境变量
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'agent.lightcode.fun:443'; // 允许带端口
const NEZHA_PORT = process.env.NEZHA_PORT || ''; // 可选：单独指定端口时用
const NEZHA_KEY =
  process.env.NEZHA_KEY || 'BOsCOI30NJjbnfRWDTWX0SYSNUJwHoJf'; // 建议用环境变量覆盖

// ========== 下载二进制 ==========

const getDownloadUrl = () => {
  const arch = os.arch();
  if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
    return NEZHA_PORT
      ? 'https://arm64.ssss.nyc.mn/agent'
      : 'https://arm64.ssss.nyc.mn/v1';
  } else {
    return NEZHA_PORT
      ? 'https://amd64.ssss.nyc.mn/agent'
      : 'https://amd64.ssss.nyc.mn/v1';
  }
};

const downloadFile = async () => {
  try {
    const url = getDownloadUrl();
    console.log(`Downloading agent from ${url}`);
    const writer = fs.createWriteStream('nezha-binary');
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Nezha binary downloaded successfully.');
        exec('chmod +x ./nezha-binary', (err) =>
          err ? reject(err) : resolve()
        );
      });
      writer.on('error', reject);
    });
  } catch (err) {
    console.error('Download failed:', err.message);
    throw err;
  }
};

// ========== 打印配置 & 进程 ==========

function printConfigAndProcesses() {
  // 打印 config.yaml 内容
  try {
    if (fs.existsSync('config.yaml')) {
      const content = fs.readFileSync('config.yaml', 'utf8');
      console.log('========== config.yaml ==========');
      console.log(content);
      console.log('======== end of config.yaml ========');
    } else {
      console.warn(
        '⚠️ config.yaml 不存在，可能配置还没写入或路径不对'
      );
    }
  } catch (e) {
    console.error('读取 config.yaml 失败:', e.message);
  }

  // 打印 nezha-binary 相关进程
  try {
    const cmd =
      'ps aux | grep nezha-binary | grep -v grep || ps -ef | grep nezha-binary | grep -v grep';
    const output = execSync(cmd, { encoding: 'utf8' });
    console.log('====== nezha-binary processes ======');
    console.log(output || '(没有匹配到 nezha-binary 进程)');
    console.log('==== end of nezha-binary processes ====');
  } catch (e) {
    console.error(
      '获取进程列表失败（可能没有 ps 命令）:',
      e.message
    );
  }
}

// ========== 生成 config.yaml ==========

function generateConfigYaml() {
  if (!NEZHA_SERVER || !NEZHA_KEY) {
    console.log('Nezha config is empty, skipping config.yaml write.');
    return false;
  }

  // 从 NEZHA_SERVER 或 NEZHA_PORT 中解析端口
  let host = NEZHA_SERVER;
  let port = '';

  if (NEZHA_SERVER.includes(':')) {
    const parts = NEZHA_SERVER.split(':');
    host = parts[0];
    port = parts[parts.length - 1];
  }

  if (NEZHA_PORT) {
    port = NEZHA_PORT;
  }
  if (!port) {
    port = '443';
  }

  const tlsPorts = new Set(['443', '8443', '2096', '2087', '2083', '2053']);
  const nezhatls = tlsPorts.has(port);

  const serverField = `${host}:${port}`;
  const configYaml = `client_secret: ${NEZHA_KEY}
server: ${serverField}
tls: ${nezhatls}
uuid: ${UUID}`;

  fs.writeFileSync('config.yaml', configYaml);
  console.log('config.yaml generated.');
  return true;
}

// ========== 启动 agent（前台 + 日志输出） ==========

function startAgentWithConfig() {
  const agentBinary = './nezha-binary';

  if (!fs.existsSync(agentBinary)) {
    console.error('Agent binary not found, cannot start.');
    return;
  }

  const cmd = `${agentBinary} -c config.yaml`;
  console.log('Executing command:', cmd);

  // 用 exec 启动，并打印 stdout/stderr
  const child = exec(cmd, { shell: '/bin/bash' });

  child.stdout.on('data', (data) => {
    process.stdout.write('[nezha stdout] ' + data.toString());
  });

  child.stderr.on('data', (data) => {
    process.stderr.write('[nezha stderr] ' + data.toString());
  });

  child.on('exit', (code, signal) => {
    console.log(
      `nezha-binary exited with code=${code}, signal=${signal}`
    );
  });
}

// ========== 主流程 ==========

const runnz = async () => {
  const agentBinary = './nezha-binary';

  // 检查是否已在运行
  const checkRunning = () => {
    try {
      execSync('ps aux | grep "[n]ezha-binary"').toString();
      return true;
    } catch (error) {
      return false;
    }
  };

  if (checkRunning()) {
    console.log('Nezha agent is already running.');
    printConfigAndProcesses();
    return;
  }

  // 下载/确保可执行
  if (!fs.existsSync(agentBinary)) {
    try {
      await downloadFile();
    } catch (error) {
      console.error('Failed to download agent, skipping run.');
      return;
    }
  } else {
    try {
      fs.accessSync(agentBinary, fs.constants.X_OK);
    } catch (e) {
      execSync(`chmod +x ${agentBinary}`);
    }
  }

  console.log(`Starting Nezha agent for: ${NEZHA_SERVER}`);

  // 统一使用 config.yaml 模式
  const ok = generateConfigYaml();
  if (!ok) {
    console.log('Nezha config invalid, skip starting agent.');
    return;
  }

  // 打印配置 & 当前进程
  printConfigAndProcesses();

  // 启动 agent（前台运行，输出日志）
  startAgentWithConfig();
};

// ========== 启动流程 + 保活 ==========

(async () => {
  await runnz();
  console.log('Nezha agent logic finished, keeping process alive...');
  // 保活防止 Node 进程退出
  setInterval(() => {}, 60 * 60 * 1000);
})();

// ========== 健康检查 HTTP 服务（用于 Koyeb / 其他平台探测） ==========

const PORT = process.env.PORT || 8000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('OK\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Health check server listening on http://0.0.0.0:${PORT}`
  );
});
