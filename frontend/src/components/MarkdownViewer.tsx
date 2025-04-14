import ReactMarkdown from 'react-markdown';

interface MarkdownViewerProps {
    content: string;
}

const MarkdownViewer = ({ content }: MarkdownViewerProps) => {
    // Define styles for the markdown content container
    const containerStyle = {
        maxHeight: '600px',
        overflow: 'auto',
        backgroundColor: '#ffffff',
        padding: '16px',
        borderRadius: '4px',
        border: '1px solid #e1e4e8'
    };

    // Create CSS for the markdown content that will be injected into the component
    const markdownStyles = `
        .markdown-content {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        
        .markdown-content h1 {
            font-size: 2em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
        }
        
        .markdown-content h2 {
            font-size: 1.5em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
        }
        
        .markdown-content h3 {
            font-size: 1.25em;
        }
        
        .markdown-content ul,
        .markdown-content ol {
            padding-left: 2em;
            margin-top: 0;
            margin-bottom: 16px;
        }
        
        .markdown-content li {
            margin-top: 0.25em;
        }
        
        .markdown-content li+li {
            margin-top: 0.25em;
        }
        
        .markdown-content pre {
            background-color: #f6f8fa;
            border-radius: 4px;
            padding: 16px;
            overflow: auto;
            margin-bottom: 16px;
        }
        
        .markdown-content code {
            background-color: rgba(27, 31, 35, 0.05);
            border-radius: 3px;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 85%;
            margin: 0;
            padding: 0.2em 0.4em;
        }
        
        .markdown-content pre code {
            background-color: transparent;
            border: 0;
            display: inline;
            line-height: inherit;
            margin: 0;
            overflow: visible;
            padding: 0;
            word-wrap: normal;
        }
        
        .markdown-content blockquote {
            padding: 0 1em;
            color: #6a737d;
            border-left: 0.25em solid #dfe2e5;
            margin: 0 0 16px 0;
        }
        
        .markdown-content table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 16px;
        }
        
        .markdown-content table th,
        .markdown-content table td {
            padding: 6px 13px;
            border: 1px solid #dfe2e5;
        }
        
        .markdown-content table tr {
            background-color: #fff;
            border-top: 1px solid #c6cbd1;
        }
        
        .markdown-content table tr:nth-child(2n) {
            background-color: #f6f8fa;
        }
        
        .markdown-content a {
            color: #0366d6;
            text-decoration: none;
        }
        
        .markdown-content a:hover {
            text-decoration: underline;
        }
        
        .markdown-content p {
            margin-top: 0;
            margin-bottom: 16px;
        }
        
        .markdown-content img {
            max-width: 100%;
            box-sizing: content-box;
        }
    `;

    return (
        <div style={containerStyle}>
            <style>{markdownStyles}</style>
            <div className="markdown-content">
                <ReactMarkdown>
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default MarkdownViewer;