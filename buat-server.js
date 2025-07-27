export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metode tidak diizinkan' });
  }

  const { username, plan } = req.body;
  if (!username || !plan) {
    return res.status(400).json({ success: false, message: 'Username dan plan wajib diisi' });
  }

  // Konfigurasi API Pterodactyl Panel
  const PANEL_URL = 'https://denishost.zizz.my.id';
  const API_KEY = 'ptla_uSEuBZL9yhiXbZ3rGmxeE2JNm4MztncluJnTExSnzmX';
  const CA_KEY = 'ptlc_JuPl3uZUFxJ4epIgDE37YTzNVPOO6og4zpzEfo3tQJh';

  const planMap = {
    '1gb': { ram: 1024, disk: 1024, cpu: 100 },
    '2gb': { ram: 2048, disk: 2048, cpu: 200 },
    '4gb': { ram: 4096, disk: 4096, cpu: 300 },
    'unli': { ram: 99999, disk: 99999, cpu: 999 }
  };

  const userInfo = planMap[plan.toLowerCase()];
  if (!userInfo) {
    return res.status(400).json({ success: false, message: 'Plan tidak valid' });
  }

  const password = Math.random().toString(36).slice(-8);
  const tanggal = new Date().toLocaleDateString('id-ID');

  try {
    // Cek apakah user sudah ada
    const existing = await fetch(`${PANEL_URL}/api/application/users?filter[email]=${username}@gmail.com`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const existingData = await existing.json();
    let userId;

    if (existingData.data && existingData.data.length > 0) {
      userId = existingData.data[0].attributes.id;
    } else {
      // Buat user baru
      const userRes = await fetch(`${PANEL_URL}/api/application/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          email: `${username}@gmail.com`,
          first_name: username,
          last_name: 'Panel',
          password: password
        })
      });

      const userJson = await userRes.json();
      userId = userJson.attributes.id;
    }

    // Buat server
    const eggId = 15; // Sesuaikan dengan ID Egg kamu
    const locationId = 1; // Sesuaikan dengan ID Lokasi kamu
    const nestId = 1; // Sesuaikan dengan ID Nest kamu
    const dockerImage = 'ghcr.io/parkervcp/yolks:nodejs_18';

    const serverRes = await fetch(`${PANEL_URL}/api/application/servers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: `${username}-server`,
        user: userId,
        egg: eggId,
        docker_image: dockerImage,
        startup: "npm start",
        environment: {
          STARTUP_CMD: "npm start"
        },
        limits: {
          memory: userInfo.ram,
          swap: 0,
          disk: userInfo.disk,
          io: 500,
          cpu: userInfo.cpu
        },
        feature_limits: {
          databases: 1,
          backups: 1,
          allocations: 1
        },
        deploy: {
          locations: [locationId],
          dedicated_ip: false,
          port_range: []
        },
        start_on_completion: true,
        nest: nestId
      })
    });

    const serverJson = await serverRes.json();
    if (!serverJson.attributes) throw new Error('Gagal membuat server');

    return res.status(200).json({
      success: true,
      result: {
        username,
        password,
        plan,
        tanggal,
        loginURL: `${PANEL_URL}`
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}