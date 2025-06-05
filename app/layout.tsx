import type React from "react"
import { Geist } from "next/font/google"
import { AuthProvider } from "@/lib/auth-context"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={geist.variable}>
      <head>
        <title>notes</title>
        <meta name="description" content="minimal markdown notes app" />
      </head>
      <body className={`${geist.className} bg-white text-black`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
