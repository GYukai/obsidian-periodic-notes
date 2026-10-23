const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moment = require('moment');
function load(file, requireModule) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(code, {exports, require: requireModule, window: global.window, console});
  return exports;
}
const boundary = load('src/dayStart.ts', require);
for (const [now, start, expected] of [
  ['2026-10-23T03:59:59', undefined, '2026-10-22'],
  ['2026-10-23T04:00:00', '04:00', '2026-10-23'],
  ['2026-10-23T12:00:00', '04:00', '2026-10-23'],
  ['2026-11-01T00:00:00', '04:00', '2026-10-31'],
  ['2027-01-01T03:00:00', '04:00', '2026-12-31'],
  ['2024-03-01T03:00:00', '04:00', '2024-02-29'],
  ['2026-10-23T00:00:00', '00:00', '2026-10-23'],
  ['2026-10-23T06:29:59', '06:30', '2026-10-22'],
  ['2026-10-23T06:30:00', '06:30', '2026-10-23'],
  ['2026-10-23T03:00:00', '99:99', '2026-10-22'],
]) {
  const input = moment(now), original = input.valueOf();
  assert.equal(boundary.getCurrentPeriodDate('daily', input, start).format('YYYY-MM-DD'), expected);
  assert.equal(input.valueOf(), original);
}
for (const p of ['weekly','monthly','quarterly','yearly']) {
  assert.equal(boundary.getCurrentPeriodDate(p, moment('2027-01-01T02:00:00'), '04:00').format('YYYY-MM-DD'), '2027-01-01');
}
process.env.TZ = 'America/New_York';
for (const [date, expected] of [['2026-03-08T03:59:00','2026-03-07'], ['2026-03-08T04:00:00','2026-03-08'], ['2026-11-01T03:59:00','2026-10-31'], ['2026-11-01T04:00:00','2026-11-01']]) {
  assert.equal(boundary.getCurrentPeriodDate('daily', moment(date), '04:00').format('YYYY-MM-DD'), expected);
}
// Exercise the real command callback with a fixed clock and a fake vault interface.
let configuredStart = '04:00';
let opened;
let created;
const seen = [];
global.window = {
  moment: () => moment('2026-10-23T03:59:00'),
  app: {
    plugins: {getPlugin: () => ({settings: {dayStartTime: configuredStart}})},
    workspace: {getUnpinnedLeaf: () => ({openFile: async f => {opened = f;}})}
  }
};
const daily = {getAllDailyNotes: () => ({}), getDailyNote: date => {seen.push(date.format('YYYY-MM-DD'));}, createDailyNote: async date => {created = date.format('YYYY-MM-DD'); return {path: created};}};
const commands = load('src/commands.ts', id => id === './dayStart' ? boundary : id === 'obsidian-daily-notes-interface' ? daily : id === 'obsidian' ? {} : {});
(async () => {
  await commands.getCommands('daily')[0].callback();
  assert.equal(created, '2026-10-22'); assert.equal(opened.path, created); assert.equal(seen[0], created);
  configuredStart = '00:00';
  await commands.openCurrentPeriodicNote('daily', false);
  assert.equal(created, '2026-10-23');
  configuredStart = '04:00';
  await commands.openPeriodicNote('daily', moment('2026-10-23T00:00:00'), false);
  assert.equal(created, '2026-10-23', 'Explicit dates must not be shifted twice');
  console.log('PASS: cutoff, midnight, custom minutes, invalid defaults, month/year/leap-day/DST, unchanged periods, command lookup/create/open, live setting changes, explicit dates');
})().catch(err => { console.error(err); process.exitCode = 1; });
