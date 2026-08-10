import localtunnel from 'localtunnel';

(async () => {
  const tunnel = await localtunnel({ port: 8081 });

  console.log(`TUNNEL_URL=${tunnel.url}`);

  tunnel.on('close', () => {
    console.log('tunnel closed');
  });
})();
