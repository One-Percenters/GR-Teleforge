import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Configure the data directory - adjust this to your actual data location
const DATA_DIR = path.join(process.cwd(), '..', 'data', 'raw');

async function hasRaceData(folderPath: string): Promise<boolean> {
    try {
        const entries = await fs.readdir(folderPath);
        // Check if folder contains race data files (CSV files with analysis or telemetry)
        return entries.some(file =>
            file.toLowerCase().includes('analysis') ||
            file.toLowerCase().includes('telemetry') ||
            file.toLowerCase().includes('lap_time')
        );
    } catch {
        return false;
    }
}

export async function GET() {
    try {
        // Check if data directory exists
        try {
            await fs.access(DATA_DIR);
        } catch {
            // Directory doesn't exist, return empty array
            return NextResponse.json([]);
        }

        // Read all folders in the data directory
        const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
        const folders = entries.filter(entry => entry.isDirectory());

        // Build data source objects
        const dataSources = await Promise.all(
            folders.map(async (folder) => {
                const folderPath = path.join(DATA_DIR, folder.name);
                const stats = await fs.stat(folderPath);

                // Check for sub-folders (nested races)
                let subRaces: any[] = [];
                try {
                    const subEntries = await fs.readdir(folderPath, { withFileTypes: true });
                    const subFolders = subEntries.filter(entry => entry.isDirectory());

                    // Check each subfolder to see if it contains race data
                    for (const subFolder of subFolders) {
                        const subPath = path.join(folderPath, subFolder.name);
                        const hasData = await hasRaceData(subPath);

                        if (hasData) {
                            const subStats = await fs.stat(subPath);

                            // Try to find metadata for sub-race
                            let subMetadata: any = {};
                            try {
                                const metadataPath = path.join(subPath, 'metadata.json');
                                const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                                subMetadata = JSON.parse(metadataContent);
                            } catch {
                                // Infer from folder name
                                subMetadata = {
                                    raceName: subFolder.name,
                                };
                            }

                            subRaces.push({
                                id: `${folder.name}/${subFolder.name}`,
                                name: subFolder.name,
                                path: subPath,
                                lastModified: subStats.mtime.toISOString(),
                                metadata: subMetadata,
                            });
                        }
                    }
                } catch (err) {
                    console.error(`Error scanning sub-folders in ${folder.name}:`, err);
                }

                // Try to find metadata file for parent folder
                let metadata: any = {};
                try {
                    const metadataPath = path.join(folderPath, 'metadata.json');
                    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                    metadata = JSON.parse(metadataContent);
                } catch {
                    // No metadata file, try to infer from folder name
                    const trackName = folder.name
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    metadata = { trackName };
                }

                // Check if this folder itself has race data
                const hasOwnData = await hasRaceData(folderPath);

                return {
                    id: folder.name,
                    name: folder.name,
                    path: folderPath,
                    lastModified: stats.mtime.toISOString(),
                    metadata,
                    hasRaceData: hasOwnData,
                    subRaces: subRaces.length > 0 ? subRaces : undefined,
                };
            })
        );

        return NextResponse.json(dataSources);
    } catch (error) {
        console.error('Error listing data sources:', error);
        return NextResponse.json(
            { error: 'Failed to list data sources' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folderId = searchParams.get('id');

        if (!folderId) {
            return NextResponse.json(
                { error: 'Missing folder ID' },
                { status: 400 }
            );
        }

        // Sanitize folder ID to prevent path traversal attacks
        // Allow alphanumeric, hyphens, underscores, spaces, and forward slashes for sub-folders
        // But STRICTLY disallow ".." to prevent traversing up
        if (folderId.includes('..')) {
            return NextResponse.json(
                { error: 'Invalid folder ID' },
                { status: 400 }
            );
        }

        // Allow letters, numbers, hyphens, underscores, spaces, and slashes
        const sanitizedId = folderId.replace(/[^a-zA-Z0-9-_\/\s]/g, '');

        if (sanitizedId !== folderId) {
            return NextResponse.json(
                { error: 'Invalid characters in folder ID' },
                { status: 400 }
            );
        }

        const folderPath = path.join(DATA_DIR, folderId);

        // Verify the folder exists and is within DATA_DIR
        try {
            await fs.access(folderPath);
            const realPath = await fs.realpath(folderPath);
            const realDataDir = await fs.realpath(DATA_DIR);

            if (!realPath.startsWith(realDataDir)) {
                throw new Error('Invalid folder path');
            }
        } catch {
            return NextResponse.json(
                { error: 'Folder not found' },
                { status: 404 }
            );
        }

        // Delete the folder recursively
        await fs.rm(folderPath, { recursive: true, force: true });

        console.log(`[data-sources] Deleted folder: ${folderPath}`);

        return NextResponse.json({
            success: true,
            deletedId: folderId,
        });
    } catch (error: any) {
        console.error('Error deleting data source:', error);
        return NextResponse.json(
            { error: 'Failed to delete folder', details: error.message },
            { status: 500 }
        );
    }
}
