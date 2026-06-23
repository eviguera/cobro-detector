jest.mock('react', () => {
  const actual = jest.requireActual('react')
  return {
    ...actual,
    cache: <T extends (...args: any[]) => any>(fn: T): T => {
      const cached = new Map<string, ReturnType<T>>()
      return ((...args: any[]) => {
        const key = JSON.stringify(args)
        if (cached.has(key)) return cached.get(key)
        const result = fn(...args)
        if (result instanceof Promise) {
          return result.then((val) => {
            cached.set(key, val)
            return val
          })
        }
        cached.set(key, result)
        return result
      }) as T
    },
  }
})
