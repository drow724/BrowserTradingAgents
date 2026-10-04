// node run_baseline.js <set.json> <out.json>
const {extractTodos} = require('./baseline.js'), fs = require('fs');
const convs = JSON.parse(fs.readFileSync(process.argv[2]));
fs.writeFileSync(process.argv[3], JSON.stringify(Object.fromEntries(convs.map(c => [c.id, extractTodos(c)])), null, 1));
