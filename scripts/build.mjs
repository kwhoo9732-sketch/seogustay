import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicDir = path.join(root, 'public');
const html = await readFile(path.join(publicDir, 'index.html'), 'utf8');

for (const match of html.matchAll(/(?:src|href)=["'](\.\/[^"'#?]+)["']/g)) {
  const target = path.resolve(publicDir, match[1]);
  if (!target.startsWith(publicDir + path.sep) || !(await stat(target)).isFile()) {
    throw new Error(`화면에서 참조하는 파일이 없습니다: ${match[1]}`);
  }
}

for (const filename of await readdir(publicDir)) {
  if (filename.endsWith('.json')) JSON.parse(await readFile(path.join(publicDir, filename), 'utf8'));
}
JSON.parse(await readFile(path.join(publicDir, 'assets/seogu-basemap.geojson'), 'utf8'));

async function checkJavaScript(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await checkJavaScript(filename);
    else if (/\.(?:mjs|js)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr || `구문 확인 실패: ${filename}`);
    }
  }
}
for (const folder of ['public', 'lib', 'api', 'scripts']) await checkJavaScript(path.join(root, folder));
for (const entry of ['api/guide.js', 'api/guide/status.js']) {
  const api = await import(new URL('../' + entry, import.meta.url));
  if (typeof api.default?.fetch !== 'function') throw new Error(`API 진입점을 확인하세요: ${entry}`);
}

const { apartments } = JSON.parse(await readFile(path.join(publicDir, 'data-housing.json'), 'utf8'));
const ids = apartments.map(item => item.id);
if (new Set(ids).size !== ids.length) throw new Error('공동주택 ID가 중복됩니다.');
console.log(`Build ready: public/ · 공동주택 ${apartments.length}개 · 정적 자산 및 API 진입점 확인`);
