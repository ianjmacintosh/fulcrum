/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['./src/**/*.{test,spec}.?(c|m)[jt]s?(x)']

    },
})