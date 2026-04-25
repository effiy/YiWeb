#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const args = process.argv.slice(2);
const DEFAULT_CONFIG = '.claude/skills/wework-bot/config.local.json';
const options = {
  token: process.env.API_X_TOKEN || null,
  apiUrl: process.env.WEWORK_BOT_API_URL || 'https://api.effiy.cn/wework/send-message',
  config: process.env.WEWORK_BOT_CONFIG || (fs.existsSync(DEFAULT_CONFIG) ? DEFAULT_CONFIG : null),
  agent: null,
  robot: null,
  webhookUrl: process.env.WEWORK_WEBHOOK_URL || null,
  webhookKey: process.env.WEWORK_WEBHOOK_KEY || null,
  content: null,
  description: null,
  contentFile: null,
  flow: null,
  feature: null,
  stage: null,
  status: null,
  impact: null,
  evidence: null,
  nextStep: null,
  model: process.env.AGENT_MODEL || process.env.CURSOR_AGENT_MODEL || 'GPT-5.5',
  tools: process.env.AGENT_TOOLS || 'Cursor Agent / wework-bot',
  updatedAt: process.env.WEWORK_MESSAGE_UPDATED_AT || null,
  dryRun: false
};

function readValue(index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    console.error(`Error: ${flag} requires a value`);
    process.exit(1);
  }
  return value;
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--token' || arg === '-t') {
    options.token = readValue(i, arg);
    i++;
  } else if (arg === '--api-url' || arg === '-a') {
    options.apiUrl = readValue(i, arg);
    i++;
  } else if (arg === '--config') {
    options.config = readValue(i, arg);
    i++;
  } else if (arg === '--agent') {
    options.agent = readValue(i, arg);
    i++;
  } else if (arg === '--robot' || arg === '-r') {
    options.robot = readValue(i, arg);
    i++;
  } else if (arg === '--webhook-url' || arg === '-w') {
    options.webhookUrl = readValue(i, arg);
    i++;
  } else if (arg === '--webhook-key' || arg === '-k') {
    options.webhookKey = readValue(i, arg);
    i++;
  } else if (arg === '--content' || arg === '-c') {
    options.content = readValue(i, arg);
    i++;
  } else if (arg === '--description' || arg === '-d') {
    options.description = readValue(i, arg);
    i++;
  } else if (arg === '--content-file' || arg === '-f') {
    options.contentFile = readValue(i, arg);
    i++;
  } else if (arg === '--flow') {
    options.flow = readValue(i, arg);
    i++;
  } else if (arg === '--feature') {
    options.feature = readValue(i, arg);
    i++;
  } else if (arg === '--stage') {
    options.stage = readValue(i, arg);
    i++;
  } else if (arg === '--status') {
    options.status = readValue(i, arg);
    i++;
  } else if (arg === '--impact') {
    options.impact = readValue(i, arg);
    i++;
  } else if (arg === '--evidence') {
    options.evidence = readValue(i, arg);
    i++;
  } else if (arg === '--next-step') {
    options.nextStep = readValue(i, arg);
    i++;
  } else if (arg === '--model') {
    options.model = readValue(i, arg);
    i++;
  } else if (arg === '--tools') {
    options.tools = readValue(i, arg);
    i++;
  } else if (arg === '--updated-at') {
    options.updatedAt = readValue(i, arg);
    i++;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
WeWork Bot - Send monitoring or alert messages

Usage: node .claude/skills/wework-bot/scripts/send-message.js [options]

Options:
  --token, -t          X-Token authentication (default from API_X_TOKEN env var)
  --api-url, -a        API endpoint (default from WEWORK_BOT_API_URL or https://api.effiy.cn/wework/send-message)
  --config             Robot routing config JSON (default from WEWORK_BOT_CONFIG or config.local.json when present)
  --agent              Agent name; resolves robot from config agents map
  --robot, -r          Robot name; resolves webhook from config robots map
  --webhook-url, -w    Full WeWork webhook URL (default from WEWORK_WEBHOOK_URL)
  --webhook-key, -k    WeWork webhook key; builds the standard qyapi webhook URL (default from WEWORK_WEBHOOK_KEY)
  --content, -c        Message content
  --description, -d    Required short description, max 100 characters
  --content-file, -f   Read message content from file
  --flow               Flow name, e.g. implement-code or generate-document
  --feature            Feature name or document path
  --stage              Current stage name
  --status             Current status, e.g. started, passed, blocked
  --impact             User-visible impact or delivery scope
  --evidence           Evidence path, command, MCP sequence, or result summary
  --next-step          Required next action (default: view docs/logs when needed)
  --model              Model name appended to message metadata (default from AGENT_MODEL or GPT-5.5)
  --tools              Tool summary appended to message metadata (default from AGENT_TOOLS or Cursor Agent / wework-bot)
  --updated-at         Last update time, precise to seconds (default local current time)
  --dry-run            Print sanitized request summary without sending
  --help, -h           Show this help message
`);
    process.exit(0);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error(`Error: failed to read config ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

function envValue(name) {
  return name ? process.env[name] : null;
}

function applyRobotConfig() {
  if (!options.config) {
    return;
  }

  const config = readJson(options.config);
  const hasWebhookOverride = Boolean(options.webhookUrl || options.webhookKey);
  const robotName = options.robot || (options.agent && config.agents ? config.agents[options.agent] : null) || config.default_robot;

  if (!robotName) {
    console.error('Error: --agent did not resolve to a robot, and no default_robot is configured');
    process.exit(1);
  }

  const robot = config.robots && config.robots[robotName];
  if (!robot) {
    console.error(`Error: robot "${robotName}" is not defined in ${options.config}`);
    process.exit(1);
  }

  options.robot = robotName;
  if (!hasWebhookOverride) {
    options.webhookUrl = robot.webhook_url || envValue(robot.webhook_url_env);
    options.webhookKey = robot.webhook_key || envValue(robot.webhook_key_env);
  }

  if (robot.api_url && !process.env.WEWORK_BOT_API_URL) {
    options.apiUrl = robot.api_url;
  }
}

applyRobotConfig();

if (!options.token) {
  console.error('Error: --token is required or set API_X_TOKEN environment variable');
  process.exit(1);
}

if (options.contentFile) {
  options.content = fs.readFileSync(options.contentFile, 'utf-8');
}

if (!options.content) {
  console.error('Error: --content is required or set --content-file');
  process.exit(1);
}

function charLength(value) {
  return Array.from(value || '').length;
}

function extractDescription(content) {
  const descriptionLine = content
    .split(/\r?\n/)
    .find((line) => /^\s*(?:📝\s*)?描述[:：]/.test(line));

  if (!descriptionLine) {
    return null;
  }

  return descriptionLine.replace(/^\s*(?:📝\s*)?描述[:：]\s*/, '').trim();
}

function hasMultilineFormat(content) {
  return content.includes('\n');
}

function hasLinePrefix(content, prefixes) {
  return content.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    return prefixes.some((prefix) => trimmed.startsWith(prefix));
  });
}

