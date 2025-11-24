import { createServer } from "node:http";

const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Server is running!");
});

server.listen(5000, "127.0.0.1", () => {
  console.log("Server running on 127.0.0.1:5000");
});
