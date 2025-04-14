import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileInfo } from '../types/api';

interface FileManagerProps {
    onFileSelect?: (fileId: string) => void;
    selectedFileId?: string;
    allowUpload?: boolean;
    allowDelete?: boolean;
    title?: string;
}

interface FileViewerProps {
    file: FileInfo | null;
    onClose: () => void;
}

const FileViewer = ({ file, onClose }: FileViewerProps) => {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isImage, setIsImage] = useState(false);

    useEffect(() => {
        if (!file) return;
        
        const fetchFileContent = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Determine if it's an image
                if (file.content_type.startsWith('image/')) {
                    setIsImage(true);
                    setLoading(false);
                    return;
                }
                
                // For other content types, fetch as text
                const response = await fetch(api.getFileDownloadUrl(file.id));
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch file: ${response.statusText}`);
                }
                
                // Check if we're dealing with a binary file
                if (file.content_type === 'application/octet-stream' 
                    || file.content_type === 'application/pdf'
                    || file.content_type.includes('zip')
                    || file.content_type.includes('executable')) {
                    setError('Binary files cannot be displayed. Please download the file instead.');
                    setLoading(false);
                    return;
                }
                
                const text = await response.text();
                setContent(text);
            } catch (err) {
                setError(`Error loading file: ${err instanceof Error ? err.message : String(err)}`);
            } finally {
                setLoading(false);
            }
        };
        
        fetchFileContent();
    }, [file]);
    
    if (!file) return null;
    
    return (
        <div className="file-viewer card">
            <div className="file-viewer-header p-4 border-b flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-semibold">{file.name}</h3>
                    <div className="text-sm text-gray-600 mt-1">{file.content_type}</div>
                </div>
                <div className="flex space-x-2">
                    <a 
                        href={api.getFileDownloadUrl(file.id)}
                        className="btn btn-sm btn-outline"
                        download={file.name}
                    >
                        Download
                    </a>
                    <button 
                        className="btn btn-sm btn-outline" 
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
            
            <div className="file-viewer-content p-4">
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="spinner mr-2"></div>
                        <span>Loading file content...</span>
                    </div>
                ) : error ? (
                    <div className="error-message p-4 border rounded bg-red-50 text-red-800">
                        <p>{error}</p>
                        <div className="mt-4">
                            <a 
                                href={api.getFileDownloadUrl(file.id)}
                                className="btn btn-sm btn-primary"
                                download={file.name}
                            >
                                Download Instead
                            </a>
                        </div>
                    </div>
                ) : isImage ? (
                    <div className="image-preview text-center p-4">
                        <img 
                            src={api.getFileDownloadUrl(file.id)} 
                            alt={file.name} 
                            style={{ maxWidth: '100%', maxHeight: '600px', margin: '0 auto' }}
                        />
                    </div>
                ) : (
                    <div className="code-container border rounded">
                        <pre 
                            className="code-preview p-4" 
                            style={{
                                whiteSpace: 'pre-wrap',
                                backgroundColor: '#f8f8f8',
                                borderRadius: '4px',
                                maxHeight: '600px',
                                overflow: 'auto'
                            }}
                        >
                            {content}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

const FileManager = ({
    onFileSelect,
    selectedFileId,
    allowUpload = true,
    allowDelete = true,
    title = 'Files'
}: FileManagerProps) => {
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);

    const fetchFiles = async () => {
        setLoading(true);
        const response = await api.getFiles();

        if (response.error) {
            setError(response.error);
        } else if (response.data) {
            setFiles(response.data.files);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFile) return;

        setUploading(true);

        const response = await api.uploadFile(selectedFile);

        if (response.error) {
            setError(response.error);
        } else {
            // Reset form and refresh file list
            setSelectedFile(null);
            setUploadOpen(false);
            await fetchFiles();
        }

        setUploading(false);
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!window.confirm('Are you sure you want to delete this file?')) {
            return;
        }

        const response = await api.deleteFile(fileId);

        if (response.error) {
            setError(response.error);
        } else {
            await fetchFiles();
        }
    };

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    };

    return (
        <div className="file-manager">
            {viewingFile ? (
                <FileViewer 
                    file={viewingFile} 
                    onClose={() => setViewingFile(null)} 
                />
            ) : (
                <>
                <div className="flex justify-between items-center mb-4">
                    <h2>{title}</h2>
                    {allowUpload && (
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setUploadOpen(!uploadOpen)}
                        >
                            {uploadOpen ? 'Cancel' : 'Upload File'}
                        </button>
                    )}
                </div>

            {error && (
                <div className="alert alert-error mb-4">
                    {error}
                    <button className="ml-2" onClick={() => setError(null)}>×</button>
                </div>
            )}

            {uploadOpen && (
                <div className="upload-form mb-4 p-4 border rounded">
                    <h3 className="mb-2">Upload File</h3>
                    <form onSubmit={handleUploadSubmit}>
                        <div className="mb-3">
                            <label className="block mb-1">File:</label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                required
                                disabled={uploading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!selectedFile || uploading}
                        >
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="spinner"></div>
                    <span className="ml-2">Loading files...</span>
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No files available. {allowUpload && 'Click "Upload File" to add one.'}
                </div>
            ) : (
                <div className="files-list">
                    <table className="w-full">
                        <thead>
                            <tr>
                                {onFileSelect && <th style={{ width: "40px" }}></th>}
                                <th className="text-left">Name</th>
                                <th className="text-left">Type</th>
                                <th className="text-right">Size</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map(file => (
                                <tr
                                    key={file.id}
                                    className={`hover:bg-gray-100 ${selectedFileId === file.id ? 'bg-blue-50' : ''}`}
                                >
                                    {onFileSelect && (
                                        <td>
                                            <input
                                                type="radio"
                                                name="selectedFile"
                                                checked={selectedFileId === file.id}
                                                onChange={() => onFileSelect(file.id)}
                                            />
                                        </td>
                                    )}
                                    <td className="py-2">{file.name}</td>
                                    <td>{file.content_type}</td>
                                    <td className="text-right">{formatSize(file.size)}</td>
                                    <td className="text-right space-x-2">
                                        <button
                                            onClick={() => setViewingFile(file)}
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
                                        {allowDelete && (
                                            <button
                                                onClick={() => handleDeleteFile(file.id)}
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
                </>
            )}
        </div>
    );
};

export default FileManager;