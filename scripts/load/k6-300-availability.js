import http from 'k6/http';
import { check, sleep } from 'k6';

// 300-user availability smoke. Distinguishes rate-limiting (429) from server errors.
// Run: docker run --rm -i -v $PWD/scripts/load/k6-300-availability.js:/scripts/k6.js grafana/k6 run /scripts/k6.js
export const options = {
  stages: [
    { duration: '20s', target: 100 },
    { duration: '40s', target: 300 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    'checks{type:availability}': ['rate>0.95'],
    http_req_duration: ['p(95)<1500'],
  },
};

const targets = [
  'http://host.docker.internal:3001/health',
  'http://host.docker.internal:3002/health',
  'http://host.docker.internal:3003/health',
  'http://host.docker.internal:3004/health',
  'http://host.docker.internal:3005/health',
];

export default function () {
  const url = targets[Math.floor(Math.random() * targets.length)];
  const res = http.get(url, { tags: { type: 'availability' } });
  check(res, { 'status 200 or 429': (r) => r.status === 200 || r.status === 429 }, { type: 'availability' });
  sleep(Math.random() * 0.3 + 0.1);
}
