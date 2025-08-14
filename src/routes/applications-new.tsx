import React, { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { requireUserAuth } from '../utils/route-guards'
import './applications-new.css'

export const Route = createFileRoute('/applications-new')({
    beforeLoad: requireUserAuth,
    component: NewApplication,
})

function NewApplication() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        companyName: '',
        roleName: '',
        jobPostingUrl: '',
        appliedDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        jobBoard: '',
        applicationType: 'cold' as 'cold' | 'warm',
        roleType: '',
        locationType: 'on-site' as 'on-site' | 'hybrid' | 'remote',
        notes: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setSuccessMessage('')

        // Simulate form submission (dummy functionality as requested)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setSuccessMessage('Application submitted successfully! (This is a preview - not saved to database yet)')
        setIsSubmitting(false)
        
        // Reset form after successful submission
        setTimeout(() => {
            setFormData({
                companyName: '',
                roleName: '',
                jobPostingUrl: '',
                appliedDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
                jobBoard: '',
                applicationType: 'cold',
                roleType: '',
                locationType: 'on-site',
                notes: ''
            })
            setSuccessMessage('')
        }, 3000)
    }

    const handleCancel = () => {
        router.navigate({ to: '/applications' })
    }

    return (
        <div className="page">
            <header className="page-header">
                <h1>Add New Application</h1>
                <p>Record a new job application to track your progress</p>
            </header>

            <main className="page-content">
                <div className="form-container">
                    <form onSubmit={handleSubmit} className="application-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="companyName">Company Name *</label>
                                <input
                                    type="text"
                                    id="companyName"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                    placeholder="e.g., TechCorp Inc."
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="roleName">Job Title *</label>
                                <input
                                    type="text"
                                    id="roleName"
                                    name="roleName"
                                    value={formData.roleName}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                    placeholder="e.g., Senior Software Engineer"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="jobPostingUrl">Job URL</label>
                                <input
                                    type="url"
                                    id="jobPostingUrl"
                                    name="jobPostingUrl"
                                    value={formData.jobPostingUrl}
                                    onChange={handleInputChange}
                                    disabled={isSubmitting}
                                    placeholder="https://company.com/careers/job-id"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="appliedDate">Applied Date *</label>
                                <input
                                    type="date"
                                    id="appliedDate"
                                    name="appliedDate"
                                    value={formData.appliedDate}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="jobBoard">Job Board *</label>
                                <select
                                    id="jobBoard"
                                    name="jobBoard"
                                    value={formData.jobBoard}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select job board...</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="indeed">Indeed</option>
                                    <option value="glassdoor">Glassdoor</option>
                                    <option value="otta">Otta</option>
                                    <option value="company_site">Company Site</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="roleType">Role Type *</label>
                                <select
                                    id="roleType"
                                    name="roleType"
                                    value={formData.roleType}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                >
                                    <option value="">Select role type...</option>
                                    <option value="manager">Manager</option>
                                    <option value="engineer">Engineer</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Application Type *</label>
                                <div className="radio-group">
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="applicationType"
                                            value="cold"
                                            checked={formData.applicationType === 'cold'}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        />
                                        <span>Cold Apply</span>
                                    </label>
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="applicationType"
                                            value="warm"
                                            checked={formData.applicationType === 'warm'}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        />
                                        <span>Warm Apply</span>
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Location Type *</label>
                                <div className="radio-group">
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="locationType"
                                            value="on-site"
                                            checked={formData.locationType === 'on-site'}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        />
                                        <span>On-site</span>
                                    </label>
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="locationType"
                                            value="hybrid"
                                            checked={formData.locationType === 'hybrid'}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        />
                                        <span>Hybrid</span>
                                    </label>
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="locationType"
                                            value="remote"
                                            checked={formData.locationType === 'remote'}
                                            onChange={handleInputChange}
                                            disabled={isSubmitting}
                                        />
                                        <span>Remote</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="notes">Additional Notes</label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                disabled={isSubmitting}
                                placeholder="Any additional notes about this application..."
                                rows={4}
                            />
                        </div>

                        {successMessage && (
                            <div className="success-message">
                                {successMessage}
                            </div>
                        )}

                        <div className="form-actions">
                            <button 
                                type="button" 
                                onClick={handleCancel}
                                className="cancel-button"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="submit-button"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Submitting...' : 'Add Application'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}