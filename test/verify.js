const assert = require('assert');
const { parseDuration, formatDuration } = require('../src/utils/timeParser');
const db = require('../src/utils/database');

console.log('Testing timeParser...');
assert.strictEqual(parseDuration('10s'), 10000);
assert.strictEqual(parseDuration('5m'), 300000);
assert.strictEqual(parseDuration('2h'), 7200000);
assert.strictEqual(parseDuration('1d'), 86400000);
assert.strictEqual(parseDuration('1w'), 604800000);
assert.strictEqual(formatDuration(86400000), '1d');
assert.strictEqual(formatDuration(3600000 * 2 + 60000 * 15), '2h 15m');
console.log('✅ timeParser tests passed!');

console.log('Testing database...');
db.config.set('test_key', { value: 123 });
const testVal = db.config.get('test_key');
assert.strictEqual(testVal.value, 123);
db.config.delete('test_key');
assert.strictEqual(db.config.get('test_key'), undefined);
console.log('✅ database tests passed!');

console.log('Testing commands loading...');
const fs = require('fs');
const path = require('path');

function getCommandFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getCommandFiles(fullPath));
    } else if (item.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const commandFiles = getCommandFiles(path.join(__dirname, '..', 'src', 'commands'));
assert(commandFiles.length >= 10, 'Expected at least 10 commands');
for (const file of commandFiles) {
  const cmd = require(file);
  assert(cmd.name, `Command at ${file} is missing name`);
  assert(typeof cmd.execute === 'function', `Command at ${file} is missing execute function`);
  console.log(`Verified command: !${cmd.name}`);
}

console.log('✅ All verified successfully!');
