export interface EventType {
  id: string
  name: string
  description: string
}

export class EventTypeService {
  
  getAllEventTypes(): EventType[] {
    return [
      {
        id: 'application_submitted',
        name: 'Application Submitted',
        description: 'Job application was submitted'
      },
      {
        id: 'application_viewed',
        name: 'Application Viewed',
        description: 'Employer viewed your application'
      },
      {
        id: 'follow_up_sent',
        name: 'Follow-up Sent',
        description: 'Sent follow-up message about application status'
      },
      {
        id: 'email_received',
        name: 'Email Received',
        description: 'Received email from employer'
      },
      {
        id: 'phone_screen_scheduled',
        name: 'Phone Screen Scheduled',
        description: 'Phone screening interview was scheduled'
      },
      {
        id: 'phone_screen_completed',
        name: 'Phone Screen Completed',
        description: 'Phone screening interview was completed'
      },
      {
        id: 'interview_scheduled',
        name: 'Interview Scheduled',
        description: 'In-person or video interview was scheduled'
      },
      {
        id: 'interview_completed',
        name: 'Interview Completed',
        description: 'Interview was completed'
      },
      {
        id: 'panel_interview_scheduled',
        name: 'Panel Interview Scheduled',
        description: 'Panel interview with multiple interviewers was scheduled'
      },
      {
        id: 'panel_interview_completed',
        name: 'Panel Interview Completed',
        description: 'Panel interview was completed'
      },
      {
        id: 'final_interview_scheduled',
        name: 'Final Interview Scheduled',
        description: 'Final round interview was scheduled'
      },
      {
        id: 'final_interview_completed',
        name: 'Final Interview Completed',
        description: 'Final round interview was completed'
      },
      {
        id: 'coding_challenge_assigned',
        name: 'Coding Challenge Assigned',
        description: 'Technical coding challenge was assigned'
      },
      {
        id: 'coding_challenge_submitted',
        name: 'Coding Challenge Submitted',
        description: 'Technical coding challenge was submitted'
      },
      {
        id: 'take_home_project_assigned',
        name: 'Take-home Project Assigned',
        description: 'Take-home project was assigned'
      },
      {
        id: 'take_home_project_submitted',
        name: 'Take-home Project Submitted',
        description: 'Take-home project was submitted'
      },
      {
        id: 'technical_assessment_scheduled',
        name: 'Technical Assessment Scheduled',
        description: 'Technical assessment or test was scheduled'
      },
      {
        id: 'technical_assessment_completed',
        name: 'Technical Assessment Completed',
        description: 'Technical assessment or test was completed'
      },
      {
        id: 'presentation_scheduled',
        name: 'Presentation Scheduled',
        description: 'Presentation to team or stakeholders was scheduled'
      },
      {
        id: 'presentation_completed',
        name: 'Presentation Completed',
        description: 'Presentation was completed'
      },
      {
        id: 'offer_received',
        name: 'Job Offer Received',
        description: 'Job offer was received'
      },
      {
        id: 'offer_accepted',
        name: 'Job Offer Accepted',
        description: 'Job offer was accepted'
      },
      {
        id: 'offer_declined',
        name: 'Job Offer Declined',
        description: 'Job offer was declined'
      },
      {
        id: 'offer_negotiated',
        name: 'Offer Negotiated',
        description: 'Negotiated terms of job offer'
      },
      {
        id: 'counteroffer_received',
        name: 'Counteroffer Received',
        description: 'Employer provided counteroffer'
      },
      {
        id: 'counteroffer_made',
        name: 'Counteroffer Made',
        description: 'Made counteroffer to employer'
      },
      {
        id: 'rejected_by_employer',
        name: 'Rejected by Employer',
        description: 'Application was rejected by employer'
      },
      {
        id: 'withdrew_application',
        name: 'Withdrew Application',
        description: 'Withdrew application from consideration'
      },
      {
        id: 'reference_check_requested',
        name: 'Reference Check Requested',
        description: 'Employer requested references'
      },
      {
        id: 'reference_check_completed',
        name: 'Reference Check Completed',
        description: 'Reference check was completed'
      },
      {
        id: 'background_check_initiated',
        name: 'Background Check Initiated',
        description: 'Background check process was started'
      },
      {
        id: 'background_check_completed',
        name: 'Background Check Completed',
        description: 'Background check was completed'
      },
      {
        id: 'drug_test_scheduled',
        name: 'Drug Test Scheduled',
        description: 'Drug test was scheduled'
      },
      {
        id: 'drug_test_completed',
        name: 'Drug Test Completed',
        description: 'Drug test was completed'
      },
      {
        id: 'start_date_confirmed',
        name: 'Start Date Confirmed',
        description: 'Employment start date was confirmed'
      }
    ]
  }

  getEventTypeById(id: string): EventType | null {
    return this.getAllEventTypes().find(eventType => eventType.id === id) || null
  }
}

// Export singleton instance
export const eventTypeService = new EventTypeService()