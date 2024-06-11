import React from 'react';
import ReactDOM from 'react-dom';

import './CircuitErrorModal.css';

function CircuitErrorModal({ onClose, message }) {
    return ReactDOM.createPortal (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Ошибка</h2>
                <p>{message}</p>
                <button onClick={onClose}>Закрыть</button>
            </div>
        </div>,
        document.getElementById('modal-root')
    );
}

export default CircuitErrorModal;