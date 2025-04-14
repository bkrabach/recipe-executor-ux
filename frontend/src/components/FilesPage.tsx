import FileManager from './FileManager';

const FilesPage = () => {
    return (
        <div>
            <div className="card-header">
                <h2 className="card-title">File Management</h2>
                <p className="text-light mt-2">
                    Upload, manage, and download files for use in recipes
                </p>
            </div>
            
            <div className="card">
                <FileManager 
                    allowUpload={true}
                    allowDelete={true}
                    title="Uploaded Files"
                />
            </div>
        </div>
    );
};

export default FilesPage;