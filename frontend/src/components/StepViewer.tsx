import { useState, useEffect } from 'react';
import { Step, FileInfo } from '../types/api';
import { api } from '../services/api';

interface StepViewerProps {
    step: Step;
    index: number;
}

const StepViewer = ({ step, index }: StepViewerProps) => {
    const [expanded, setExpanded] = useState(false);
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load file info if we have a file_id and component is expanded
        if (expanded && step.file_id) {
            loadFileInfo(step.file_id);
        }
    }, [expanded, step.file_id]);

    const loadFileInfo = async (fileId: string) => {
        setLoading(true);
        try {
            const response = await api.getFile(fileId);
            if (response.data) {
                setFileInfo(response.data);
            }
        } catch (error) {
            console.error('Error loading file info:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderFileReference = () => {
        if (loading) {
            return (
                <div className="flex items-center">
                    <div className="spinner mr-2"></div>
                    <span>Loading file information...</span>
                </div>
            );
        }

        if (!fileInfo) {
            return <div>File: {step.file_id}</div>;
        }

        return (
            <div className="file-reference p-2 border rounded mb-3">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="font-semibold">{fileInfo.name}</div>
                        <div className="text-xs">
                            {fileInfo.content_type} · {formatFileSize(fileInfo.size)}
                        </div>
                    </div>
                    <a 
                        href={api.getFileDownloadUrl(fileInfo.id)} 
                        target="_blank" 
                        className="btn btn-sm btn-outline ml-2"
                        rel="noreferrer"
                    >
                        Download
                    </a>
                </div>
            </div>
        );
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    };

    // Render different step types accordingly
    const renderStepDetails = () => {
        switch (step.type) {
            case 'read_files':
                return (
                    <>
                        {step.file_id ? (
                            // Render uploaded file
                            <div className="form-group">
                                <label>File</label>
                                {renderFileReference()}
                            </div>
                        ) : (
                            // Render file path
                            <div className="form-group">
                                <label>Path</label>
                                <div>{Array.isArray(step.path) ? step.path.join(', ') : step.path}</div>
                            </div>
                        )}
                        <div className="form-group">
                            <label>Artifact</label>
                            <div>{step.artifact}</div>
                        </div>
                        {step.optional !== undefined && (
                            <div className="form-group">
                                <label>Optional</label>
                                <div>{step.optional ? 'Yes' : 'No'}</div>
                            </div>
                        )}
                        {step.merge_mode && (
                            <div className="form-group">
                                <label>Merge Mode</label>
                                <div>{step.merge_mode}</div>
                            </div>
                        )}
                    </>
                );

            case 'write_files':
                return (
                    <>
                        <div className="form-group">
                            <label>Artifact</label>
                            <div>{step.artifact}</div>
                        </div>
                        {step.root && (
                            <div className="form-group">
                                <label>Root</label>
                                <div>{step.root}</div>
                            </div>
                        )}
                    </>
                );

            case 'generate':
                return (
                    <>
                        <div className="form-group">
                            <label>Model</label>
                            <div>{step.model}</div>
                        </div>
                        <div className="form-group">
                            <label>Artifact</label>
                            <div>{step.artifact}</div>
                        </div>
                        <div className="form-group">
                            <label>Prompt</label>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                backgroundColor: '#f8f8f8',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflow: 'auto'
                            }}>
                                {step.prompt}
                            </pre>
                        </div>
                    </>
                );

            case 'execute_recipe':
                return (
                    <>
                        <div className="form-group">
                            <label>Recipe Path</label>
                            <div>{step.recipe_path}</div>
                        </div>
                        {step.context_overrides && Object.keys(step.context_overrides).length > 0 && (
                            <div className="form-group">
                                <label>Context Overrides</label>
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    backgroundColor: '#f8f8f8',
                                    padding: '0.5rem',
                                    borderRadius: '4px'
                                }}>
                                    {JSON.stringify(step.context_overrides, null, 2)}
                                </pre>
                            </div>
                        )}
                    </>
                );

            case 'parallel':
                return (
                    <>
                        <div className="form-group">
                            <label>Substeps</label>
                            <div>{step.substeps?.length || 0} substep(s)</div>
                        </div>
                        {step.max_concurrency !== undefined && (
                            <div className="form-group">
                                <label>Max Concurrency</label>
                                <div>{step.max_concurrency || 'No limit'}</div>
                            </div>
                        )}
                        {step.delay !== undefined && (
                            <div className="form-group">
                                <label>Delay</label>
                                <div>{step.delay}s</div>
                            </div>
                        )}
                        {expanded && step.substeps && step.substeps.length > 0 && (
                            <div className="ml-4 mt-4 border-l-2 pl-4" style={{ borderColor: 'var(--border-color)' }}>
                                <h4 className="mb-2">Substeps:</h4>
                                {step.substeps.map((substep, subIndex) => (
                                    <StepViewer key={subIndex} step={substep} index={subIndex} />
                                ))}
                            </div>
                        )}
                    </>
                );

            default:
                return (
                    <div className="form-group">
                        <pre style={{
                            whiteSpace: 'pre-wrap',
                            backgroundColor: '#f8f8f8',
                            padding: '0.5rem',
                            borderRadius: '4px'
                        }}>
                            {JSON.stringify(step, null, 2)}
                        </pre>
                    </div>
                );
        }
    };

    return (
        <div className="step-editor mb-4">
            <div className="step-header">
                <h4>
                    {index + 1}. {step.type}
                </h4>
                <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? 'Collapse' : 'Expand'}
                </button>
            </div>

            {expanded && renderStepDetails()}
        </div>
    );
};

export default StepViewer;