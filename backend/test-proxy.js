const http = require('http');

http.get('http://localhost:5000/api/materials', (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    const materials = JSON.parse(body);
    const words = materials.filter(m => m.name.endsWith('.docx'));
    console.log(JSON.stringify(words, null, 2));

    if (words.length > 0) {
      const targetUrl = words[0].fileUrl;
      const proxyUrl = `http://localhost:5000/api/materials/proxy?url=${encodeURIComponent(targetUrl)}`;
      console.log('Testing proxy URL:', proxyUrl);

      http.get(proxyUrl, (proxyRes) => {
        console.log('Proxy statusCode:', proxyRes.statusCode);
        console.log('Proxy headers:', proxyRes.headers);
        proxyRes.on('data', () => {});
        proxyRes.on('end', () => console.log('Proxy stream ended.'));
      }).on('error', err => console.error('Proxy request failed:', err));
    } else {
      console.log('No word files found to test.');
    }
  });
}).on('error', (err) => console.error(err));
