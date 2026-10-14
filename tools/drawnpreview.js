const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const pg = await b.newPage(); await pg.setViewport({ width: 1500, height: 620 });
  const hs = ['chateau-peyredon-lagravette-blanc-2024', 'lambrusco-di-sorbara', 'sauvignon-atlantique-2023', 'gift-card-100-00', 'gift-bags'];
  await pg.goto('http://localhost:8123/404.html');
  await pg.setContent('<body style="margin:0;background:#fcf4ec;display:flex;gap:16px;padding:16px">' + hs.map((h) => '<div style="width:280px;height:580px;background:#f2e2d7;display:flex;align-items:flex-end;justify-content:center;padding:30px 0 40px"><img src="http://localhost:8123/assets/wines/drawn/' + h + '-v3.svg" style="max-height:100%;max-width:80%"></div>').join('') + '</body>');
  await new Promise((r) => setTimeout(r, 1500));
  await pg.screenshot({ path: 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/drawn.png' });
  await b.close();
})();
