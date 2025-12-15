import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/list_trainings`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.error || "Failed to fetch trainings" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Error fetching trainings list:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch trainings" },
      { status: 500 },
    )
  }
}
