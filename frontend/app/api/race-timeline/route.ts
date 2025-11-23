import { NextResponse } from 'next/server';
import { getMockRaceTimeline } from '../../components/dashboard/raceData';

export async function GET() {
    try {
        const timeline = getMockRaceTimeline();
        return NextResponse.json(timeline);
    } catch (err) {
        console.error('Failed to generate race timeline:', err);
        return new NextResponse('Error generating timeline', { status: 500 });
    }
}
