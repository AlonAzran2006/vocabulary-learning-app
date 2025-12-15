import { NextResponse } from "next/server"

const API_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fileIndex, wordId, testGrade } = body

    const response = await fetch(`${API_URL}/update_knowing_grade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_index: fileIndex,
        word_id: wordId,
        test_grade: testGrade,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || data.message || "Failed to update grade" },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating grade:", error)
    return NextResponse.json({ error: "Failed to update grade" }, { status: 500 })
  }
}
