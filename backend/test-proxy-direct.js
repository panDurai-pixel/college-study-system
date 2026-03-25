const http = require('http');

const targetUrl = 'https://res.cloudinary.com/dureucgdl/raw/upload/v1774274868/study-materials/ljqqasjffhpw5xz3ezcu';
const proxyUrl = `http://localhost:5000/api/materials/proxy?url=${encodeURIComponent(targetUrl)}`;

console.log('Testing proxy URL:', proxyUrl);

http.get(proxyUrl, (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);
  let bytes = 0;
  res.on('data', d => bytes += d.length);
  res.on('end', () => console.log('Total bytes:', bytes));
}).on('error', err => console.error(err));
