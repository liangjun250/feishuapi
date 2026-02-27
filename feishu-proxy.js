// Vercel Serverless 函数，用于代理飞书API请求，解决CORS问题

module.exports = async (req, res) => {
  // 设置CORS响应头
  res.setHeader('Access-Control-Allow-Origin', '*'); // 生产环境中应该设置具体的域名
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization');

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 从环境变量获取飞书API配置
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      return res.status(500).json({ code: 1, msg: 'Missing FEISHU_APP_ID or FEISHU_APP_SECRET environment variables' });
    }

    // 处理获取token的请求
    if (req.method === 'POST' && req.url === '/api/feishu-proxy/token') {
      const fetch = require('node-fetch');
      
      // 向飞书API发起请求
      const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_id: appId,
          app_secret: appSecret
        })
      });

      const data = await response.json();
      return res.status(200).json(data);
    }

    // 处理查询表格数据的请求
    if (req.method === 'GET' && req.url.startsWith('/api/feishu-proxy/sheet')) {
      const fetch = require('node-fetch');
      const url = new URL(req.url, 'http://localhost');
      
      const accessToken = url.searchParams.get('access_token');
      const appToken = url.searchParams.get('app_token');
      const tableId = url.searchParams.get('table_id');
      const filter = url.searchParams.get('filter');

      if (!accessToken || !appToken || !tableId) {
        return res.status(400).json({ code: 1, msg: 'Missing required parameters' });
      }

      // 构建飞书API URL
      let apiUrl = `https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/${appToken}/tables/${tableId}/records`;
      if (filter) {
        apiUrl += `?filter=${filter}`;
      }

      // 向飞书API发起请求
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(404).json({ code: 1, msg: 'Not found' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ code: 1, msg: 'Internal server error' });
  }
};
