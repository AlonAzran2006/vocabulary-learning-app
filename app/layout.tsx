import type React from "react"
import type { Metadata } from "next"
import { Rubik } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { ServerKeepAlive } from "@/components/server-keep-alive"
import { AuthProvider } from "@/contexts/auth-context"
import "./globals.css"

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "אוצר מילים — אימונים",
  description: "אפליקציה ללימוד אוצר מילים באנגלית",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.className} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
          <Analytics />
          <ServerKeepAlive />
        </AuthProvider>
      </body>
    </html>
  )
}
