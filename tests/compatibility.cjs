const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
class Plugin {
  constructor(app) { this.app = app; this.manifest = {id: 'periodic-notes-maintained'}; this.cleanups = []; }
  register(fn) { this.cleanups.push(fn); }
  async loadData() { return {daily: {enabled: true, format: 'YYYY/MM-DD', folder: 'Journal'}, weekly: {enabled: true}}; }
  addSettingTab() {}
  addRibbonIcon() { return {detach() {}, addEventListener() {}}; }
  addCommand(command) { this.app.commands.addCommand({...command, id: `${this.manifest.id}:${command.id}`}); }
}
const obsidian = new Proxy({Plugin, addIcon() {}}, {get(target, name) { return target[name] || class {}; }});
const sandbox = {module: {exports: {}}, require(name) { return name === 'obsidian' ? obsidian : require(name); }, console, window: {}};
vm.runInNewContext(fs.readFileSync('main.js', 'utf8'), sandbox);
const Maintained = sandbox.module.exports;
const commands = new Map();
const app = {
  plugins: {plugins: {}, getPlugin(id) {return this.plugins[id];}},
  workspace: {onLayoutReady(callback) {this.ready = callback;}, trigger() {}},
  commands: {addCommand(command) {commands.set(command.id, command);}, removeCommand(id) {commands.delete(id);}}
};
sandbox.window.app = app;
(async () => {
  const plugin = new Maintained(app);
  await plugin.onload();
  assert.equal(app.plugins.getPlugin('periodic-notes'), plugin);
  assert.equal(plugin.settings.dayStartTime, '04:00');
  assert.equal(app.plugins.getPlugin('periodic-notes').settings.daily.folder, 'Journal');
  app.workspace.ready();
  const legacy = [...commands.keys()].filter(id => id.startsWith('periodic-notes:'));
  assert.ok(legacy.length > 0);
  for (const id of legacy) assert.ok(commands.has(id.replace('periodic-notes:', 'periodic-notes-maintained:')));
  const cleanupCount = plugin.cleanups.length;
  plugin.configureCommands();
  assert.equal(plugin.cleanups.length, cleanupCount);
  plugin.settings.daily.enabled = false;
  plugin.settings.weekly.enabled = false;
  plugin.configureCommands();
  assert.equal(commands.size, 0);
  for (const cleanup of plugin.cleanups.reverse()) cleanup();
  assert.equal(app.plugins.getPlugin('periodic-notes'), undefined);
  const original = {};
  app.plugins.plugins['periodic-notes'] = original;
  await assert.rejects(new Maintained(app).onload(), /Disable the original/);
  assert.equal(app.plugins.getPlugin('periodic-notes'), original);
  console.log('PASS: settings lookup, old/new commands, disabling periods, bounded cleanup, unload, original-plugin conflict');
})().catch(error => { console.error(error); process.exitCode = 1; });
