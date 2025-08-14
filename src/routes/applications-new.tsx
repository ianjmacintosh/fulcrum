import React, { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { requireUserAuth } from '../utils/route-guards'
import './applications-new.css'

export const Route = createFileRoute('/applications-new')({
    beforeLoad: requireUserAuth,
    component: NewApplication,
})

function NewApplication() {
    return (
        <div className="page">
            <header className="page-header">
                <h1>Add New Application</h1>
                <p>Record a new job application to track your progress</p>
            </header>
            <main className="page-content">
                <div style={{padding: '2rem', backgroundColor: '#f0f0f0', borderRadius: '8px'}}>
                    <h2>🚧 Form Under Construction</h2>
                    <p>This is a test to verify the route is working. The form will be added back once we confirm this displays correctly.</p>
                    <button onClick={() => alert('Route is working!')}>Test Button</button>
                </div>
            </main>
        </div>
    )
}