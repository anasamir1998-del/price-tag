import localtunnel from 'localtunnel';

let currentTunnel = null;

async function startTunnel() {
  try {
    if (currentTunnel) {
      try {
        currentTunnel.close();
      } catch (e) {}
    }
    const tunnel = await localtunnel({ port: 3000, subdomain: 'pricetag-store-app' });
    currentTunnel = tunnel;
    console.log('TUNNEL_ONLINE:' + tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 2s...');
      setTimeout(startTunnel, 2000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
      setTimeout(startTunnel, 3000);
    });
  } catch (err) {
    console.error('Tunnel connect failed, retrying in 3s...', err);
    setTimeout(startTunnel, 3000);
  }
}

// Keep process active
setInterval(() => {
  // heartbeat
}, 10000);

startTunnel();
