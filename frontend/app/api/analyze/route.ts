import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = 'AIzaSyDpwOCHsNxrW1hL4x3YdA9LPpOGmICooqQ';

interface OvertakeEvent {
  Winner_ID: string;
  Loser_ID: string;
  Sector_ID: string;
  Lap_Number: number;
  Reason_Code?: string;
  Reason_Value?: number;
  Track?: string;
}

export async function POST(request: NextRequest) {
  try {
    const event: OvertakeEvent = await request.json();

    const prompt = `You are a professional motorsport race engineer analyzing telemetry data from a GR86 Cup race.

An overtake occurred:
- Track: ${event.Track || 'Unknown'}
- Winner: Car #${event.Winner_ID.split('-').pop()}
- Overtaken: Car #${event.Loser_ID.split('-').pop()}
- Sector: ${event.Sector_ID}
- Lap: ${event.Lap_Number}
${event.Reason_Code && event.Reason_Code !== 'Data_Missing' ? `- Telemetry Factor: ${event.Reason_Code.replace(/_/g, ' ')}` : ''}
${event.Reason_Value ? `- Delta: ${Math.abs(event.Reason_Value).toFixed(2)}` : ''}

Provide a 2-3 sentence technical analysis:
1. What driving technique likely caused this pass
2. One actionable tip for the overtaken driver

Be concise and technical like a race engineer.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
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
    const event = await request.json().catch(() => ({})) as OvertakeEvent;
    let fallback = 'The overtake was completed successfully through superior positioning.';
    
    if (event.Reason_Code?.includes('Brake')) {
      fallback = 'The pass was made under braking. The winning driver carried more speed into the corner and braked later while maintaining control. The overtaken driver may have braked too early or lost momentum on corner exit.';
    } else if (event.Reason_Code?.includes('Throttle')) {
      fallback = 'The pass occurred due to better throttle application on corner exit. The winning driver got on the power earlier and more progressively. Focus on smoother throttle inputs to maximize traction.';
    } else if (event.Reason_Code?.includes('Speed')) {
      fallback = 'The overtake was made using a significant speed advantage. The winning driver carried more momentum through the previous section. Work on maintaining better flow through the preceding corners.';
    }
    
    return NextResponse.json({ analysis: fallback });
  }
}
