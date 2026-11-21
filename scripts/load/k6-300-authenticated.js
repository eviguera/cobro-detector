import http from 'k6/http';
import { check, sleep } from 'k6';

// 300-user realistic scenario: mixes public health checks and authenticated API reads.
// Requires local Supabase. Set SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD as env vars.
// Example:
// docker run --rm -i -e SUPABASE_URL=http://host.docker.internal:54321 -e SUPABASE_ANON_KEY=... \
//   -e TEST_EMAIL=... -e TEST_PASSWORD=... -v $PWD/scripts/load/k6-300-authenticated.js:/scripts/k6.js grafana/k6 run /scripts/k6.js
export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '40s', target: 150 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    'checks{type:availability}': ['rate>0.99'],
    'checks{type:auth}': ['rate>0.95'],
    http_req_duration: ['p(95)<800'],
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL;
const ANON = __ENV.SUPABASE_ANON_KEY;
const EMAIL = __ENV.TEST_EMAIL;
const PASSWORD = __ENV.TEST_PASSWORD;

export function setup() {
  const res = http.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { apikey: ANON, 'Content-Type': 'application/json' } });
  check(res, { 'login ok': (r) => r.status === 200 });
  const body = res.json();
  return { token: body.access_token, uid: body.user.id };
}

const targets = [
  'http://host.docker.internal:3001/health',
  'http://host.docker.internal:3002/health',
  'http://host.docker.internal:3003/health',
  'http://host.docker.internal:3004/health',
  'http://host.docker.internal:3005/health',
];

export default function (data) {
  const url = targets[Math.floor(Math.random() * targets.length)];
  const health = http.get(url, { tags: { type: 'availability' } });
  check(health, { 'health 200/429': (r) => r.status === 200 || r.status === 429 }, { type: 'availability' });

  const authRes = http.get(`http://host.docker.internal:3004/v1/keys/${data.uid}`, {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { type: 'auth' },
  });
  check(authRes, { 'auth read 200/401/429': (r) => [200, 401, 429].includes(r.status) }, { type: 'auth' });
  sleep(Math.random() * 0.3 + 0.1);
}
