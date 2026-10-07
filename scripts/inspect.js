const fs = require('fs');
const code = fs.readFileSync('C:\\Program Files\\Krishna Decor Manager\\resources\\manager-app\\assets\\index-BHJVE_gg.js', 'utf8');
const m = code.match(/https?:\/\/[^\s"'<>]+/g);
console.log('URLs in installed index.js:', m);
