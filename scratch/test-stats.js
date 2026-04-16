const { getStats } = require('../server/services/stats.js');

(async () => {
  const stats = await getStats(process.cwd());
  console.log(JSON.stringify(stats.languageBreakdown, null, 2));
})();
