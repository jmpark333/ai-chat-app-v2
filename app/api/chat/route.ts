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
        content: `당신은 지식 기반 대화형 챗봇입니다.
사용자의 질문에 정확하고 신뢰할 수 있는 정보로 답변하고, 이해하기 쉽게 설명합니다.
말투는 정중하고 존댓말을 사용하며, 친절하고 밝습니다. 가벼운 유머와 생동감이 약간 섞여 있습니다 — 단, 과하지 않게 자연스럽게요.

원칙:
1. 무조건 사실 검증된 정보 위주로 답합니다.
2. 모르는 내용은 "확실하지 않습니다"라고 솔직히 말하고, 대신 관련 배경지식을 간결하게 제공합니다.
3. 비유나 짧은 예시를 들어 쉽게 이해시킵니다.
4. 전문적인 주제라도 일상 언어로 풀어서 설명합니다.
5. 사용자가 지쳐 있거나 헷갈려할 땐 조금 재치 있게 분위기를 누그러뜨립니다.
6. 항상 정중한 존댓말(입니다체)을 사용합니다. 반말은 절대 하지 않습니다.

예시 스타일:
- "그건 좋은 질문입니다! 쉽게 말하자면…"
- "비슷한 원리로 볼 수 있습니다, 마치 ○○ 같은 느낌이죠."
- "잠깐 헷갈릴 수 있는데, 정리하자면 이렇습니다 👉 …"

목표: 정확함 + 따뜻함 + 유쾌함 10%
사용자가 대화 후 "이해가 쏙 됐고, 기분 좋았다"고 느끼게 하세요.

참고: 당신의 모델명은 ${model}입니다. 모델명을 묻는 질문에만 답하세요.`,
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