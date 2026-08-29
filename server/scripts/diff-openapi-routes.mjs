import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function extractRoutes(src) {
  const out = [];
  const re =
    /app\.(get|post|put|patch|delete|all)(?:<[^>]*>)?\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    out.push({
      method: m[1].toUpperCase(),
      path: m[2].replace(/:([A-Za-z]+)/g, '{$1}'),
    });
  }
  return out;
}

function extractOpenApiOps(specSrc) {
  const ops = [];
  const pathKeyRe = /'(\/[^']+)':\s*\{/g;
  const pathsIdx = specSrc.indexOf('paths: {');
  const pathsBlock = specSrc.slice(pathsIdx);
  const starts = [];
  let pm;
  while ((pm = pathKeyRe.exec(pathsBlock))) {
    starts.push({ path: pm[1], index: pm.index });
  }
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].index;
    const end = i + 1 < starts.length ? starts[i + 1].index : pathsBlock.length;
    const block = pathsBlock.slice(start, end);
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      if (new RegExp(`\\n\\s*${method}:\\s*\\{`).test(block)) {
        ops.push({ method: method.toUpperCase(), path: starts[i].path });
      }
    }
  }
  return ops;
}

const implemented = [
  ...extractRoutes(read('server/src/http/routes-auth.ts')),
  ...extractRoutes(read('server/src/http/routes-api.ts')),
  ...extractRoutes(read('server/src/index.ts')),
  ...extractRoutes(read('server/src/mcp/server.ts')),
];

const spec = read('server/src/openapi/spec.ts');
const openapi = extractOpenApiOps(spec);

const implRest = implemented
  .filter((r) => r.path !== '/mcp' && r.path !== '/openapi.json' && r.path !== '/docs')
  .map((r) => `${r.method} ${r.path}`);
const oaRest = openapi.filter((r) => r.path !== '/mcp').map((r) => `${r.method} ${r.path}`);

const implSet = new Set(implRest);
const oaSet = new Set(oaRest);

console.log('Implemented REST+health:', [...implSet].sort().join('\n'));
console.log('---');
console.log('OpenAPI REST+health:', [...oaSet].sort().join('\n'));
console.log('---');
console.log(
  'Missing in OpenAPI:',
  [...implSet].filter((x) => !oaSet.has(x))
);
console.log(
  'Extra in OpenAPI:',
  [...oaSet].filter((x) => !implSet.has(x))
);

const tags = {};
for (const t of [
  'Health',
  'Setup',
  'Auth',
  'Projects',
  'Columns',
  'Tasks',
  'Members',
  'Tokens',
  'Settings',
  'Audit',
  'MCP',
]) {
  tags[t] = (spec.match(new RegExp(`tags: \\['${t}'\\]`, 'g')) || []).length;
}
console.log('Tag counts:', tags);
console.log('Total OpenAPI ops:', openapi.length);
console.log('MCP in OpenAPI:', openapi.filter((o) => o.path === '/mcp'));
console.log('MCP in routes:', implemented.filter((o) => o.path === '/mcp'));
