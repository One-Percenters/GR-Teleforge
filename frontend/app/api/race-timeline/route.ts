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

            // Mock virtual best lap analysis for each driver
            const analysis = {
                '7': {
                    bestS1: 28.234,
                    bestS2: 31.567,
                    bestS3: 29.891,
                    virtualBest: 89.692,
                    actualBest: 90.145,
                    potentialGain: 0.453
                },
                '13': {
                    bestS1: 28.112,
                    bestS2: 31.423,
                    bestS3: 29.765,
                    virtualBest: 89.300,
                    actualBest: 89.856,
                    potentialGain: 0.556
                },
                '55': {
                    bestS1: 28.345,
                    bestS2: 31.678,
                    bestS3: 29.934,
                    virtualBest: 89.957,
                    actualBest: 90.423,
                    potentialGain: 0.466
                },
                '99': {
                    bestS1: 28.456,
                    bestS2: 31.789,
                    bestS3: 30.123,
                    virtualBest: 90.368,
                    actualBest: 90.912,
                    potentialGain: 0.544
                }
            };

            // Mock tire degradation data for each driver
            const tireDegradation = {
                '7': {
                    driverId: 7,
                    lapTimes: [90.145, 90.234, 90.312, 90.445, 90.523, 90.612, 90.723, 90.834, 90.945, 91.056,
                        91.167, 91.278, 91.389, 91.500, 91.611, 91.722, 91.833, 91.944, 92.055, 92.166],
                    lapNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                    degradationRate: 0.106,
                    optimalPitLap: 15,
                    optimalPitWindow: [13, 17],
                    confidence: 0.96,
                    baselineTime: 90.145,
                    totalLaps: 20
                },
                '13': {
                    driverId: 13,
                    lapTimes: [89.856, 89.923, 90.012, 90.123, 90.245, 90.356, 90.467, 90.578, 90.689, 90.800,
                        90.911, 91.022, 91.133, 91.244, 91.355, 91.466, 91.577, 91.688, 91.799, 91.910],
                    lapNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                    degradationRate: 0.108,
                    optimalPitLap: 14,
                    optimalPitWindow: [12, 16],
                    confidence: 0.94,
                    baselineTime: 89.856,
                    totalLaps: 20
                },
                '55': {
                    driverId: 55,
                    lapTimes: [90.423, 90.534, 90.623, 90.734, 90.845, 90.956, 91.067, 91.178, 91.289, 91.400,
                        91.511, 91.622, 91.733, 91.844, 91.955, 92.066, 92.177, 92.288, 92.399, 92.510],
                    lapNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                    degradationRate: 0.110,
                    optimalPitLap: 16,
                    optimalPitWindow: [14, 18],
                    confidence: 0.92,
                    baselineTime: 90.423,
                    totalLaps: 20
                },
                '99': {
                    driverId: 99,
                    lapTimes: [90.912, 91.023, 91.134, 91.245, 91.356, 91.467, 91.578, 91.689, 91.800, 91.911,
                        92.022, 92.133, 92.244, 92.355, 92.466, 92.577, 92.688, 92.799, 92.910, 93.021],
                    lapNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                    degradationRate: 0.111,
                    optimalPitLap: 17,
                    optimalPitWindow: [15, 19],
                    confidence: 0.93,
                    baselineTime: 90.912,
                    totalLaps: 20
                }
            };

            return NextResponse.json({
                timeline,
                metadata,
                analysis,
                tireDegradation,
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