function contextLines() {
  const lines = [];
  if (options.flow) {
    lines.push(`🛠️ 流程：${options.flow}`);
  }
  if (options.feature) {
    lines.push(`📌 功能：${options.feature}`);
  }
  if (options.stage) {
    lines.push(`📍 阶段：${options.stage}`);
  }
  if (options.status) {
    lines.push(`📊 状态：${options.status}`);
  }
  if (options.impact) {
    lines.push(`🌐 影响：${options.impact}`);
  }
  if (options.evidence) {
    lines.push(`📎 证据：${options.evidence}`);
  }
  return lines;
}

function ensureContext(content) {
  const lines = contextLines().filter((line) => {
    const label = line.slice(0, line.indexOf('：') + 1);
    return !hasLinePrefix(content, [label]);
  });

  if (!lines.length) {
    return content.trim();
  }

  const existingLines = content.trim().split(/\r?\n/);
  const nextStepIndex = existingLines.findIndex((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('👉 下一步：') || trimmed.startsWith('下一步：');
  });

  if (nextStepIndex === -1) {
    return `${content.trim()}\n${lines.join('\n')}`;
  }

  existingLines.splice(nextStepIndex, 0, ...lines);
  return existingLines.join('\n');
}

function ensureNextStep(content) {
  if (hasLinePrefix(content, ['👉 下一步：', '下一步：'])) {
    return content.trim();
  }

  const nextStep = options.nextStep || '请按结论处理，必要时查看对应文档或日志。';
  return `${content.trim()}\n👉 下一步：${nextStep}`;
}

