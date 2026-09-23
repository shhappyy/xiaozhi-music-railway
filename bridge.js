import WebSocket from 'ws';

const XIAOZHI_MCP_URL = process.env.XIAOZHI_MCP_URL;
const MUSIC_MCP_URL = process.env.MUSIC_MCP_URL;

if (!XIAOZHI_MCP_URL || !MUSIC_MCP_URL) {
    console.error('Please set XIAOZHI_MCP_URL and MUSIC_MCP_URL');
    process.exit(1);
}

function connect(url) {
    return new Promise((resolve, reject) => {
          const ws = new WebSocket(url);
          ws.on('open', () => resolve(ws));
          ws.on('error', reject);
          setTimeout(() => reject(new Error('timeout')), 30000);
    });
}

function send(ws, msg) {
    ws.send(JSON.stringify(msg));
}

function call(ws, method, params) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    return new Promise((resolve, reject) => {
          const handler = (data) => {
                  const msg = JSON.parse(data.toString());
                  if (msg.id === id) {
                            ws.removeListener('message', handler);
                            if (msg.error) reject(msg.error);
                            else resolve(msg.result);
                  }
          };
          ws.on('message', handler);
          send(ws, { jsonrpc: '2.0', id, method, params });
          setTimeout(() => { ws.removeListener('message', handler); reject(new Error('timeout')); }, 30000);
    });
}

async function main() {
    console.log('Connecting to Xiaozhi MCP...');
    const xiaozhiWs = await connect(XIAOZHI_MCP_URL);
    console.log('Connected to Xiaozhi MCP');

  console.log('Connecting to Music MCP...');
    const musicWs = await connect(MUSIC_MCP_URL);
    console.log('Connected to Music MCP');

  console.log('Initializing Music MCP...');
    await call(musicWs, 'initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'bridge', version: '1.0.0' }
    });
    send(musicWs, { jsonrpc: '2.0', method: 'notifications/initialized' });
    console.log('Music MCP initialized');

  xiaozhiWs.on('message', async (data) => {
        const msg = JSON.parse(data.toString());
        console.log('Xiaozhi ->', msg.method || 'resp ' + msg.id);

                   if (msg.method === 'initialize') {
                           send(xiaozhiWs, {
                                     jsonrpc: '2.0', id: msg.id,
                                     result: {
                                                 protocolVersion: '2024-11-05',
                                                 capabilities: { tools: {} },
                                                 serverInfo: { name: 'music-bridge', version: '1.0.0' }
                                     }
                           });
                   } else if (msg.method === 'notifications/initialized') {
                   } else if (msg.method === 'tools/list') {
                           try {
                                     const result = await call(musicWs, 'tools/list', msg.params || {});
                                     send(xiaozhiWs, { jsonrpc: '2.0', id: msg.id, result });
                           } catch (e) {
                                     send(xiaozhiWs, { jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(e) } });
                           }
                   } else if (msg.method === 'tools/call') {
                           try {
                                     const result = await call(musicWs, 'tools/call', msg.params || {});
                                     send(xiaozhiWs, { jsonrpc: '2.0', id: msg.id, result });
                           } catch (e) {
                                     send(xiaozhiWs, { jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(e) } });
                           }
                   }
  });

  xiaozhiWs.on('close', (c, r) => { console.log('Xiaozhi disconnected:', c, r.toString()); process.exit(1); });
    musicWs.on('close', (c, r) => { console.log('Music disconnected:', c, r.toString()); process.exit(1); });
    xiaozhiWs.on('error', (e) => console.error('Xiaozhi error:', e));
    musicWs.on('error', (e) => console.error('Music error:', e));

  console.log('Bridge ready!');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
