import React, { useRef, useState, useEffect } from 'react';

import './App.css';

import CircuitCanvas from './components/CircuitCanvas';
import Sidebar from './components/Sidebar';
import ControlPanel from './components/ControlPanel';
import logoImage from './assets/images/logo.svg';

import { formatCircuitGraphForServer } from './utils/CircuitUtils';

function App() {
    // Состояние для хранения информации о выбранном элементе с боковой панели
    const [selectedComponentFromSidebar, setSelectedComponentFromSidebar] = useState('');
    // Состояние для хранения информации о текущем масштабе
    const [scale, setScale] = useState(1);
    // Состояние для хранения информации о текущих элементах и выбранном элементе
    const [elements, setElements] = useState([]);
    // Состояние для хранения информации о текущем выделенном на холсте элементе
    const [selectedComponentIndex, setSelectedComponentIndex] = useState(null);
    // Состояние для хранения информации о графе электрической цепи, построенной пользователем
    const [circuitGraph, setCircuitGraph] = useState(null);
    // Состояние для хранения информации о проводах и ветвях, которым они принадлежат
    const [wireToEdgeMap, setWireToEdgeMap] = useState(null);

    const wireToEdgeMapRef = useRef(null);

    // Ссылка на CircuitCanvas
    const circuitCanvasRef = useRef(null);

    const [socket, setSocket] = useState(null);

    function setUpWebSocket() {
        // Подключение к WebSocket-серверу
        const ws = new WebSocket('ws://localhost:4000/ws');
        
        ws.onopen = () => {
            console.log('WebSocket connected');
        };

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.calculation_result.branch_currents && data.calculation_result.branch_currents) {
                updateWireCurrents(data.calculation_result.branch_currents);
            }
        };

        ws.onerror = (error) => {
            console.log('WebSocket error: ', error);
        };

        ws.onclose = (e) => {
            console.log('WebSocket closed, trying to reconnect...', e);
            setTimeout(setUpWebSocket, 5000) // Попытка переподключения через 5 секунд
        };

        return ws;
    }

    useEffect(() => {
        // Подключение к WebSocket-серверу
        const ws = setUpWebSocket();
        setSocket(ws);

        return () => {
            ws.close();
        };
    }, []);

    const handleZoomIn = () => {
        setScale(prevScale => Math.min(prevScale + 0.1, 3));  // Ограничение максимального зума
    };

    const handleZoomChange = (newScale) => {
        setScale(Math.min(Math.max(newScale, 0.5), 3));  // Ограничение масштаба от 0.5x до 3x
    };

    const handleZoomOut = () => {
        setScale(prevScale => Math.max(prevScale - 0.1, 0.5));  // Ограничение минимального зума
    };

    const updateWireCurrents = (branchCurrents) => {
        setElements(prevElements => prevElements.map(element => {
            if (element.type === 'wire') {
                const wireEdgeId = wireToEdgeMapRef.current[element.id];
                const branchCurrent = branchCurrents.find(bc => bc.id === wireEdgeId);
                if (branchCurrent) {
                    return { ...element, current: branchCurrent.current };
                }
            }
            return element;
        }));
    };

    const handleStartSimulation = () => {
        const newCircuitGraph = circuitCanvasRef.current.createCircuitGraph();
        
        const { nodes, edges, newWireToEdgeMap } = formatCircuitGraphForServer(newCircuitGraph);

        const formattedCircuitGraph = { nodes, edges };
        
        setCircuitGraph(formattedCircuitGraph);
        setWireToEdgeMap(newWireToEdgeMap);

        // Отправка информации об электрической цепи WebSocket-серверу
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(formattedCircuitGraph));
        }
    };

    useEffect(() => {
        if (circuitGraph) {
            console.log("Formatted circuit for simulation: ", circuitGraph);
        }
        wireToEdgeMapRef.current = wireToEdgeMap
    }, [circuitGraph, wireToEdgeMap]);

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
                        ref={circuitCanvasRef}
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
