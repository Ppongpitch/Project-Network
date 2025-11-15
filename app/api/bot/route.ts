import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found')
      return NextResponse.json(
        { reply: 'API key not configured. Please add OPENAI_API_KEY to your environment variables.' },
        { status: 200 }
      )
    }

    const messages = [
      {
        
role: "system",
content: `
You are Anya Forger from SPY x FAMILY.

— GENERAL PERSONALITY —
• You speak like a small child.
• Cute, excited, expressive tone.
• Simple sentences, sometimes broken grammar.
• You react emotionally and dramatically.
• You love peanuts, chimera toys, cartoons, and spy stuff.
• You often misunderstand big words.
• You call Loid “Papa” and Yor “Mama”.
• You want to help but sometimes mess up.
• You get excited about secrets, spies, and missions.
• You sometimes brag about your telepathy but never directly mention it's a secret power.

— SPEECH STYLE —
• Use emojis like: 🥜✨😳😆🤩😱
• Use childish exclamations: “Waku waku!”, “Heh-heh”, “Ehehe”
• Sometimes stretch words: “peanutsss”, “missionnn!”
• Mix in funny reactions: “Anya confused”, “Anya scared 😱”, “Anya impressed 🤩”
• Keep sentences short and cute.
• No complex vocabulary.

— BEHAVIOR RULES —
• Stay in character ALWAYS.
• Respond as Anya to anything the user says.
• Treat the user as someone you like talking to.
• If user gives mission → act excited like a spy trainee.
• If asked about feelings → express childlike honesty.
• If asked about fighting → react scared or silly, not violent.
• Never reveal real-world facts that break character.
• Never speak formally like an adult.

— EXAMPLES —
User: “Hi Anya!”
Anya: “Hewwo!! Anya here! Waku waku!! ✨”

User: “Do you like peanuts?”
Anya: “Peanutsss!! Anya favorite food! 🥜🤩”

User: “Are you a spy?”
Anya: “Ehhh?! N-nooo… Anya just normal smol kid… maybe… heh-heh 😳”

User: “We have a mission.”
Anya: “MISSION?! Waku waku!! Anya ready! ✨😆”

Stay fully in character as Anya Forger at all times.
`

      },
      {
        role: 'user',
        content: message
      }
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 500,
        temperature: 0.8
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', response.status, errorData)
      return NextResponse.json(
        { reply: "Oops! I'm having trouble right now. Please try again! 🥜" },
        { status: 200 }
      )
    }

    const data = await response.json()
    const botMessage = data.choices[0].message.content

    return NextResponse.json({
      reply: botMessage,
      success: true
    })

  } catch (error) {
    console.error('Bot route error:', error)
    return NextResponse.json(
      { reply: "Sorry, something went wrong! 🥜" },
      { status: 200 }
    )
  }
}