function ensureElevatorFormat(content, description) {
  const trimmedContent = content.trim();

  if (extractDescription(trimmedContent)) {
    return ensureNextStep(ensureContext(trimmedContent));
  }

  if (hasMultilineFormat(trimmedContent)) {
    return ensureNextStep(ensureContext(`${trimmedContent}\n📝 描述：${description}`));
  }

  return [
    '📣 消息推送',
    '━━━━━━━━━━━━━━━━━',
    `🎯 结论：${trimmedContent}`,
    `📝 描述：${description}`,
    ...contextLines(),
    `👉 下一步：${options.nextStep || '请按结论处理，必要时查看对应文档或日志。'}`
  ].join('\n');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatLocalTimestamp(date) {
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    ' ',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
    ':',
    pad(date.getSeconds())
  ].join('');
}

function hasMetadataLine(content, label) {
  return content.split(/\r?\n/).some((line) => line.trim().startsWith(label));
}

function ensureMetadata(content) {
  const lines = [];
  if (!hasMetadataLine(content, '🤖 模型：')) {
    lines.push(`🤖 模型：${options.model}`);
  }
  if (!hasMetadataLine(content, '🧰 工具：')) {
    lines.push(`🧰 工具：${options.tools}`);
  }
  if (!hasMetadataLine(content, '🕒 最后更新：')) {
    lines.push(`🕒 最后更新：${options.updatedAt || formatLocalTimestamp(new Date())}`);
  }

  return lines.length ? `${content.trim()}\n${lines.join('\n')}` : content.trim();
}

if (options.description) {
  const description = options.description.trim();
  if (!description) {
    console.error('Error: --description cannot be empty');
    process.exit(1);
  }
}

const description = options.description ? options.description.trim() : extractDescription(options.content);

if (!description) {
  console.error('Error: message content must include a description line: "📝 描述：<100字以内描述>" or pass --description');
  process.exit(1);
}

if (charLength(description) > 100) {
  console.error(`Error: message description must be 100 characters or fewer (current: ${charLength(description)})`);
  process.exit(1);
}

options.content = ensureMetadata(ensureElevatorFormat(options.content, description));

if (!options.webhookUrl && options.webhookKey) {
  options.webhookUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${options.webhookKey}`;
}

if (!options.webhookUrl) {
  console.error('Error: --webhook-url or --webhook-key is required, or set WEWORK_WEBHOOK_URL / WEWORK_WEBHOOK_KEY');
  process.exit(1);
}

function mask(value) {
  if (!value) return '';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function request(apiUrl, token, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl);
    const postData = JSON.stringify(data);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        Origin: 'https://effiy.cn',
        Pragma: 'no-cache',
        Referer: 'https://effiy.cn/',
        'User-Agent': 'YiWeb-wework-bot/1.0',
        'X-Token': token,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        let parsed = body;
        try {
          parsed = JSON.parse(body);
        } catch (error) {
          // Keep raw text if the service does not return JSON.
        }
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async function main() {
  const payload = {
    webhook_url: options.webhookUrl,
    content: options.content
  };

  if (options.dryRun) {
    console.log('=== WeWork Bot Dry Run ===');
    console.log('API:', options.apiUrl);
    if (options.agent) {
      console.log('Agent:', options.agent);
    }
    if (options.robot) {
      console.log('Robot:', options.robot);
    }
    console.log('Token:', mask(options.token));
    console.log('Webhook:', mask(options.webhookUrl));
    console.log('Description length:', charLength(description));
    console.log('Content length:', options.content.length);
    console.log('Flow:', options.flow || '(not set)');
    console.log('Feature:', options.feature || '(not set)');
    console.log('Stage:', options.stage || '(not set)');
    console.log('Status:', options.status || '(not set)');
    console.log('Impact:', options.impact || '(not set)');
    console.log('Evidence:', options.evidence || '(not set)');
    console.log('Next step:', options.nextStep || '(default)');
    console.log('Model:', options.model);
    console.log('Tools:', options.tools);
    console.log('Updated at:', options.updatedAt || '(auto current local time)');
    console.log('Content preview:');
    console.log(options.content);
    return;
  }

  try {
    const result = await request(options.apiUrl, options.token, payload);
    console.log('=== WeWork Bot Result ===');
    console.log('Status:', result.statusCode);
    console.log('Response:', typeof result.body === 'string' ? result.body : JSON.stringify(result.body));

    if (result.statusCode < 200 || result.statusCode >= 300) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
