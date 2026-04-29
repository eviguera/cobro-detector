const https = require('https');

const SUPABASE_URL = 'https://mcwqqcngfibhgluvixlu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jd3FxY25nZmliaGdsdXZpeGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQxNDE0NywiZXhwIjoyMDkyOTkwMTQ3fQ.zx7s2k7jiNlt5FppH9jVKTdjXyzEGt7zaf8WMKNyzOE';

const fs = require('fs');
const schema = fs.readFileSync('./supabase/schema.sql', 'utf8');

const options = {
  hostname: 'mcwqqcngfibhgluvixlu.supabase.co',
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY
  }
};

// Intentamos ejecutar el SQL usando la API de Supabase Management
// En realidad necesitamos usar el SQL endpoint
const sqlOptions = {
  hostname: 'mcwqqcngfibhgluvixlu.supabase.co',
  path: '/pg/v1/sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY
  }
};

const req = https.request(sqlOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(JSON.stringify({ query: schema }));
req.end();
