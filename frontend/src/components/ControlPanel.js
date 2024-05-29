import React, { useState, useEffect } from 'react';
import './ControlPanel.css';

import ComponentSettingsModal from './ComponentSettingsModal';

import startSimulatiomImage from '../assets/images/start-simulation.png';
import componentSettingsImage from '../assets/images/component-settings.png';
import zoomInImage from '../assets/images/zoom-in.png';
import zoomOutImage from '../assets/images/zoom-out.png';

function ControlPanel({ onStartSimulation, onZoomIn, onZoomChange, onZoomOut, scale, selectedComponent }) {
    // Состояние для хранения информации о введённом масштабе
    const [inputValue, setInputValue] = useState(`${(scale * 100).toFixed(0)}%`);
    // Состояние для хранения информации о модальном окне (открыто / закрыто)
    const [isModalOpen, setIsModalOpen] = useState(false); // Открывается при нажатии на кнопку "Настройки элемента"

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

    const openSettingsModal = () => {
        if (selectedComponent) {
            setIsModalOpen(true);
        }
    };

    const closeSettingsModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="control-panel">
            <button onClick={onStartSimulation} data-title="Запуск симуляции" className="run-simulation-btn">
                <img src={startSimulatiomImage} alt="Запуск симуляции" />
            </button>
            {selectedComponent && selectedComponent.type !== "wire" && (
                <button onClick={openSettingsModal} data-title="Настройки элемента" className="component-settings-btn">
                    <img src={componentSettingsImage} alt="Настройки элемента" />
                </button>
            )}
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
            {isModalOpen && (
                <ComponentSettingsModal onClose={closeSettingsModal} element={selectedComponent}
                />
            )}
        </div>
    );
}

export default ControlPanel;