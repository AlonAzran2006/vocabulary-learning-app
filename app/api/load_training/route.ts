import { NextResponse } from "next/server"

const API_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { trainingName } = body

    const response = await fetch(`${API_URL}/load_training`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        training_name: trainingName,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || data.message || "Failed to load training" },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error loading training:", error)
    return NextResponse.json({ error: "Failed to load training" }, { status: 500 })
  }
}
