import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileInfo } from '../types/api';
import FileManager from './FileManager';

interface FilePickerProps {
    value: string | undefined;
    onChange: (fileId: string | undefined) => void;
    label?: string;
}

const FilePicker = ({ value, onChange, label = 'Select File' }: FilePickerProps) => {
    // Show picker by default when we have an empty string for file_id (which means "show picker but no file selected")
    const [showPicker, setShowPicker] = useState(value === '');
    const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load file info if we have a non-empty file ID
        if (value && value !== '') {
            loadFileInfo(value);
            setShowPicker(false);
        } else if (value === '') {
            // Empty string means "show picker but no file selected"
            setSelectedFile(null);
            setShowPicker(true);
        } else {
            // Undefined or null means no file
            setSelectedFile(null);
            setShowPicker(false);
        }
    }, [value]);

    const loadFileInfo = async (fileId: string) => {
        setLoading(true);
        const response = await api.getFile(fileId);
        
        if (response.data) {
            setSelectedFile(response.data);
        } else {
            setSelectedFile(null);
        }
        
        setLoading(false);
    };

    const handleSelect = (fileId: string) => {
        onChange(fileId);
        setShowPicker(false);
    };

    const handleClear = () => {
        onChange(undefined);
        setSelectedFile(null);
    };

    return (
        <div className="file-picker">
            <label className="block mb-1">{label}</label>
            
            {!showPicker ? (
                <div className="flex">
                    <div className="flex-grow p-2 border rounded mr-2">
                        {loading ? (
                            <div className="flex items-center">
                                <div className="spinner mr-2"></div>
                                <span>Loading...</span>
                            </div>
                        ) : selectedFile ? (
                            <div className="flex justify-between items-center">
                                <div>
                                    <strong>{selectedFile.name}</strong>
                                    <div className="text-sm text-gray-600">{selectedFile.content_type}</div>
                                </div>
                                <a 
                                    href={api.getFileDownloadUrl(selectedFile.id)} 
                                    target="_blank" 
                                    className="btn btn-sm btn-outline ml-2"
                                    rel="noreferrer"
                                >
                                    Download
                                </a>
                            </div>
                        ) : (
                            <span className="text-gray-500">No file selected</span>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        <button 
                            type="button" 
                            className="btn btn-outline" 
                            onClick={() => setShowPicker(true)}
                        >
                            Browse
                        </button>
                        {selectedFile && (
                            <button 
                                type="button" 
                                className="btn btn-outline-danger" 
                                onClick={handleClear}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="border rounded p-4 mt-2">
                    <div className="mb-4 flex justify-end">
                        <button 
                            className="btn btn-sm" 
                            onClick={() => setShowPicker(false)}
                        >
                            Cancel
                        </button>
                    </div>
                    
                    <FileManager 
                        onFileSelect={handleSelect}
                        selectedFileId={value}
                        title="Select a File"
                    />
                </div>
            )}
        </div>
    );
};

export default FilePicker;