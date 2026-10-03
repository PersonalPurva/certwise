// Tiny local web server for testing CertWise: node serve.js  ->  http://localhost:5173
// (You can also just double-click index.html - the site has no backend.)
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = 5173;
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };

http.createServer((req, res) => {
  let file = decodeURIComponent(req.url.split("?")[0]);
  if (file === "/") file = "/index.html";
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT)) {           // block ../ tricks
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(full)] || "text/plain" });
    res.end(data);
  });
}).listen(PORT, () => console.log("CertWise running at http://localhost:" + PORT));
