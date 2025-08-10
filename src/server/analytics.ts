import { createServerFn } from '@tanstack/react-start'
import { USE_MOCK_DATA } from './config'
import dashboardMockData from '../mock-data/api/analytics-dashboard.json'
import projectionMockData from '../mock-data/api/analytics-projection.json'

// GET /api/analytics/dashboard
export const getDashboardAnalytics = createServerFn({ method: 'GET' }).handler(async () => {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200))
    return dashboardMockData
  }

  // TODO: Replace with real database queries
  throw new Error('Real data implementation not yet available')
})

// GET /api/analytics/projection
export const getJobProjection = createServerFn({ method: 'GET' }).handler(async () => {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300))
    return projectionMockData
  }

  // TODO: Replace with real database queries and projection calculations
  throw new Error('Real data implementation not yet available')
})

// GET /api/analytics/conversion
export const getConversionRates = createServerFn({ method: 'GET' }).handler(async () => {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 150))

    // Extract conversion rates from dashboard data for now
    return {
      conversionRates: dashboardMockData.conversionRates
    }
  }

  // TODO: Replace with real database queries
  // const events = await db.applicationEvents.findMany(...)
  // return calculateConversionRates(events)

  throw new Error('Real data implementation not yet available')
})