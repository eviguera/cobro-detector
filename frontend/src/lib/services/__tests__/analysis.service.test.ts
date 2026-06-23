import { NoCreditsError } from '../analysis.service'

describe('NoCreditsError', () => {
  it('has the correct name and message', () => {
    const error = new NoCreditsError()
    expect(error.name).toBe('NoCreditsError')
    expect(error.message).toBe('Sin créditos disponibles')
    expect(error).toBeInstanceOf(Error)
  })
})

describe('analysis service exports', () => {
  it('exports all required functions', async () => {
    const service = await import('../analysis.service')
    expect(typeof service.uploadFileToStorage).toBe('function')
    expect(typeof service.createAnalysisWithPlan).toBe('function')
    expect(typeof service.executeAndStoreAnalysis).toBe('function')
    expect(typeof service.enqueueAnalysisFallback).toBe('function')
    expect(typeof service.markAnalysisError).toBe('function')
    expect(typeof service.getCreditsLeft).toBe('function')
  })
})
