import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
    const [selectedDatabase, setSelectedDatabase] = useState('');
    const [databases, setDatabases] = useState([]);
    const [columns, setColumns] = useState({});
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch available databases
    useEffect(() => {
        const fetchDatabases = async () => {
            const response = await axios.get('http://localhost:3002/api/databases');
            setDatabases(response.data.databases);
        };
        fetchDatabases();
    }, []);

    // Fetch columns when database is selected
    useEffect(() => {
        const fetchColumns = async () => {
            if (selectedDatabase) {
                const response = await axios.get(`http://localhost:3002/api/columns?database=${selectedDatabase}`);
                setColumns(response.data.columns);
            }
        };
        fetchColumns();
    }, [selectedDatabase]);

    const handleQuery = async () => {
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:3002/api/query', {
                query,
                database: selectedDatabase
            });
            setResults(response.data.results);
            console.log('Generated query:', response.data.query);
            
        } catch (error) {
            console.error('Query error:', error.response?.data?.error || 'Failed to execute query');
            // Display error to user
            setResults([{
                error: error.response?.data?.error || 'Failed to execute query'
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container">
            <div className="main-content">
                <h1>Database Query Interface</h1>
                
                <div className="database-selector">
                    <select 
                        value={selectedDatabase}
                        onChange={(e) => setSelectedDatabase(e.target.value)}
                    >
                        <option value="">Select Database</option>
                        {databases.map((db, index) => (
                            <option key={index} value={db}>{db}</option>
                        ))}
                    </select>
                </div>

                <div className="query-section">
                    <input 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter your query in natural language..."
                        disabled={!selectedDatabase}
                    />
                    <button 
                        onClick={handleQuery}
                        disabled={loading || !selectedDatabase || !query}
                    >
                        {loading ? 'Processing...' : 'Execute Query'}
                    </button>
                </div>

                {results && (
                    <div className="results-section results-table">
                        <table>
                            <thead>
                                <tr>
                                    {Object.keys(results[0]).map((key, index) => (
                                        <th key={index}>{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result, index) => (
                                    <tr key={index}>
                                        {Object.values(result).map((value, idx) => (
                                            <td key={idx}>{value}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="sidebar">
                <h2>Database Structure</h2>
                {Object.entries(columns).map(([table, cols]) => (
                    <div key={table} className="table-info">
                        <h3>{table}</h3>
                        <ul>
                            {cols.map((col, index) => (
                                <li key={index}>{col}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;