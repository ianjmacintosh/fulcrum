import { test, expect } from '@playwright/test'

test.describe('Event Recording Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to applications page
    await page.goto('/applications')
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Applications')
  })

  test('should complete full event recording workflow', async ({ page }) => {
    // Step 1: Click on an application card to navigate to details
    const firstApplicationCard = page.locator('.application-card').first()
    await expect(firstApplicationCard).toBeVisible()
    
    // Click the entire card (which should now be clickable)
    await firstApplicationCard.click()
    
    // Verify we're on the application details page
    await expect(page.locator('h1')).toContainText('Application Details')
    
    // Step 2: Verify timeline table is present and has existing events
    const timelineTable = page.locator('.timeline-table')
    await expect(timelineTable).toBeVisible()
    
    const timelineRows = page.locator('.timeline-table tbody tr')
    const initialEventCount = await timelineRows.count()
    expect(initialEventCount).toBeGreaterThan(0)
    
    // Step 3: Verify event recording form is present
    const eventForm = page.locator('.event-form')
    await expect(eventForm).toBeVisible()
    
    // Step 4: Fill out the event form
    const statusSelect = page.locator('#statusId')
    const dateInput = page.locator('#eventDate')
    const notesTextarea = page.locator('#notes')
    const submitButton = page.locator('button[type="submit"]')
    
    await expect(statusSelect).toBeVisible()
    await expect(dateInput).toBeVisible()
    await expect(notesTextarea).toBeVisible()
    await expect(submitButton).toBeVisible()
    
    // Initially submit button should be disabled (form starts empty)
    await expect(submitButton).toBeDisabled()
    
    // Select a status from dropdown
    await statusSelect.selectOption({ index: 1 }) // Select first non-empty option
    
    // Set date to today (should already be default)
    const today = new Date().toISOString().split('T')[0]
    await dateInput.fill(today)
    
    // Add notes
    const testNotes = 'End-to-end test event recording'
    await notesTextarea.fill(testNotes)
    
    // Submit button should now be enabled
    await expect(submitButton).toBeEnabled()
    
    // Step 5: Submit the form
    await submitButton.click()
    
    // Wait for form submission and page refresh
    await page.waitForLoadState('networkidle')
    
    // Step 6: Verify new event appears in timeline
    const updatedTimelineRows = page.locator('.timeline-table tbody tr')
    const finalEventCount = await updatedTimelineRows.count()
    
    // Should have one more event than before
    expect(finalEventCount).toBe(initialEventCount + 1)
    
    // Verify the new event contains our test notes
    const newEventRow = updatedTimelineRows.last()
    await expect(newEventRow).toContainText(testNotes)
    
    // Step 7: Verify form was reset after successful submission
    await expect(statusSelect).toHaveValue('')
    await expect(notesTextarea).toHaveValue('')
    await expect(submitButton).toBeDisabled()
  })

  test('should handle form validation errors', async ({ page }) => {
    // Navigate to first application details
    const firstApplicationCard = page.locator('.application-card').first()
    await firstApplicationCard.click()
    await expect(page.locator('h1')).toContainText('Application Details')
    
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()
    
    // Fill only date, leave status empty
    const dateInput = page.locator('#eventDate')
    const today = new Date().toISOString().split('T')[0]
    await dateInput.fill(today)
    
    // Submit button should still be disabled without status
    await expect(submitButton).toBeDisabled()
    
    // Select status to enable form
    const statusSelect = page.locator('#statusId')
    await statusSelect.selectOption({ index: 1 })
    await expect(submitButton).toBeEnabled()
    
    // Clear date to test date validation
    await dateInput.fill('')
    await expect(submitButton).toBeDisabled()
  })

  test('should navigate back from application details', async ({ page }) => {
    // Navigate to application details
    const firstApplicationCard = page.locator('.application-card').first()
    await firstApplicationCard.click()
    await expect(page.locator('h1')).toContainText('Application Details')
    
    // Navigate back using browser back button
    await page.goBack()
    
    // Should be back on applications list page
    await expect(page.locator('h1')).toContainText('Applications')
    await expect(page.locator('.application-card')).toBeVisible()
  })

  test('should display application metadata correctly', async ({ page }) => {
    // Navigate to application details
    const firstApplicationCard = page.locator('.application-card').first()
    await firstApplicationCard.click()
    await expect(page.locator('h1')).toContainText('Application Details')
    
    // Verify application info section is present
    const applicationInfo = page.locator('.application-info')
    await expect(applicationInfo).toBeVisible()
    
    // Check for key metadata fields
    const metadata = page.locator('.application-metadata')
    await expect(metadata).toBeVisible()
    
    // Should contain application type, role type, location, current status
    await expect(metadata).toContainText('Application Type:')
    await expect(metadata).toContainText('Role Type:')
    await expect(metadata).toContainText('Location:')
    await expect(metadata).toContainText('Current Status:')
  })

  test('should handle timeline table interactions', async ({ page }) => {
    // Navigate to application details
    const firstApplicationCard = page.locator('.application-card').first()
    await firstApplicationCard.click()
    await expect(page.locator('h1')).toContainText('Application Details')
    
    // Verify timeline table structure
    const timelineTable = page.locator('.timeline-table')
    await expect(timelineTable).toBeVisible()
    
    // Check table headers
    const headers = page.locator('.timeline-table th')
    await expect(headers.nth(0)).toContainText('Date')
    await expect(headers.nth(1)).toContainText('Status')
    await expect(headers.nth(2)).toContainText('Notes')
    
    // Verify rows have hover effects (CSS should add background color on hover)
    const firstRow = page.locator('.timeline-table tbody tr').first()
    await firstRow.hover()
    
    // Check that all event data is displayed properly
    const timelineRows = page.locator('.timeline-table tbody tr')
    const rowCount = await timelineRows.count()
    
    for (let i = 0; i < rowCount; i++) {
      const row = timelineRows.nth(i)
      const cells = row.locator('td')
      
      // Each row should have 3 cells: date, status, notes
      await expect(cells).toHaveCount(3)
      
      // Date cell should not be empty
      const dateCell = cells.nth(0)
      await expect(dateCell).not.toBeEmpty()
      
      // Status cell should not be empty
      const statusCell = cells.nth(1)
      await expect(statusCell).not.toBeEmpty()
      
      // Notes cell may be empty (shows '-' for empty notes)
      const notesCell = cells.nth(2)
      await expect(notesCell).toBeVisible()
    }
  })
})