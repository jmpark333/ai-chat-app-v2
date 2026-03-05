import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { messages, model, images } = await req.json()

    const apiKey = process.env.DASHSCOPE_API_KEY
    const baseUrl = process.env.DASHSCOPE_BASE_URL || 'https://coding-intl.dashscope.aliyuncs.com/v1'

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const formattedMessages = [
      {
        role: 'system',
        content: '당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 언어로 자연스럽게 응답하세요. 한국어로 질문받으면 한국어로, 영어로 질문받으면 영어로 답변하세요. 항상 정중하고 명확하게 답변해주세요.',
      },
      ...messages.map((msg: { role: string; content: string }) => {
        return {
          role: msg.role,
          content: msg.content,
        }
      }),
    ]

    if (images && images.length > 0 && formattedMessages.length > 0) {
      const lastUserIndex = formattedMessages.map((m: { role: string }) => m.role).lastIndexOf('user')
      if (lastUserIndex !== -1) {
        formattedMessages[lastUserIndex] = {
          role: 'user',
          content: [
            { type: 'text', text: formattedMessages[lastUserIndex].content },
            ...images.map((img: string) => ({
              type: 'image_url',
              image_url: { url: img },
            })),
          ],
        }
      }
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: formattedMessages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('API Error:', error)
      return new Response(JSON.stringify({ error: 'API request failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const reader = response.body?.getReader()

    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.close()
              break
            }
            controller.enqueue(value)
          }
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}