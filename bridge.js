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

async function main() {
            console.log('Connecting to Xiaozhi MCP...');
            const xiaozhiWs = await connect(XIAOZHI_MCP_URL);
            console.log('Connected to Xiaozhi MCP');

  console.log('Connecting to Music MCP...');
            const musicWs = await connect(MUSIC_MCP_URL);
            console.log('Connected to Music MCP');

  // 纯转发：小智 -> 音乐
  xiaozhiWs.on('message', (data) => {
                const msg = data.toString();
                console.log('XIAOZHI -> MUSIC:', msg.substring(0, 200));
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

  console.log('Bridge ready! Pure forwarding mode.');
}

main().catch((e) => { console.error('Fatal:', e); setTimeout(() => process.exit(1), 5000); });
