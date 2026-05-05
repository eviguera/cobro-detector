// Test de conexión a Upstash Redis
const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: 'https://cool-bengal-115547.upstash.io',
  token: 'gQAAAAAAAcNbAAIgcDIyMzY5ODcwZDZkYWY0NWMxYjg1ZDE4ZjI1ZWU0NmJjYg',
})

async function test() {
  try {
    const pong = await redis.ping()
    console.log('✅ Redis conectado:', pong)
    
    // Test de rate limit
    const key = 'test-rate-limit'
    await redis.incr(key)
    const val = await redis.get(key)
    console.log('✅ Test de escritura:', val)
    await redis.del(key)
    console.log('✅ Test completado')
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

test()
