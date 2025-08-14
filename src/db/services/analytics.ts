import { applicationService } from './applications'
import { JobApplication } from '../schemas'

export class AnalyticsService {
  
  async getDashboardMetrics(userId: string) {
    // Get all applications for user
    console.log('Analytics: Fetching dashboard metrics for userId:', userId)
    const applications = await applicationService.getApplications(userId)
    console.log('Analytics: Found applications:', applications.length)
    const totalApplications = applications.length

    if (totalApplications === 0) {
      console.log('Analytics: No applications found, returning empty metrics')
      return this.getEmptyDashboardMetrics()
    }

    // Calculate monthly overview
    const monthlyOverview = this.calculateMonthlyOverview(applications)
    
    // Calculate conversion rates
    let conversionRates
    try {
      conversionRates = await this.calculateConversionRates(applications)
      console.log('Analytics: Conversion rates calculated:', conversionRates)
    } catch (error) {
      console.error('Analytics: Error calculating conversion rates:', error)
      conversionRates = [] // Fallback to empty array
    }
    
    // Calculate pipeline health
    const pipelineHealth = this.calculatePipelineHealth(applications)
    
    // Find top job board
    const topJobBoard = this.findTopJobBoard(applications)

    const result = {
      totalApplications,
      monthlyOverview,
      conversionRates,
      pipelineHealth,
      performanceInsights: {
        topJobBoard
      }
    }
    
    console.log('Analytics: Final dashboard data structure:', {
      totalApplications: result.totalApplications,
      hasConversionRates: !!result.conversionRates,
      conversionRatesLength: result.conversionRates?.length,
      hasMonthlyOverview: !!result.monthlyOverview,
      hasPipelineHealth: !!result.pipelineHealth
    })
    
    return result
  }

  async getJobProjection(userId: string) {
    const applications = await applicationService.getApplications(userId)
    
    if (applications.length === 0) {
      return this.getDefaultProjection()
    }

    // Calculate metrics for projection
    const coldApplications = applications.filter(app => app.applicationType === 'cold')
    const phoneScreens = applications.filter(app => 
      app.events.some(event => event.statusId === 'phone_screen')
    )
    
    // Calculate conversion rates
    const phoneScreenRate = coldApplications.length > 0 ? phoneScreens.length / coldApplications.length : 0
    
    // Calculate weekly application rate from recent activity (last 3 months)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    const recentApplications = applications.filter(app => app.createdAt >= threeMonthsAgo)
    const weeklyRate = recentApplications.length / 12 // 12 weeks in 3 months
    
    // Industry benchmarks for projection
    const industryOfferRate = 0.0375 // 3.75% overall conversion rate
    const appsNeededForOffer = Math.ceil(1 / industryOfferRate)
    
    // Current pipeline (non-terminal statuses)
    const activePipeline = applications.filter(app => !app.currentStatus.id.includes('declined'))
    
    // Calculate projection
    const additionalAppsNeeded = Math.max(0, appsNeededForOffer - activePipeline.length)
    const weeksToApply = additionalAppsNeeded / Math.max(weeklyRate, 1)
    const pipelineProcessingWeeks = 4 // Average time through pipeline
    const totalWeeks = weeksToApply + pipelineProcessingWeeks
    
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + (totalWeeks * 7))

