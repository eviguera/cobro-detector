import { chromium } from '@playwright/test'
const BASE='http://127.0.0.1:3000'
const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage()
await p.goto(`${BASE}/`,{waitUntil:'networkidle'}); await p.screenshot({path:'/tmp/audit/look_landing.jpg',type:'jpeg',quality:70,fullPage:false})
await p.goto(`${BASE}/login`,{waitUntil:'networkidle'}); await p.screenshot({path:'/tmp/audit/look_login.jpg',type:'jpeg',quality:70,fullPage:false})
await p.fill('input[type=email]',process.env.TEST_EMAIL); await p.fill('input[type=password]',process.env.TEST_PASSWORD); await p.click('button[type=submit]'); await p.waitForTimeout(4000)
await p.goto(`${BASE}/dashboard`,{waitUntil:'networkidle'}); await p.screenshot({path:'/tmp/audit/look_dash.jpg',type:'jpeg',quality:70,fullPage:false})
await p.goto(`${BASE}/analisis`,{waitUntil:'networkidle'}); await p.screenshot({path:'/tmp/audit/look_analisis.jpg',type:'jpeg',quality:70,fullPage:false})
await b.close(); console.log('done')
