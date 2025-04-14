import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Recipe } from '../types/api';
import StepViewer from './StepViewer';
import FileManager from './FileManager';

// Component for inserting a file ID into a context value
interface FileInsertButtonProps {
    onSelect: (fileId: string) => void;
}

const FileInsertButton = ({ onSelect }: FileInsertButtonProps) => {
    const [showPicker, setShowPicker] = useState(false);
    
    const handleSelect = async (fileId: string) => {
        // Add the files/ prefix to the file ID
        onSelect(`files/${fileId}`);
        setShowPicker(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setShowPicker(!showPicker)}
            >
                {showPicker ? 'Cancel' : 'Insert File Path'}
            </button>
            
            {showPicker && (
                <div className="absolute top-10 right-0 z-10 w-[500px] border rounded shadow-lg bg-white p-4">
                    <div className="mb-2">
                        <div className="font-bold">Select File to Insert</div>
                        <div className="text-sm text-gray-500 mt-1">
                            This will insert the file path (files/ID) into the context variable's value.
                        </div>
                    </div>
                    <FileManager 
                        onFileSelect={handleSelect}
                        selectedFileId=""
                        title=""
                    />
                </div>
            )}
        </div>
    );
};

const RecipeDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [executing, setExecuting] = useState(false);
    // Store context variables as an array of key-value pairs instead of an object
    // This approach maintains the order and prevents key-based reordering
    const [contextEntries, setContextEntries] = useState<Array<{key: string, value: string}>>([]);
    const [showContextForm, setShowContextForm] = useState(false);

    useEffect(() => {
        const fetchRecipe = async () => {
            if (!id) return;

            setLoading(true);
            const response = await api.getRecipe(id);

            if (response.error) {
                setError(response.error);
            } else if (response.data) {
                setRecipe(response.data);
            }

            setLoading(false);
        };

        fetchRecipe();
    }, [id]);

    const handleDelete = async () => {
        if (!recipe) return;

        if (window.confirm(`Are you sure you want to delete the recipe "${recipe.name}"?`)) {
            const response = await api.deleteRecipe(recipe.id);

            if (response.error) {
                alert(`Error deleting recipe: ${response.error}`);
            } else {
                navigate('/recipes');
            }
        }
    };

    const handleExecute = async () => {
        if (!recipe) return;

        // Convert array of entries back to object for API
        const contextVars = contextEntries.reduce((obj, { key, value }) => {
            if (key.trim()) { // Only include entries with non-empty keys
                obj[key] = value;
            }
            return obj;
        }, {} as Record<string, string>);

        setExecuting(true);
        const response = await api.executeRecipe(recipe.id, contextVars);
        setExecuting(false);

        if (response.error) {
            alert(`Error executing recipe: ${response.error}`);
        } else if (response.data) {
            navigate(`/executions/${response.data.execution_id}`);
        }
    };

    const addContextVar = () => {
        // Add a new empty entry 
        setContextEntries([...contextEntries, { key: `var_${contextEntries.length}`, value: '' }]);
    };

    const updateContextEntry = (index: number, field: 'key' | 'value', newValue: string) => {
        // Update a specific field of a specific entry
        const newEntries = [...contextEntries];
        newEntries[index] = { ...newEntries[index], [field]: newValue };
        setContextEntries(newEntries);
    };

    const removeContextEntry = (index: number) => {
        // Remove entry at index
        setContextEntries(contextEntries.filter((_, i) => i !== index));
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    if (loading) {
        return (
            <div className="card">
                <div className="flex items-center justify-center" style={{ minHeight: '200px' }}>
                    <div className="spinner"></div>
                    <span className="ml-2">Loading recipe...</span>
                </div>
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="card">
                <div className="text-center" style={{ color: 'var(--error-color)' }}>
                    <p>Error loading recipe: {error || 'Recipe not found'}</p>
                    <Link to="/recipes" className="btn btn-outline mt-4">
                        Back to Recipes
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="card-header">
                <div>
                    <h2 className="card-title">{recipe.name}</h2>
                    {recipe.description && <p className="text-light mt-2">{recipe.description}</p>}
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowContextForm(!showContextForm)}
                    >
                        {showContextForm ? 'Hide Context' : 'Execute'}
                    </button>
                    <Link
                        to={`/recipes/${recipe.id}/edit`}
                        className="btn btn-outline"
                    >
                        Edit
                    </Link>
                    <button
                        className="btn btn-outline btn-danger"
                        onClick={handleDelete}
                    >
                        Delete
                    </button>
                </div>
            </div>

            {recipe.tags.length > 0 && (
                <div className="mb-4 recipe-tags">
                    {recipe.tags.map((tag) => (
                        <span key={tag} className="tag">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="card mb-4">
                <div className="text-sm text-light mb-2">
                    Created: {formatDate(recipe.created_at)}
                    <br />
                    Updated: {formatDate(recipe.updated_at)}
                </div>
                <div className="text-sm">
                    {recipe.steps.length} step{recipe.steps.length !== 1 ? 's' : ''}
                </div>
            </div>

            {showContextForm && (
                <div className="card mb-4">
                    <h3 className="mb-4">Execution Context</h3>

                    {contextEntries.length > 0 ? (
                        contextEntries.map((entry, index) => (
                            <div key={index} className="form-group flex gap-2">
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        value={entry.key}
                                        onChange={(e) => updateContextEntry(index, 'key', e.target.value)}
                                        placeholder="Variable name"
                                    />
                                </div>
                                <div style={{ flex: 2 }} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={entry.value}
                                        onChange={(e) => updateContextEntry(index, 'value', e.target.value)}
                                        placeholder="Value"
                                        className="flex-grow"
                                    />
                                    <FileInsertButton 
                                        onSelect={(fileId) => {
                                            // Insert the file ID at cursor position or append to the end
                                            const currentValue = entry.value || '';
                                            updateContextEntry(index, 'value', `${currentValue}${currentValue ? ' ' : ''}${fileId}`);
                                        }} 
                                    />
                                </div>
                                <button
                                    className="btn btn-outline btn-danger"
                                    onClick={() => removeContextEntry(index)}
                                >
                                    Remove
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="mb-4 text-light">No context variables defined.</p>
                    )}

                    <div className="flex gap-2 mt-4">
                        <button className="btn btn-outline" onClick={addContextVar}>
                            Add Variable
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleExecute}
                            disabled={executing}
                        >
                            {executing ? (
                                <>
                                    <div className="spinner mr-2"></div>
                                    Executing...
                                </>
                            ) : (
                                'Execute Recipe'
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="card">
                <h3 className="mb-4">Recipe Steps</h3>

                {recipe.steps.length === 0 ? (
                    <p>This recipe has no steps.</p>
                ) : (
                    recipe.steps.map((step, index) => (
                        <StepViewer key={index} step={step} index={index} />
                    ))
                )}
            </div>
        </div>
    );
};

export default RecipeDetail;