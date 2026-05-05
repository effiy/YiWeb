#!/usr/bin/env node

/**
 * collect-self-improvement
 *
 * Scans docs/<feature>.md for Workflow Standardization Review and
 * System Architecture Evolution Thinking sections, aggregates them,
 * and writes a weekly Markdown report.
 *
 * Usage:
 *   node scripts/collect-self-improvement.js [--week <YYYY-MM-DD>] [--output <path>] [--json]
 *
 * Options:
 *   --week <date>    Natural-week start date (default: this Monday)
 *   --output <path>  Save aggregate Markdown to file (default: stdout)
 *   --json           Output JSON instead of Markdown
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_DIR = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const CACHE_FILE = path.join(REPO_ROOT, 'docs', '.memory', 'self-improvement-cache.jsonl');

function printHelp() {
  console.log(`Usage:
  node scripts/collect-self-improvement.js [--week <YYYY-MM-DD>] [--output <path>] [--json]

Options:
  --week <date>    Natural-week start date (default: this Monday)
  --output <path>  Save to file (default: stdout)
  --json           Output JSON (default: Markdown)
`);
}

function parseArgs(argv) {
  const out = { week: null, output: null, json: false };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else if (a === '--week') out.week = args[++i];
    else if (a === '--output') out.output = args[++i];
    else if (a === '--json') out.json = true;
  }
  return out;
}

function getDefaultWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

function getWeekRange(weekStart) {
  const start = new Date(weekStart + 'T00:00:00.000Z');
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toISOString().slice(0, 10)}~${end.toISOString().slice(0, 10)}`;
}

function getFileWeekRange(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const mtime = stat.mtime;
    const day = mtime.getDay();
    const diff = mtime.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(mtime);
    monday.setDate(diff);
    return getWeekRange(monday.toISOString().slice(0, 10));
  } catch {
    return getWeekRange(getDefaultWeekStart());
  }
}

async function findFeatureDocs() {
  const features = [];
  try {
    const entries = await fsp.readdir(DOCS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
        features.push({ feature: path.basename(entry.name, '.md'), files: [path.join(DOCS_DIR, entry.name)] });
      }
    }
  } catch {
    // ignore
  }
  return features;
}

function extractSection(text, startRegex, endRegex) {
  const lines = text.split('\n');
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (startRegex.test(lines[i])) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (endRegex.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx + 1, endIdx).join('\n');
}

function extractAnswer(block, questionNumber) {
  if (!block) return { answer: 'missing', evidence: 'missing' };
  const qRegex = new RegExp(`^${questionNumber}\\.\\s*\\*\\*(.+?)\\*\\*`, 'im');
  const qMatch = block.match(qRegex);
  if (!qMatch) return { answer: 'missing', evidence: 'missing' };

  const answerMatch = block.match(/Answer:\s*(Yes|No|Partial|N\/A)/i);
  const evidenceMatch = block.match(/Evidence:\s*(.+?)(?=\n\s*(?:\d+\.|## )|$)/is);

  return {
    answer: answerMatch ? answerMatch[1].trim() : 'missing',
    evidence: evidenceMatch ? evidenceMatch[1].trim().replace(/\s+/g, ' ') : 'missing'
  };
}

function extractArchitecture(block) {
  if (!block) return { bottleneck: 'missing', evolution_node: 'missing', risk_rollback: 'missing' };

  const bottleneckMatch = block.match(/\*\*A1[.\s]*Current architecture bottleneck.*?\n\s*(?:-\s*)?(.+?)(?=\n\s*(?:-\s*\*\*A2|## )|$)/is);
  const evolutionMatch = block.match(/\*\*A2[.\s]*Next natural evolution node.*?\n\s*(?:-\s*)?(.+?)(?=\n\s*(?:-\s*\*\*A3|## )|$)/is);
  const riskMatch = block.match(/\*\*A3[.\s]*Risks and rollback plans.*?\n\s*(?:-\s*)?(.+?)(?=\n\s*(?:## )|$)/is);

  return {
    bottleneck: bottleneckMatch ? bottleneckMatch[1].trim().replace(/\s+/g, ' ') : 'missing',
    evolution_node: evolutionMatch ? evolutionMatch[1].trim().replace(/\s+/g, ' ') : 'missing',
    risk_rollback: riskMatch ? riskMatch[1].trim().replace(/\s+/g, ' ') : 'missing'
  };
}

async function processDocument(feature, filePath) {
  const text = await fsp.readFile(filePath, 'utf8');
  const doc = path.basename(filePath);
  const week = getFileWeekRange(filePath);

  const wfBlock = extractSection(
    text,
    /^##\s+Workflow Standardization Review\s*$/i,
    /^(##\s+System Architecture Evolution Thinking|##\s+)\s*$/i
  );

  const archBlock = extractSection(
    text,
    /^##\s+System Architecture Evolution Thinking\s*$/i,
    /^##\s+\s*$/i
  );

  const hasWf = !!wfBlock && wfBlock.trim().length > 0;
  const hasArch = !!archBlock && archBlock.trim().length > 0;

  if (!hasWf || !hasArch) {
    // Log P1 gap
    const missing = [];
    if (!hasWf) missing.push('Workflow Standardization Review');
    if (!hasArch) missing.push('System Architecture Evolution Thinking');
    console.error(`P1 gap: missing ${missing.join(' and ')} in docs/${feature}.md`);
  }

  const record = {
    feature,
    doc,
    week,
    workflow: {
      q1: extractAnswer(wfBlock, '1'),
      q2: extractAnswer(wfBlock, '2'),
      q3: extractAnswer(wfBlock, '3'),
      q4: extractAnswer(wfBlock, '4')
    },
    architecture: extractArchitecture(archBlock),
    extracted_at: new Date().toISOString()
  };

  return record;
}

async function writeCache(record) {
  const dir = path.dirname(CACHE_FILE);
  await fsp.mkdir(dir, { recursive: true });
  await fsp.appendFile(CACHE_FILE, JSON.stringify(record) + '\\n', 'utf8');
}

function formatMarkdown(records, weekRange) {
  const lines = [];
  lines.push(`# Self-Improvement Aggregate (${weekRange})`);
  lines.push('');
  lines.push(`> Generated by \`self-improving\` — do not edit manually.`);
  lines.push(`> **Generated at**: ${new Date().toISOString()}`);
  lines.push('');

  if (records.length === 0) {
    lines.push('> No reflection data collected this week.');
    lines.push('');
    return lines.join('\\n');
  }

  const total = records.length;
  const missingWf = records.filter(r => r.workflow.q1.answer === 'missing').length;
  const missingArch = records.filter(r => r.architecture.bottleneck === 'missing').length;

  lines.push('## Workflow Standardization Review Summary');
  lines.push('');
  lines.push('### Per-Feature Table');
  lines.push('');
  lines.push('| Feature | Doc | Q1 Repeat Ops | Q2 Fuzzy Decision | Q3 Info Silo | Q4 Feedback Loop |');
  lines.push('|---------|-----|---------------|-------------------|--------------|------------------|');
  records.forEach(r => {
    const q1 = `${r.workflow.q1.answer} — ${r.workflow.q1.evidence.substring(0, 40)}...`;
    const q2 = `${r.workflow.q2.answer} — ${r.workflow.q2.evidence.substring(0, 40)}...`;
    const q3 = `${r.workflow.q3.answer} — ${r.workflow.q3.evidence.substring(0, 40)}...`;
    const q4 = `${r.workflow.q4.answer} — ${r.workflow.q4.evidence.substring(0, 40)}...`;
    lines.push(`| ${r.feature} | ${r.doc} | ${q1} | ${q2} | ${q3} | ${q4} |`);
  });
  lines.push('');

  // Cross-feature patterns
  const repeatOps = records.filter(r => r.workflow.q1.answer === 'Yes');
  const fuzzyDecisions = records.filter(r => r.workflow.q2.answer === 'Yes');
  const infoSilos = records.filter(r => r.workflow.q3.answer === 'Yes');
  const feedbackGaps = records.filter(r => r.workflow.q4.answer === 'No');

  lines.push('### Cross-Feature Patterns');
  lines.push('');
  lines.push(`- **Repeated manual operations**: ${repeatOps.length} feature(s)`);
  repeatOps.forEach(r => lines.push(`  - \`${r.feature}\` (${r.doc}): ${r.workflow.q1.evidence.substring(0, 80)}...`));
  lines.push(`- **Missing decision criteria**: ${fuzzyDecisions.length} feature(s)`);
  fuzzyDecisions.forEach(r => lines.push(`  - \`${r.feature}\` (${r.doc}): ${r.workflow.q2.evidence.substring(0, 80)}...`));
  lines.push(`- **Information silos**: ${infoSilos.length} feature(s)`);
  infoSilos.forEach(r => lines.push(`  - \`${r.feature}\` (${r.doc}): ${r.workflow.q3.evidence.substring(0, 80)}...`));
  lines.push(`- **Feedback loop gaps**: ${feedbackGaps.length} feature(s)`);
  feedbackGaps.forEach(r => lines.push(`  - \`${r.feature}\` (${r.doc}): ${r.workflow.q4.evidence.substring(0, 80)}...`));
  lines.push('');

  lines.push('## System Architecture Evolution Thinking Summary');
  lines.push('');
  lines.push('### Per-Feature Table');
  lines.push('');
  lines.push('| Feature | Doc | A1 Bottleneck | A2 Evolution Node | A3 Risk & Rollback |');
  lines.push('|---------|-----|---------------|-------------------|--------------------|');
  records.forEach(r => {
    const b = r.architecture.bottleneck.substring(0, 40);
    const e = r.architecture.evolution_node.substring(0, 40);
    const ri = r.architecture.risk_rollback.substring(0, 40);
    lines.push(`| ${r.feature} | ${r.doc} | ${b} | ${e} | ${ri} |`);
  });
  lines.push('');

  // Group by bottleneck
  const bottleneckGroups = {};
  records.forEach(r => {
    const b = r.architecture.bottleneck;
    if (b === 'missing' || b === 'none' || b === 'N/A') return;
    bottleneckGroups[b] = bottleneckGroups[b] || [];
    bottleneckGroups[b].push(r);
  });

  lines.push('### Cross-Feature Patterns');
  lines.push('');
  Object.entries(bottleneckGroups).forEach(([b, rs]) => {
    lines.push(`- **Shared bottleneck \`${b}\`**: ${rs.length} feature(s)`);
    rs.forEach(r => lines.push(`  - \`${r.feature}\` (${r.doc}): ${r.architecture.evolution_node.substring(0, 80)}...`));
  });
  lines.push('');

  lines.push('## Data Quality');
  lines.push('');
  lines.push(`- Total documents scanned: ${total}`);
  lines.push(`- Documents with missing Workflow Standardization Review: ${missingWf}`);
  lines.push(`- Documents with missing System Architecture Evolution Thinking: ${missingArch}`);
  lines.push(`- Coverage rate: ${total > 0 ? (((total - Math.max(missingWf, missingArch)) / total) * 100).toFixed(0) : 0}%`);
  lines.push('');

  return lines.join('\\n');
}

async function main() {
  const opts = parseArgs(process.argv);
  const weekStart = opts.week || getDefaultWeekStart();
  const weekRange = getWeekRange(weekStart);

  const features = await findFeatureDocs();
  const records = [];

  for (const { feature, files } of features) {
    for (const file of files) {
      try {
        const record = await processDocument(feature, file);
        records.push(record);
        await writeCache(record);
      } catch (err) {
        console.error(`Error processing ${file}: ${err.message}`);
      }
    }
  }

  const filtered = records.filter(r => r.week === weekRange);

  if (opts.json) {
    const out = { week: weekRange, record_count: records.length, filtered_count: filtered.length, records: filtered };
    const text = JSON.stringify(out, null, 2);
    if (opts.output) {
      await fsp.mkdir(path.dirname(opts.output), { recursive: true });
      await fsp.writeFile(opts.output, text, 'utf8');
      console.log(`✓ Saved to ${opts.output}`);
    } else {
      console.log(text);
    }
    return;
  }

  const md = formatMarkdown(filtered, weekRange);
  if (opts.output) {
    await fsp.mkdir(path.dirname(opts.output), { recursive: true });
    await fsp.writeFile(opts.output, md, 'utf8');
    console.log(`✓ Saved to ${opts.output}`);
  } else {
    console.log(md);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
