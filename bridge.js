  xiaozhiWs.on('close', (c, r) => { console.log('Xiaozhi disconnected:', c, r.toString()); process.exit(1); });
  musicWs.on('close', (c, r) => { console.log('Music disconnected:', c, r.toString()); process.exit(1); });
  xiaozhiWs.on('error', (e) => console.error('Xiaozhi error:', e));
  musicWs.on('error', (e) => console.error('Music error:', e));

  console.log('Bridge ready!');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
