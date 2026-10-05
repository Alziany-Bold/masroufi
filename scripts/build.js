// Builds dist/index.html: the app as a complete web page that opens in any browser.
// src/masroufi.html is the page body that is published to Claude, which adds this same
// document shell itself; outside Claude the app stores its data in the browser.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src', 'masroufi.html'), 'utf8');

const shell = (body) => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0A0A0A">
<style>
:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font:14px system-ui,sans-serif;background:#FAFAFA}
img{max-width:100%}
[hidden]{display:none!important}
</style>
</head>
<body>
${body}
</body>
</html>
`;

module.exports = { shell, src };

if (require.main === module) {
  const out = path.join(root, 'dist', 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, shell(src));
  console.log('Built', path.relative(root, out), `(${Math.round(fs.statSync(out).size / 1024)} KB)`);
}
