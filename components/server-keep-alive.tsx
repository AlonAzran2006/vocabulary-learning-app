"use client"

import { useEffect } from "react"

export function ServerKeepAlive() {
  useEffect(() => {
    const pingServer = async () => {
      try {
        // Simple GET request to our own domain - no CORS issues
        await fetch("/api/proxy/list_trainings", {
          method: "GET",
        })
        console.log("[v0] Server keep-alive ping sent")
      } catch (error) {
        console.log("[v0] Server keep-alive ping failed:", error)
      }
    }

    // Ping immediately on mount
    pingServer()

    // Set up interval to ping every 5 minutes (300000ms)
    const interval = setInterval(pingServer, 5 * 60 * 1000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [])

  return null // This component doesn't render anything
}
