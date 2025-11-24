import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = 'AIzaSyDpwOCHsNxrW1hL4x3YdA9LPpOGmICooqQ';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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

    const prompt = `You are a professional motorsport race engineer analyzing telemetry data. 
    
An overtake occurred during a GR86 Cup race at ${event.Track || 'the track'}:
- Winner: Car ${event.Winner_ID.split('-').pop()}
- Overtaken: Car ${event.Loser_ID.split('-').pop()}
- Location: Sector ${event.Sector_ID}
- Lap: ${event.Lap_Number}
${event.Reason_Code ? `- Primary Factor: ${event.Reason_Code.replace(/_/g, ' ')}` : ''}
${event.Reason_Value ? `- Delta Value: ${event.Reason_Value.toFixed(2)}` : ''}

Provide a brief 2-3 sentence technical analysis explaining:
1. What likely happened based on the data
2. What the overtaken driver could have done differently

Keep it concise and technical, like a real race engineer would explain to a driver.`;

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return NextResponse.json({ 
        analysis: 'Analysis unavailable. The overtake was likely due to better positioning through the corner.' 
      });
    }

    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      'Analysis unavailable.';

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ 
      analysis: 'Analysis unavailable at this time.' 
    });
  }
}

