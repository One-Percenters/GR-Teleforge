import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Configure upload directory
const UPLOAD_DIR = path.join(process.cwd(), '..', 'data', 'raw');

// Configure this route to accept large file uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Set body size limit to 500MB for large telemetry files
export const maxDuration = 300; // 5 minutes timeout

export async function POST(request: NextRequest) {
    console.log('[upload-data] POST request received');

    try {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];
        const folderName = formData.get('folderName') as string;

        console.log('[upload-data] Folder name:', folderName);
        console.log('[upload-data] Files count:', files.length);

        if (!folderName || !files || files.length === 0) {
            console.error('[upload-data] Missing folder name or files');
            return NextResponse.json(
                { error: 'Missing folder name or files' },
                { status: 400 }
            );
        }

        // Sanitize folder name (remove special characters, replace spaces with hyphens)
        const sanitizedFolderName = folderName
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        console.log('[upload-data] Sanitized folder name:', sanitizedFolderName);

        // Create target directory
        const targetDir = path.join(UPLOAD_DIR, sanitizedFolderName);
        console.log('[upload-data] Target directory:', targetDir);
        console.log('[upload-data] Upload base dir:', UPLOAD_DIR);

        // Check if folder already exists
        // We allow existing folders now to support sequential/chunked uploads
        if (existsSync(targetDir)) {
            console.log('[upload-data] Folder exists, appending files:', targetDir);
            // We no longer return 409 here, effectively allowing merge/append
        }

        // Create directory
        console.log('[upload-data] Creating directory...');
        await mkdir(targetDir, { recursive: true });
        console.log('[upload-data] Directory created successfully');

        // Save all uploaded files
        const savedFiles: string[] = [];
        for (const file of files) {
            console.log(`[upload-data] Processing file: ${file.name}, size: ${file.size} bytes`);

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Handle nested paths from webkitRelativePath
            // file.name here will be the full relative path (e.g. "Sebring/Race 1/data.csv")
            // We need to strip the first folder name because we're already in the target directory
            const pathParts = file.name.split('/');
            let relativePath = file.name;

            if (pathParts.length > 1) {
                // Remove the first part (the root folder name)
                relativePath = pathParts.slice(1).join('/');
            }

            // Construct full destination path
            const filePath = path.join(targetDir, relativePath);
            const fileDir = path.dirname(filePath);

            // Ensure the subdirectory exists
            if (!existsSync(fileDir)) {
                await mkdir(fileDir, { recursive: true });
            }

            // Save file
            await writeFile(filePath, buffer);
            savedFiles.push(relativePath);
            console.log(`[upload-data] Saved: ${filePath}`);
        }

        // Check if metadata.json was uploaded, if not create a basic one
        if (!savedFiles.includes('metadata.json')) {
            const trackName = sanitizedFolderName
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            const metadata = {
                trackName,
                raceName: `GR Cup Series - ${trackName}`,
                date: new Date().toISOString().split('T')[0],
                sessionType: 'Race',
                uploadedAt: new Date().toISOString(),
            };

            const metadataPath = path.join(targetDir, 'metadata.json');
            await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            savedFiles.push('metadata.json');
            console.log('[upload-data] Created metadata.json');
        }

        console.log(`[upload-data] Upload complete! ${savedFiles.length} files saved`);

        return NextResponse.json({
            success: true,
            folderId: sanitizedFolderName,
            folderPath: targetDir,
            filesUploaded: savedFiles.length,
            files: savedFiles,
        });
    } catch (error: any) {
        console.error('[upload-data] Upload error:', error);
        console.error('[upload-data] Error stack:', error.stack);
        return NextResponse.json(
            { error: 'Failed to upload files', details: error.message || String(error) },
            { status: 500 }
        );
    }
}

// Optional: GET endpoint to check upload status
export async function GET() {
    return NextResponse.json({
        uploadDir: UPLOAD_DIR,
        maxFileSize: '100MB',
        supportedFormats: ['.csv', '.json'],
    });
}
