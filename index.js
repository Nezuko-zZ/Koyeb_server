const os = require('os');
const fs = require('fs');
const axios = require('axios');
const { exec, execSync } = require('child_process');
const crypto = require('crypto');  

const UUID = process.env.UUID || 'a57bc616-70df-451d-9317-626cbf839e3c';
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'agent.lightcode.fun:443';
const NEZHA_PORT = process.env.NEZHA_PORT || '';
const NEZHA_KEY = process.env.NEZHA_KEY || 'BOsCOI30NJjbnfRWDTWX0SYSNUJwHoJf';

const getDownloadUrl = () => {
  const arch = os.arch();
  if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
    return NEZHA_PORT ? 'https://arm64.ssss.nyc.mn/agent' : 'https://arm64.ssss.nyc.mn/v1';
  } else {
    return NEZHA_PORT ? 'https://amd64.ssss.nyc.mn/agent' : 'https://amd64.ssss.nyc.mn/v1';
  }
};

const downloadFile = async () => {
  try {
    const url = getDownloadUrl();
    console.log(`Downloading agent from ${url}`);
    const writer = fs.createWriteStream('nezha-binary');
    const response = await axios({ method: 'get', url: url, responseType: 'stream' });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Nezha binary downloaded successfully.');
        exec('chmod +x ./nezha-binary', (err) => err ? reject(err) : resolve());
      });
      writer.on('error', reject);
    });
  } catch (err) {
    console.error('Download failed:', err.message);
    throw err;
  }
};

const runnz = async () => {
  const agent_binary = './nezha-binary';
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
    return;
  }

  if (!fs.existsSync(agent_binary)) {
      try {
        await downloadFile();
      } catch (error) {
        console.error('Failed to download agent, skipping run.');
        return;
      }
  } else {
      try { fs.accessSync(agent_binary, fs.constants.X_OK); }
      catch (e) { execSync(`chmod +x ${agent_binary}`); }
  }

  let command = '';
  console.log(`Starting Nezha agent for: ${NEZHA_SERVER}`);

  if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
    const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
    const NEZHA_TLS = tlsPorts.includes(NEZHA_PORT) ? '--tls' : '';
    command = `nohup ${agent_binary} -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} >/dev/null 2>&1 &`;
  } else if (NEZHA_SERVER && NEZHA_KEY) {
    const port = NEZHA_SERVER.split(':').pop();
    const tlsPorts = new Set(['443', '8443', '2096', '2087', '2083', '2053']);
    const nezhatls = tlsPorts.has(port);
    const configYaml = `client_secret: ${NEZHA_KEY}\nserver: ${NEZHA_SERVER}\ntls: ${nezhatls}\nuuid: ${UUID}`;
    fs.writeFileSync('config.yaml', configYaml);
    command = `nohup ${agent_binary} -c config.yaml >/dev/null 2>&1 &`;
  } else {
    console.log('Nezha config is empty, skipping run.');
    return;
  }

  try {
    console.log('Executing command:', command);
    exec(command, { shell: '/bin/bash' });
    console.log('Nezha agent started.');
  } catch (error) {
    console.error(`Agent running error: ${error}`);
  }
};

(async () => {
  await runnz();
  console.log('Nezha agent logic finished, keeping process alive...');
  // 简单保活：每小时触发一次的空定时器，防止 Node 进程退出
  setInterval(() => {}, 60 * 60 * 1000);
})();
