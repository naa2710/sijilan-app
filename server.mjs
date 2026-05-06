import { createServer } from 'node:http';
import { API_PORT, handleRequest } from './server-handler.mjs';

const server = createServer(handleRequest);

server.listen(API_PORT, '0.0.0.0', () => {
  console.log(`Finance app server ready on http://0.0.0.0:${API_PORT}`);
});
