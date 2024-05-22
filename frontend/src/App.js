import React, { useState } from 'react';
import './App.css';
import CircuitCanvas from './components/CircuitCanvas';
import Sidebar from './components/Sidebar';
import logoImage from './assets/images/logo.svg';

function App() {
    const [selectedComponent, setSelectedComponent] = useState('');

    return (
        <div className="App">
            <header className="App-header">
                <h1>SimuCircuit</h1>
                <img src={logoImage} alt="Логотип" className="App-logo" /> {/* Класс для стилизации */}
            </header>
            <div className="App-content">
                <Sidebar onSelectComponent={setSelectedComponent} />
                <CircuitCanvas selectedComponent={selectedComponent} />
            </div>
        </div>
    );
}

export default App;