    return {
      projectedTimeToOffer: {
        weeksEstimate: Math.round(totalWeeks * 10) / 10,
        targetDate: targetDate.toISOString().split('T')[0],
        confidenceLevel: 0.90,
        basedOnApplications: applications.length,
        methodology: "pipeline_projection"
      },
      calculationInputs: {
        currentPipelineApplications: activePipeline.length,
        averageApplicationsPerWeek: Math.round(weeklyRate * 10) / 10,
        stepTransitions: [
          {
            fromStatusId: 'cold_apply',
            toStatusId: 'phone_screen',
            conversionRate: Math.round(phoneScreenRate * 1000) / 1000,
            averageDays: 14
          }
        ],
        confidenceBuffer: 1.5
      },
    }
  }

  private calculateMonthlyOverview(applications: JobApplication[]) {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const thisMonth = applications.filter(app => app.createdAt >= thisMonthStart)
    const lastMonth = applications.filter(app => 
      app.createdAt >= lastMonthStart && app.createdAt <= lastMonthEnd
    )

    const trendVsPreviousMonth = lastMonth.length > 0 ? 
      ((thisMonth.length - lastMonth.length) / lastMonth.length * 100) : 0

    return {
      applicationsThisMonth: thisMonth.length,
      trendVsPreviousMonth: Math.round(trendVsPreviousMonth * 10) / 10,
      dailyAverage: Math.round((thisMonth.length / now.getDate()) * 10) / 10
    }
  }

  private async calculateConversionRates(applications: JobApplication[]) {
    console.log('Analytics: Calculating conversion rates for', applications.length, 'applications')
    
    // Debug: Log some event statusIds to see their format
    if (applications.length > 0) {
      console.log('Analytics: Sample statusIds from first application:')
      applications[0].events.forEach(event => {
        console.log(`  - ${event.statusName}: ${event.statusId}`)
      })
    }
    
    const coldApplications = applications.filter(app => app.applicationType === 'cold')
    
    // Applications that reached phone screen
    const coldPhoneScreens = applications.filter(app => 
      app.applicationType === 'cold' && 
      app.events.some(event => event.statusName === 'Phone Screen') // Use statusName instead of statusId
    )
    
    // All applications that had phone screens
    const allPhoneScreens = applications.filter(app => 
      app.events.some(event => event.statusName === 'Phone Screen')
    )
    
    // Applications that progressed past phone screen
    const round2Plus = applications.filter(app => 
      app.events.some(event => ['Round 2', 'Offer Letter Received', 'Accepted'].includes(event.statusName))
    )

    const coldToPhoneRate = coldApplications.length > 0 ? 
      coldPhoneScreens.length / coldApplications.length : 0
    
    const phoneToRound2Rate = allPhoneScreens.length > 0 ? 
      round2Plus.length / allPhoneScreens.length : 0

    return [
      {
        fromStatusId: 'cold_apply',
        fromStatusName: 'Cold Apply',
        toStatusId: 'phone_screen',
        toStatusName: 'Phone Screen',
        conversionRate: coldToPhoneRate,
        total: coldApplications.length,
        converted: coldPhoneScreens.length
      },
      {
        fromStatusId: 'phone_screen',
        fromStatusName: 'Phone Screen',
        toStatusId: 'round_2',
        toStatusName: 'Round 2',
        conversionRate: phoneToRound2Rate,
        total: allPhoneScreens.length,
        converted: round2Plus.length
      }
    ]
  }

  private calculatePipelineHealth(applications: JobApplication[]) {
    const statusCounts: { [key: string]: number } = {}
    
    // Count current statuses
    applications.forEach(app => {
      const statusId = app.currentStatus.id
      statusCounts[statusId] = (statusCounts[statusId] || 0) + 1
    })

    // Convert to array format
    const byStatus = Object.entries(statusCounts).map(([statusId, count]) => ({
      statusId,
      statusName: this.getStatusDisplayName(statusId),
      count
    }))

    // Calculate days since last application
    const sortedApps = applications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const daysSinceLastApp = sortedApps.length > 0 ? 
      Math.floor((Date.now() - new Date(sortedApps[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0

    return {
      byStatus,
      daysSinceLastApplication: daysSinceLastApp
    }
  }

  private findTopJobBoard(applications: JobApplication[]) {
    const boardStats: { [key: string]: { total: number, responses: number } } = {}
    
    applications.forEach(app => {
      const boardName = app.jobBoard.name
      if (!boardStats[boardName]) {
        boardStats[boardName] = { total: 0, responses: 0 }
      }
      
      boardStats[boardName].total++
      
      // Count as response if they got past initial application
      const hasResponse = app.events.some(event => 
        !['cold_apply', 'warm_apply'].includes(event.statusId)
      )
      if (hasResponse) {
        boardStats[boardName].responses++
      }
    })

    // Find the board with highest response rate
    let topBoard = { name: 'LinkedIn', responseRate: 0 }
    Object.entries(boardStats).forEach(([boardName, stats]) => {
      const rate = stats.total > 0 ? stats.responses / stats.total : 0
      if (rate > topBoard.responseRate) {
        topBoard = { name: boardName, responseRate: rate }
      }
    })

    return topBoard
  }

  private getStatusDisplayName(statusId: string): string {
    const displayNames: { [key: string]: string } = {
      'cold_apply': 'Cold Apply',
      'warm_apply': 'Warm Apply',
      'phone_screen': 'Phone Screen',
      'round_2': 'Round 2',
      'round_3': 'Round 3',
      'offer': 'Offer',
      'declined': 'Declined'
    }
    return displayNames[statusId] || statusId
  }

  private getEmptyDashboardMetrics() {
    return {
      totalApplications: 0,
      monthlyOverview: {
        applicationsThisMonth: 0,
        trendVsPreviousMonth: 0,
        dailyAverage: 0
      },
      conversionRates: [],
      pipelineHealth: {
        byStatus: [],
        daysSinceLastApplication: 0
      },
      performanceInsights: {
        topJobBoard: { name: 'No data', responseRate: 0 }
      }
    }
  }

  private getDefaultProjection() {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + (8 * 7)) // 8 weeks default

    return {
      projectedTimeToOffer: {
        weeksEstimate: 8.0,
        targetDate: targetDate.toISOString().split('T')[0],
        confidenceLevel: 0.90,
        basedOnApplications: 0,
        methodology: "pipeline_projection"
      },
      calculationInputs: {
        currentPipelineApplications: 0,
        averageApplicationsPerWeek: 0,
        stepTransitions: [],
        confidenceBuffer: 1.5
      },
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()