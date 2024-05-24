import React, { useState, useEffect } from 'react';
import './ControlPanel.css';

import startSimulatiomImage from '../assets/images/start-simulation.png';
import zoomInImage from '../assets/images/zoom-in.png';
import zoomOutImage from '../assets/images/zoom-out.png';

function ControlPanel({ onStartSimulation, onZoomIn, onZoomChange, onZoomOut, scale }) {
    // Состояние для хранения информации о введённом масштабе
    const [inputValue, setInputValue] = useState(`${(scale * 100).toFixed(0)}%`);

    useEffect(() => {
        setInputValue(`${(scale * 100).toFixed(0)}%`);
    }, [scale]);

    const handleZoomInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleZoomInputKeyPress = (e) => {
        if (e.key === 'Enter') {
            const value = inputValue.replace('%', ''); // Удаляем знак процента
            const numericValue = parseFloat(value);

            if (!isNaN(numericValue)) {
                onZoomChange(numericValue / 100); // Преобразуем процентное значение в масштаб
            }
        }
    };

    return (
        <div className="control-panel">
            <button onClick={onStartSimulation} data-title="Запуск симуляции" className="run-simulation-btn">
                <img src={startSimulatiomImage} alt="Запуск симуляции" />
            </button>
            <button onClick={onZoomIn} data-title="Увеличить масштаб" className="zoom-in-btn">
                <img src={zoomInImage} alt="Увеличить масштаб" />
            </button>
            <input
                type="text"
                value={inputValue}
                onChange={handleZoomInputChange}
                onKeyPress={handleZoomInputKeyPress}
                className="zoom-input"
            />
            <button onClick={onZoomOut} data-title="Уменьшить масштаб" className="zoom-out-btn">
                <img src={zoomOutImage} alt="Уменьшить масштаб" />
            </button>
        </div>
    );
}

export default ControlPanel;