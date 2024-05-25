import React, { useState } from 'react';
import './App.css';
import CircuitCanvas from './components/CircuitCanvas';
import Sidebar from './components/Sidebar';
import ControlPanel from './components/ControlPanel';
import logoImage from './assets/images/logo.svg';

function App() {
    // Состояние для хранения информации о выбранном элементе с боковой панели
    const [selectedComponentFromSidebar, setSelectedComponentFromSidebar] = useState('');
    // Состояние для хранения информации о текущем масштабе
    const [scale, setScale] = useState(1);
    // Состояние для хранения информации о текущих элементах и выбранном элементе
    const [elements, setElements] = useState([]);
    // Состояние для хранения информации о текущем выделенном на холсте элементе
    const [selectedComponentIndex, setSelectedComponentIndex] = useState(null);

    const handleZoomIn = () => {
        setScale(prevScale => Math.min(prevScale + 0.1, 3));  // Ограничение максимального зума
    };

    const handleZoomChange = (newScale) => {
        setScale(Math.min(Math.max(newScale, 0.5), 3));  // Ограничение масштаба от 0.5x до 3x
    };

    const handleZoomOut = () => {
        setScale(prevScale => Math.max(prevScale - 0.1, 0.5));  // Ограничение минимального зума
    };

    const handleStartSimulation = () => {
        console.log("Starting simulation");
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1>SimuCircuit</h1>
                <img src={logoImage} alt="Логотип" className="app-logo" /> {/* Класс для стилизации */}
            </header>
            <div className="app-content">
                <Sidebar onSelectComponent={setSelectedComponentFromSidebar} />
                <div className="main-content">
                    <ControlPanel
                        onStartSimulation={handleStartSimulation}
                        onZoomIn={handleZoomIn}
                        onZoomChange={handleZoomChange}
                        onZoomOut={handleZoomOut}
                        scale={scale}
                        selectedComponent={selectedComponentIndex !== null ? elements[selectedComponentIndex] : null}
                    />
                    <CircuitCanvas
                        selectedComponentFromSidebar={selectedComponentFromSidebar}
                        setSelectedComponentFromSidebar={setSelectedComponentFromSidebar}
                        elements={elements}
                        setElements={setElements}
                        scale={scale}
                        setScale={setScale}
                        selectedComponentIndex={selectedComponentIndex}
                        setSelectedComponentIndex={setSelectedComponentIndex}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;
