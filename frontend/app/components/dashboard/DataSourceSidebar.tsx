'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DataSource {
    id: string;
    name: string;
    path: string;
    lastModified?: string;
    metadata?: {
        trackName?: string;
        date?: string;
        sessionType?: string;
        raceName?: string;
    };
    hasRaceData?: boolean;
    subRaces?: DataSource[];
}

interface DataSourceSidebarProps {
    currentSource: string | null;
    onSourceSelect: (sourceId: string) => void;
}

export function DataSourceSidebar({ currentSource, onSourceSelect }: DataSourceSidebarProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [dataSources, setDataSources] = useState<DataSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    };

    useEffect(() => {
        loadDataSources();
    }, []);

    async function loadDataSources() {
        setLoading(true);
        try {
            const res = await fetch('/api/data-sources');
            if (res.ok) {
                const sources = await res.json();
                setDataSources(sources);
            }
        } catch (err) {
            console.error('Failed to load data sources:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteSource(sourceId: string, sourceName: string) {
        // Confirm deletion
        const confirmed = confirm(`Are you sure you want to delete "${sourceName}"? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/data-sources?id=${encodeURIComponent(sourceId)}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete folder');
            }

            // If we deleted the currently selected source, clear the selection
            if (currentSource === sourceId) {
                onSourceSelect(null as any);
            }

            // Reload the data sources list
            await loadDataSources();

        } catch (err: any) {
            console.error('Failed to delete source:', err);
            alert(`Failed to delete folder: ${err.message}`);
        }
    }


    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadError(null);

        try {
            console.log(`Selected ${files.length} files for upload`);

            // Get folder name from first file's path or prompt user
            let folderName = '';

            // Try to extract folder name from the first file's webkitRelativePath
            if (files[0] && (files[0] as any).webkitRelativePath) {
                const relativePath = (files[0] as any).webkitRelativePath;
                console.log('webkitRelativePath:', relativePath);
                // Extract the top-level folder name
                const pathParts = relativePath.split('/');
                if (pathParts.length > 1) {
                    folderName = pathParts[0];
                }
            }

            // If we couldn't extract the folder name, prompt the user
            if (!folderName) {
                folderName = prompt('Enter a name for this race session (e.g., "Road Atlanta 2024"):') || '';
            } else {
                // Confirm the folder name with the user
                const confirmed = confirm(`Upload folder as "${folderName}"? Click OK to confirm or Cancel to change the name.`);
                if (!confirmed) {
                    folderName = prompt('Enter a name for this race session:', folderName) || '';
                }
            }

            if (!folderName) {
                setUploading(false);
                return;
            }

            console.log('Uploading with folder name:', folderName);

            // Filter files first
            const filesToUpload: File[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileName = file.name.toLowerCase();
                if (fileName.endsWith('.csv') || fileName.endsWith('.json')) {
                    filesToUpload.push(file);
                }
            }

            if (filesToUpload.length === 0) {
                throw new Error('No CSV or JSON files found in the selected folder');
            }

            console.log(`Uploading ${filesToUpload.length} files sequentially...`);

            // Upload files sequentially
            let uploadedCount = 0;
            for (const file of filesToUpload) {
                const formData = new FormData();
                formData.append('folderName', folderName);

                // Use webkitRelativePath if available
                const filePath = (file as any).webkitRelativePath || file.name;
                formData.append('files', file, filePath);

                try {
                    const response = await fetch('/api/upload-data', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        console.warn(`Failed to upload ${filePath}`);
                    } else {
                        uploadedCount++;
                        console.log(`Uploaded ${uploadedCount}/${filesToUpload.length}: ${filePath}`);
                    }
                } catch (e) {
                    console.error(`Error uploading ${filePath}:`, e);
                }
            }

            if (uploadedCount === 0) {
                throw new Error('No files were successfully uploaded');
            }

            console.log('Upload complete');

            // Refresh data sources
            await loadDataSources();

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (err: any) {
            console.error('Upload error:', err);
            setUploadError(err.message || 'Failed to upload files');
        } finally {
            setUploading(false);
        }
    }

    return (
        <div
            className="fixed left-0 top-0 h-full z-50"
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Home Icon - Always Visible */}
            <div className="absolute left-0 top-4 w-12 h-12 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-r-lg flex items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors">
                <svg
                    className="w-6 h-6 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                </svg>
            </div>

            {/* Expandable Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ x: -320 }}
                        animate={{ x: 0 }}
                        exit={{ x: -320 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute left-0 top-0 h-full w-80 bg-zinc-900/95 backdrop-blur-sm border-r border-zinc-800 shadow-2xl"
                    >
                        <div className="flex flex-col h-full p-6">
                            {/* Header */}
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-zinc-100 mb-1">Data Sources</h2>
                                <p className="text-xs text-zinc-500">Select a race session to analyze</p>
                            </div>

                            {/* Current Source */}
                            {currentSource && (
                                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <div className="text-xs text-blue-400 font-semibold mb-1">CURRENTLY LOADED</div>
                                    <div className="text-sm text-zinc-100 font-mono truncate">
                                        {dataSources.find(s => s.id === currentSource)?.name || currentSource}
                                    </div>
                                </div>
                            )}

                            {/* Upload Button */}
                            <label className={`mb-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {uploading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        Upload Folder
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    // @ts-ignore - webkitdirectory is not in types but works
                                    webkitdirectory="true"
                                    directory="true"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                            </label>

                            {/* Upload Error */}
                            {uploadError && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <div className="text-xs text-red-400 font-semibold mb-1">UPLOAD FAILED</div>
                                    <div className="text-xs text-red-300">{uploadError}</div>
                                </div>
                            )}

                            {/* Data Sources List */}
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8 text-zinc-500">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : dataSources.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-500 text-sm">
                                        No data sources found.<br />Upload a folder to get started.
                                    </div>
                                ) : (
                                    dataSources.map((source) => (
                                        <div key={source.id} className="mb-2">
                                            <div
                                                className={`w-full rounded-lg border transition-all ${currentSource === source.id || (source.subRaces?.some(s => s.id === currentSource))
                                                        ? 'bg-zinc-800/80 border-zinc-600'
                                                        : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-700/50 hover:border-zinc-600'
                                                    }`}
                                            >
                                                <div className="flex items-center">
                                                    {/* Main clickable area */}
                                                    <button
                                                        onClick={() => {
                                                            if (source.subRaces && source.subRaces.length > 0) {
                                                                toggleFolder(source.id);
                                                            } else {
                                                                onSourceSelect(source.id);
                                                            }
                                                        }}
                                                        className="flex-1 text-left p-3 min-w-0 flex items-start gap-3"
                                                    >
                                                        {/* Chevron for nested folders */}
                                                        {source.subRaces && source.subRaces.length > 0 && (
                                                            <div className={`mt-1 text-zinc-500 transition-transform duration-200 ${expandedFolders.has(source.id) ? 'rotate-90' : ''}`}>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </div>
                                                        )}

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <div className="text-sm font-semibold text-zinc-100 truncate">
                                                                    {source.name}
                                                                </div>
                                                                {currentSource === source.id && (
                                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></div>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                                {source.metadata?.trackName && (
                                                                    <div className="flex items-center gap-1 text-zinc-400">
                                                                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        </svg>
                                                                        <span className="truncate">{source.metadata.trackName}</span>
                                                                    </div>
                                                                )}
                                                                {source.lastModified && (
                                                                    <div className="flex-shrink-0">
                                                                        {new Date(source.lastModified).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {/* Delete button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteSource(source.id, source.name);
                                                        }}
                                                        className="px-3 py-4 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-r-lg border-l border-zinc-700/50 flex-shrink-0 self-stretch flex items-center"
                                                        title="Delete this data source"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Nested Sub-races */}
                                            {source.subRaces && expandedFolders.has(source.id) && (
                                                <div className="ml-6 mt-1 space-y-1 border-l-2 border-zinc-800 pl-2">
                                                    {source.subRaces.map((subRace) => (
                                                        <div key={subRace.id} className="flex items-center group">
                                                            <button
                                                                onClick={() => onSourceSelect(subRace.id)}
                                                                className={`flex-1 text-left p-2 rounded-l-md text-sm transition-all flex items-center justify-between ${currentSource === subRace.id
                                                                        ? 'bg-blue-500/20 text-blue-200 border-y border-l border-blue-500/30'
                                                                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-y border-l border-transparent'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <svg className="w-3 h-3 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M12 11V3m0 0L8.5 6.5M12 3l3.5 3.5" />
                                                                    </svg>
                                                                    <span className="truncate">{subRace.name}</span>
                                                                </div>
                                                                {currentSource === subRace.id && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteSource(subRace.id, subRace.name);
                                                                }}
                                                                className={`px-2 py-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-r-md border-y border-r ${currentSource === subRace.id
                                                                        ? 'border-blue-500/30 bg-blue-500/20'
                                                                        : 'border-transparent hover:border-zinc-700'
                                                                    }`}
                                                                title="Delete this race"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="mt-4 pt-4 border-t border-zinc-800">
                                <button
                                    onClick={loadDataSources}
                                    className="w-full px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
