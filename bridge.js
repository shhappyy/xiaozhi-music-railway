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
              console.log('SEND:', JSON.stringify(msg).substring(0, 200));
              ws.send(JSON.stringify(msg));
}

async function main() {
              console.log('Connecting to Xiaozhi MCP...');
              const xiaozhiWs = await connect(XIAOZHI_MCP_URL);
              console.log('Connected to Xiaozhi MCP');

  console.log('Connecting to Music MCP...');
              const musicWs = await connect(MUSIC_MCP_URL);
              console.log('Connected to Music MCP');

  // 主动向小智MCP发送initialize请求（不等待响应）
  console.log('Sending initialize to Xiaozhi...');
              send(xiaozhiWs, {
                              jsonrpc: '2.0',
                              id: 1,
                              method: 'initialize',
                              params: {
                                                protocolVersion: '2024-11-05',
                                                capabilities: {},
                                                clientInfo: { name: 'music-bridge', version: '1.0.0' }
                              }
              });

  // 发送notifications/initialized
  send(xiaozhiWs, { jsonrpc: '2.0', method: 'notifications/initialized' });
              console.log('Initialize sent');

  // 纯转发：小智 -> 音乐（跳过initialize的响应）
  xiaozhiWs.on('message', (data) => {
                  const msg = data.toString();
                  console.log('XIAOZHI -> MUSIC:', msg.substring(0, 200));
                  // 跳过对我们initialize请求的响应
                   try {
                                     const parsed = JSON.parse(msg);
                                     if (parsed.id === 1 && parsed.result) {
                                                         console.log('Skipping initialize response');
                                                         return;
                                     }
                   } catch (e) {}
                  musicWs.send(msg);
  });

  // 纯转发：音乐 -> 小智
  musicWs.on('message', (data) => {
                  const msg = data.toString();
                  console.log('MUSIC -> XIAOZHI:', msg.substring(0, 200));
                  xiaozhiWs.send(msg);
  });

  xiaozhiWs.on('close', (c, r) => {
                  console.log('Xiaozhi disconnected:', c, r.toString());
                  setTimeout(() => process.exit(1), 5000);
  });
              musicWs.on('close', (c, r) => {
                              console.log('Music disconnected:', c, r.toString());
                              setTimeout(() => process.exit(1), 5000);
              });
              xiaozhiWs.on('error', (e) => console.error('Xiaozhi error:', e));
              musicWs.on('error', (e) => console.error('Music error:', e));

  console.log('Bridge ready!');
}

main().catch((e) => { console.error('Fatal:', e); setTimeout(() => process.exit(1), 5000); });
