/**
 * Parses duration strings like 10s, 5m, 2h, 1d, 7d into milliseconds.
 */
function parseDuration(str) {
  if (!str) return null;
  
  // Try regex matching
  const match = String(str).trim().match(/^(\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hours?|d|days?|w|weeks?)$/i);
  if (!match) {
    // If it's pure numbers, default to minutes
    if (/^\d+$/.test(str)) {
      return parseInt(str, 10) * 60 * 1000;
    }
    return null;
  }

  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit[0]) {
    case 's':
      return num * 1000;
    case 'm':
      return num * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    case 'w':
      return num * 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

/**
 * Formats milliseconds into human-readable Persian/English time
 */
function formatDuration(ms) {
  if (!ms || ms <= 0) return '0s';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && days === 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
}

module.exports = {
  parseDuration,
  formatDuration
};
