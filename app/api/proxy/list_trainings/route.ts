import { NextResponse } from "next/server"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://word-psicho-server.onrender.com"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    const response = await fetch(`${BACKEND_URL}/list_trainings${url.search}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json({ error: "Failed to fetch from backend" }, { status: 500 })
  }
}
