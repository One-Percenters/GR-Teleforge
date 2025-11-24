import { NextResponse } from 'next/server';
import { getMockRaceTimeline } from '../../components/dashboard/raceData';
import type { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

// Path to Python script and data directory
const PYTHON_SCRIPT = path.join(process.cwd(), '..', 'ai-model', 'process_race_data.py');
const DATA_DIR = path.join(process.cwd(), '..', 'data', 'raw');

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const folder = searchParams.get('folder');
        const useMock = searchParams.get('useMock') === 'true';

        // If no folder specified or useMock flag is set, return mock data
        if (!folder || useMock) {
            console.log('[race-timeline] Using mock data');
            const timeline = getMockRaceTimeline();

            const metadata = folder ? {
                trackName: folder.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                raceName: 'Mock Race Data',
                folder,
            } : {};

            return NextResponse.json({
                timeline,
                metadata,
                source: 'mock',
            });
        }

        // Build folder path
        const folderPath = path.join(DATA_DIR, folder);

        // Check if folder exists
        if (!existsSync(folderPath)) {
            console.error(`[race-timeline] Folder not found: ${folderPath}`);
            return NextResponse.json(
                { error: 'Data folder not found', folder: folderPath },
                { status: 404 }
            );
        }

        // Check if Python script exists
        if (!existsSync(PYTHON_SCRIPT)) {
            console.error(`[race-timeline] Python script not found: ${PYTHON_SCRIPT}`);
            // Fall back to mock data
            const timeline = getMockRaceTimeline();
            return NextResponse.json({
                timeline,
                metadata: { folder },
                source: 'mock',
                warning: 'Python processor not available',
            });
        }

        try {
            // Call Python script to process race data
            console.log(`[race-timeline] Processing folder: ${folderPath}`);
            const { stdout, stderr } = await execAsync(
                `python "${PYTHON_SCRIPT}" "${folderPath}"`,
                {
                    timeout: 30000, // 30 second timeout
                    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                }
            );

            if (stderr) {
                console.log(`[race-timeline] Python stderr:`, stderr);
            }

            // Parse JSON output
            const result = JSON.parse(stdout);

            // Check for errors in result
            if (result.error) {
                console.error(`[race-timeline] Processing error:`, result.error);
                // Fall back to mock data
                const timeline = getMockRaceTimeline();
                return NextResponse.json({
                    timeline,
                    metadata: { folder },
                    source: 'mock',
                    warning: result.error,
                });
            }

            console.log(`[race-timeline] Successfully processed: ${result.stats?.totalFrames || 0} frames`);

            return NextResponse.json({
                ...result,
                source: 'real',
            });

        } catch (execError: any) {
            console.error('[race-timeline] Python execution error:', execError.message);

            // Fall back to mock data
            const timeline = getMockRaceTimeline();
            const trackName = folder.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            return NextResponse.json({
                timeline,
                metadata: {
                    trackName,
                    raceName: trackName,
                    folder,
                },
                source: 'mock',
                warning: 'Failed to process real data, using mock data',
            });
        }

    } catch (err: any) {
        console.error('[race-timeline] API error:', err);
        return NextResponse.json(
            { error: 'Error generating timeline', details: err.message },
            { status: 500 }
        );
    }
}
