import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header className="header container">
            <div className="logo">
                <Link to="/">
                    <h1>Recipe Executor</h1>
                </Link>
                <span className="text-light">Build and run recipe workflows</span>
            </div>
            <nav>
                <Link to="/recipes" className="btn btn-outline">Recipes</Link>
                <Link to="/files" className="btn btn-outline ml-2">Files</Link>
            </nav>
        </header>
    );
};

export default Header;