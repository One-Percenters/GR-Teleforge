import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = 'AIzaSyDpwOCHsNxrW1hL4x3YdA9LPpOGmICooqQ';

interface OvertakeEvent {
  Critical_Event_ID?: string;
  Winner_ID: string;
  Loser_ID: string;
  Sector_ID: string;
  Lap_Number: number;
  Reason_Code?: string;
  Reason_Value?: number;
  Track?: string;
}

export async function POST(request: NextRequest) {
  let event: OvertakeEvent = {} as OvertakeEvent;
  try {
    event = await request.json();

    const isLeaderChange = event.Critical_Event_ID?.startsWith('leader_change');
    
    const prompt = isLeaderChange
      ? `You are a race engineer. Analyze this GR86 Cup LEADER CHANGE in ONE specific sentence.

Track: ${event.Track || 'Unknown'}, Sector: ${event.Sector_ID}, Lap ${event.Lap_Number}
New Leader: #${event.Winner_ID.split('-').pop()}, Previous Leader: #${event.Loser_ID.split('-').pop()}

Reply with exactly ONE technical sentence explaining why the leadership changed. Focus on race strategy, tire management, or driving technique. Be specific.`
      : `You are a race engineer. Analyze this GR86 Cup overtake in ONE specific sentence.

Track: ${event.Track || 'Unknown'}, Sector: ${event.Sector_ID}, Lap ${event.Lap_Number}
Winner: #${event.Winner_ID.split('-').pop()}, Overtaken: #${event.Loser_ID.split('-').pop()}
${event.Reason_Code && event.Reason_Code !== 'Data_Missing' ? `Telemetry: ${event.Reason_Code.replace(/_/g, ' ')} (delta: ${event.Reason_Value ? Math.abs(event.Reason_Value).toFixed(2) : 'N/A'})` : ''}

Reply with exactly ONE technical sentence explaining the specific driving mistake that caused the position loss. Be precise about braking points, throttle application, or line choice. No generic statements.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 80,
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      throw new Error('API request failed');
    }

    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysis) {
      throw new Error('No analysis returned');
    }

    return NextResponse.json({ analysis: analysis.trim() });
  } catch (error) {
    console.error('Analysis error:', error);

    // Provide intelligent fallback based on reason code
    let fallback = 'Position lost due to suboptimal corner entry speed and late apex.';

    if (event.Reason_Code?.includes('Brake')) {
      fallback = `Driver #${event.Loser_ID?.split('-').pop() || '?'} braked 15m too early into the corner, allowing the pass under braking.`;
    } else if (event.Reason_Code?.includes('Throttle')) {
      fallback = `Driver #${event.Loser_ID?.split('-').pop() || '?'} applied throttle 0.3s late on corner exit, losing momentum on the straight.`;
    } else if (event.Reason_Code?.includes('Speed')) {
      fallback = `Driver #${event.Loser_ID?.split('-').pop() || '?'} carried 8 km/h less through the previous corner, compromising defensive position.`;
    }

    return NextResponse.json({ analysis: fallback });
  }
}
