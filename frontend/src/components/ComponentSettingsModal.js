import React from 'react';
import ReactDOM from 'react-dom';

import './ComponentSettingsModal.css';

function ComponentSettingsModal({ onClose, element }) {

    const handleInputChange = (e) => {
        const value = e.target.value;
        const numericValue = parseFloat(value);

        switch (element.type) {
            case 'resistor':
                element.resistance = numericValue;
                break;
            case 'voltageSource':
                element.voltage = numericValue;
                break;
            case 'currentSource':
                element.current = numericValue;
                break;
            default:
        }
    };

    function getComponentType() {
        switch (element.type) {
            case 'resistor':
                return 'Резистор';
            case 'voltageSource':
                return 'Источник напряжения';
            case 'currentSource':
                return 'Источник тока';
            default:
                return "Неизвестный тип элемента";
        }
    }

    return ReactDOM.createPortal (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Настройки элемента "{getComponentType()}"</h2>
                {element.type === 'resistor' && (
                    <div>
                        <label> Сопротивление: </label>
                        <input
                            type="number"
                            min="0"
                            defaultValue={element.resistance ? element.resistance : 0}
                            title="Введите сопротивление в омах (Ом)"
                            onChange={handleInputChange} /> Ом
                    </div>
                )}
                {element.type === 'voltageSource' && (
                    <div>
                        <label> Напряжение: </label>
                        <input
                            type="number"
                            min="0"
                            defaultValue={element.voltage ? element.voltage : 0}
                            title="Введите напряжение в вольтах (В)"
                            onChange={handleInputChange} /> В
                    </div>
                )}
                {element.type === 'currentSource' && (
                    <div>
                        <label> Сила тока: </label>
                        <input
                            type="number"
                            min="0"
                            defaultValue={element.current ? element.current : 0}
                            title="Введите силу тока в амперах (А)"
                            onChange={handleInputChange} /> А
                    </div>
                )}
                <button onClick={onClose}>Закрыть</button>
            </div>
        </div>,
        document.getElementById('modal-root')
    );
}

export default ComponentSettingsModal;