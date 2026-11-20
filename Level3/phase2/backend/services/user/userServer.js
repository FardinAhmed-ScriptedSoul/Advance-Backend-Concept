const http = require("node:http");

(() => {
  const port = Number(process.env.PORT || 3002);
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("user service");
  });

  server.listen(port, () => {
    console.log("I am initiated in user");
  });
})();
