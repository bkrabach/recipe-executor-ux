import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileInfo } from '../types/api';
import FileViewer from './FileViewer';
import FilesGrid from './FilesGrid';

interface FileManagerProps {
    onFileSelect?: (fileId: string) => void;
    selectedFileId?: string;
    allowUpload?: boolean;
    allowDelete?: boolean;
    title?: string;
}

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
                ) : (
                    onFileSelect ? (
                        // Use selection view with radio buttons when selecting files for recipes
                        files.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No files available. {allowUpload && 'Click "Upload File" to add one.'}
                            </div>
                        ) : (
                            <div className="files-list">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th style={{ width: "40px" }}></th>
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
                                                <td>
                                                    <input
                                                        type="radio"
                                                        name="selectedFile"
                                                        checked={selectedFileId === file.id}
                                                        onChange={() => onFileSelect(file.id)}
                                                    />
                                                </td>
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
                        )
                    ) : (
                        // Use standard file list for browsing files
                        <FilesGrid 
                            files={files}
                            emptyMessage={`No files available. ${allowUpload ? 'Click "Upload File" to add one.' : ''}`}
                            onDeleteFile={allowDelete ? handleDeleteFile : undefined}
                            allowDelete={allowDelete}
                        />
                    )
                )}
                </>
            )}
        </div>
    );
};

export default FileManager;