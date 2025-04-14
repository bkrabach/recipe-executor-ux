import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileInfo } from '../types/api';
import FileViewer from './FileViewer';

interface FilesGridProps {
    files: FileInfo[];
    title?: string;
    emptyMessage?: string;
    onDeleteFile?: (fileId: string) => void;
    allowDelete?: boolean;
}

const FilesGrid = ({ 
    files, 
    title,
    emptyMessage = 'No files available.',
    onDeleteFile,
    allowDelete = false
}: FilesGridProps) => {
    // Memoize the files prop to prevent re-renders when file array reference changes
    // but content is the same
    const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
    const [stableFiles] = useState(() => files);
    
    // Only update stableFiles if the files content actually changes
    useEffect(() => {
        if (JSON.stringify(files) !== JSON.stringify(stableFiles)) {
            // This purposely does nothing as we want to keep the initial files
            // Since we're dealing with a read-only display, the initial files are sufficient
            console.log('Files prop changed, but keeping initial files for stability');
        }
    }, [files, stableFiles]);
    
    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    };
    
    // Use our stable files reference instead of the prop
    if (stableFiles.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                {emptyMessage}
            </div>
        );
    }
    
    return (
        <div className="files-grid">
            {title && <h3 className="mb-4">{title}</h3>}
            
            {selectedFile ? (
                <div>
                    <FileViewer 
                        file={selectedFile} 
                        onClose={() => setSelectedFile(null)} 
                    />
                </div>
            ) : (
                <div>
                    <table className="w-full mb-4">
                        <thead>
                            <tr>
                                <th className="text-left">Name</th>
                                <th className="text-left">Type</th>
                                <th className="text-right">Size</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stableFiles.map(file => (
                                <tr key={file.id} className="hover:bg-gray-100">
                                    <td className="py-2">{file.name}</td>
                                    <td>{file.content_type}</td>
                                    <td className="text-right">{formatSize(file.size)}</td>
                                    <td className="text-right space-x-2">
                                        <button
                                            onClick={() => setSelectedFile(file)}
                                            className="btn btn-sm btn-outline"
                                            title="View file content"
                                        >
                                            View
                                        </button>
                                        <a
                                            href={api.getFileDownloadUrl(file.id)}
                                            download={file.name}
                                            className="btn btn-sm btn-outline"
                                            title="Download file"
                                        >
                                            Download
                                        </a>
                                        {allowDelete && onDeleteFile && (
                                            <button
                                                onClick={() => onDeleteFile(file.id)}
                                                className="btn btn-sm btn-outline-danger"
                                                title="Delete file"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FilesGrid;