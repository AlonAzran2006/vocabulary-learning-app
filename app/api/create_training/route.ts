import { NextResponse } from "next/server"

const API_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { trainingName, fileIndexes } = body

    const response = await fetch(`${API_URL}/create_training`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        training_name: trainingName,
        file_indexes: fileIndexes,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || data.message || "Failed to create training" },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating training:", error)
    return NextResponse.json({ error: "Failed to create training" }, { status: 500 })
  }
}
