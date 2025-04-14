import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileInfo } from '../types/api';
import MarkdownViewer from './MarkdownViewer';

interface FileViewerProps {
    file: FileInfo;
    onClose?: () => void;
    showHeader?: boolean;
}

const FileViewer = ({ file, onClose, showHeader = true }: FileViewerProps) => {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isImage, setIsImage] = useState(false);
    const [isMarkdown, setIsMarkdown] = useState(false);

    useEffect(() => {
        const fetchFileContent = async () => {
            setLoading(true);
            setError(null);
            setIsMarkdown(false);
            setIsImage(false);
            
            try {
                // Determine if it's an image
                if (file.content_type.startsWith('image/')) {
                    setIsImage(true);
                    setLoading(false);
                    return;
                }
                
                // Check if it's a markdown file
                if (file.content_type === 'text/markdown' || 
                    file.name.endsWith('.md') || 
                    file.name.endsWith('.markdown')) {
                    setIsMarkdown(true);
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
    
    return (
        <div className="file-viewer">
            {showHeader && (
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
                        {onClose && (
                            <button 
                                className="btn btn-sm btn-outline" 
                                onClick={onClose}
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            )}
            
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
                ) : isMarkdown && content ? (
                    <MarkdownViewer content={content} />
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

export default FileViewer;