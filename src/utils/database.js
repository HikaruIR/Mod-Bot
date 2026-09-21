const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class Database {
  constructor(fileName, defaultData = {}) {
    this.filePath = path.join(DATA_DIR, `${fileName}.json`);
    this.defaultData = defaultData;
    this.data = this._load();
  }

  _load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        this._save(this.defaultData);
        return JSON.parse(JSON.stringify(this.defaultData));
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`Error loading database file ${this.filePath}:`, err);
      return JSON.parse(JSON.stringify(this.defaultData));
    }
  }

  _save(data) {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error(`Error saving database file ${this.filePath}:`, err);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this._save(this.data);
    return this.data[key];
  }

  delete(key) {
    delete this.data[key];
    this._save(this.data);
  }

  all() {
    return this.data;
  }

  save() {
    this._save(this.data);
  }
}

const db = {
  panels: new Database('panels', {}),
  tickets: new Database('tickets', {}),
  giveaways: new Database('giveaways', {}),
  blacklist: new Database('blacklist', {}),
  config: new Database('config', {}),
  tempbans: new Database('tempbans', {})
};

module.exports = db;
