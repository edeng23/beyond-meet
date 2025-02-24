import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Beyond Meet',
    description: 'Visualize your social connection graph',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
} 