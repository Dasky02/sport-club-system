/** Render the logical DBML model locally; no schema or credentials leave the machine. */
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const toolsDirectory = process.argv[2];
if (!toolsDirectory) {
  throw new Error('Usage: node scripts/generate_erd.mjs /path/to/tools/node_modules');
}
const requireTools = createRequire(join(resolve(toolsDirectory), '__erd__.cjs'));
for (const [name, expected] of [['@dbml/core', '10.3.1'], ['@viz-js/viz', '3.31.0']]) {
  const metadata = JSON.parse(await readFile(join(resolve(toolsDirectory), name, 'package.json'), 'utf8'));
  if (metadata.version !== expected) throw new Error(`${name}: expected ${expected}, got ${metadata.version}`);
}
const { Parser } = requireTools('@dbml/core');
const { instance } = await import(pathToFileURL(requireTools.resolve('@viz-js/viz')).href);
const source = await readFile(join(projectRoot, 'docs/sport-club.dbml'), 'utf8');
// The current DBML syntax (including checks and optional relationships) needs dbmlv2.
const database = Parser.parse(source, 'dbmlv2').export();
const schema = database.schemas.find(item => item.name === 'public');
if (!schema) throw new Error('The logical model must contain the public schema.');

const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const dotString = value => JSON.stringify(String(value));
const colors = ['#e0ecff', '#e1f3e8', '#fff1d6', '#e9e2ff', '#ffe3ed', '#dff4f3', '#edf0f4', '#f1e7db'];
const foreignKeys = new Map(schema.tables.map(table => [table.name, new Set()]));
for (const reference of schema.refs) {
  // Mark both ends of the relation: composite and one-to-one keys remain visible.
  for (const endpoint of reference.endpoints) {
    for (const field of endpoint.fieldNames) foreignKeys.get(endpoint.tableName)?.add(field);
  }
}

const graph = [
  'digraph schema {',
  'graph [rankdir=LR, bgcolor="white", pad=0.4, nodesep=0.4, ranksep=1.0, splines=polyline, fontname="Helvetica", fontsize=16, compound=true];',
  'node [shape=plain, fontname="Helvetica", fontsize=12];',
  'edge [color="#8895a8", fontname="Helvetica", fontsize=10, arrowsize=0.65];',
  'label="Sport club system — cílový model (implementovaný rozsah: database.md)\\nPK = primární klíč; R = sloupec vztahu; ! = povinné; vějíř = více záznamů. Podmínky platnosti: database.md.";',
  'labelloc=t;',
];
const rendered = new Set();
function renderTable(table, color) {
  rendered.add(table.name);
  const primaryKeys = new Set(table.fields.filter(field => field.pk).map(field => field.name));
  for (const index of table.indexes.filter(item => item.pk)) {
    for (const column of index.columns) primaryKeys.add(column.value);
  }
  const rows = table.fields.map(field => {
    const keys = [primaryKeys.has(field.name) ? 'PK' : '', foreignKeys.get(table.name).has(field.name) ? 'R' : ''].filter(Boolean).join(', ');
    const required = field.not_null || primaryKeys.has(field.name) ? ' !' : '';
    return `<TR><TD ALIGN="LEFT" PORT="${escapeHtml(field.name)}">${escapeHtml(field.name)}${keys ? ` <FONT COLOR="#52627a">[${keys}]</FONT>` : ''}</TD><TD ALIGN="LEFT"><FONT COLOR="#52627a">${escapeHtml(field.type.type_name)}${required}</FONT></TD></TR>`;
  });
  graph.push(`${dotString(table.name)} [label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5" COLOR="#d0d8e4"><TR><TD COLSPAN="2" BGCOLOR="${color}"><B>${escapeHtml(table.name)}</B></TD></TR>${rows.join('')}</TABLE>>];`);
}
for (const [index, group] of (schema.tableGroups || []).entries()) {
  graph.push(`subgraph ${dotString(`cluster_${group.name}`)} { label=${dotString(group.name)}; color="#dce3ed"; style="rounded";`);
  for (const entry of group.tables) {
    const table = schema.tables.find(item => item.name === entry.tableName);
    if (!table) throw new Error(`Missing table: ${entry.tableName}`);
    renderTable(table, colors[index % colors.length]);
  }
  graph.push('}');
}
for (const table of schema.tables.filter(item => !rendered.has(item.name))) renderTable(table, '#edf0f4');
for (const reference of schema.refs) {
  const [left, right] = reference.endpoints;
  const marker = endpoint => endpoint.relation === '*' ? 'crow' : 'tee';
  const endpoint = item => `${dotString(item.tableName)}:${dotString(item.fieldNames[0])}`;
  const description = `${left.tableName}(${left.fieldNames.join(', ')}) — ${right.tableName}(${right.fieldNames.join(', ')})`;
  graph.push(`${endpoint(left)} -> ${endpoint(right)} [dir=both, arrowtail=${marker(left)}, arrowhead=${marker(right)}, tooltip=${dotString(description)}];`);
}
graph.push('}');
const viz = await instance();
const result = viz.render(graph.join('\n'), { format: 'svg', engine: 'dot' });
if (result.status !== 'success') throw new Error(result.errors.map(error => error.message).join('\n'));
const svg = result.output.replace(/<!-- Generated by graphviz[^]*?-->/, '<!-- Generated locally from docs/sport-club.dbml by scripts/generate_erd.mjs. -->');
await writeFile(join(projectRoot, 'docs/ERD diagram.svg'), svg);
console.log(`Rendered ${schema.tables.length} tables and ${schema.refs.length} relationships from DBML.`);
