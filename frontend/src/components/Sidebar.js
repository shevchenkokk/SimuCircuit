import React from 'react';
import './Sidebar.css';

import wireImage from '../assets/images/wire.svg';
import resistorImage from '../assets/images/resistor.svg';
import voltageSourceImage from '../assets/images/voltage-source.svg';
import currentSourceImage from '../assets/images/current-source.svg';
import capacitorImage from '../assets/images/capacitor.svg';
import inductorImage from '../assets/images/inductor.svg';
import ammeterImage from '../assets/images/ammeter.svg';
import voltmeterImage from '../assets/images/voltmeter.svg';

function Sidebar({ onSelectComponent }) {
    return (
        <div className="sidebar">
             <button onClick={() => onSelectComponent('wire')} data-title="Провод">
                <img src={wireImage} alt="Провод" />
            </button>
            <button onClick={() => onSelectComponent('resistor')} data-title="Резистор">
                <img src={resistorImage} alt="Резистор" />
            </button>
            <button onClick={() => onSelectComponent('voltageSource')} data-title="Источник напряжения">
                <img src={voltageSourceImage} alt="Источник напряжения" />
            </button>
            <button onClick={() => onSelectComponent('currentSource')} data-title="Источник тока">
                <img src={currentSourceImage} alt="Источник тока" />
            </button>
            <button onClick={() => onSelectComponent('capacitor')} data-title="Конденсатор">
                <img src={capacitorImage} alt="Конденсатор" />
            </button>
            <button onClick={() => onSelectComponent('inductor')} data-title="Катушка индуктивности">
                <img src={inductorImage} alt="Катушка индуктивности" />
            </button>
            <button onClick={() => onSelectComponent('ammeter')} data-title="Амперметр">
                <img src={ammeterImage} alt="Амперметр" />
            </button>
            <button onClick={() => onSelectComponent('voltmeter')} data-title="Вольтметр">
                <img src={voltmeterImage} alt="Вольтметр" />
            </button>
            {/* Добавляйте дополнительные кнопки для других компонентов */}
        </div>
    );
}

export default Sidebar;