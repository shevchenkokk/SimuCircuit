import React, { useRef, useState, useEffect } from 'react';

import './App.css';

import CircuitCanvas from './components/CircuitCanvas';
import Sidebar from './components/Sidebar';
import ControlPanel from './components/ControlPanel';
import logoImage from './assets/images/logo.svg';
import fileImage from './assets/images/file.png';

import CircuitErrorModal from './components/CircuitErrorModal';

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
    // Состояние для хранения информации об узлах и их идентификаторах
    const [nodeToIdMap, setNodeToIdMap] = useState(null);
    // Состояние для хранения информации о проводах и ветвях, которым они принадлежат
    const [wireToEdgeMap, setWireToEdgeMap] = useState(null);
    // Состояние для хранения информации о факте открытия модального окна
    // для отображения проблем в структуре собранной цепи
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Состояние для хранения информации о сообщении, выводимом в модальном окне
    const [modalMessage, setModalMessage] = useState("");

    const fileInputRef = useRef(null); // Ссыкла на input файла
    const nodeToIdMapRef = useRef(null);
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
            if (data.calculation_result.current) {
                setElements(prevElements => prevElements.map(element => {
                    if (element.type === 'wire') {
                        return {
                            ...element,
                            current: data.calculation_result.current,
                        };
                    }
                    return element;
                }));
            }
            if (data.calculation_result.branch_currents) {
                updateWireCurrents(data.calculation_result.branch_currents);
            }
            console.log("Calculation result: ", data);
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
                const nodeIdFrom = nodeToIdMapRef.current[element.from.split('.')[0]]
                const nodeIdTo = nodeToIdMapRef.current[element.to.split('.')[0]]
                const wireEdgeId = wireToEdgeMapRef.current[element.id];
                const branchCurrent = branchCurrents.find(bc => bc.id === wireEdgeId);
                if (branchCurrent) {
                    const isDirectionMatch = nodeIdFrom === branchCurrent.from && nodeIdTo === branchCurrent.to;

                    let [fromNode, fromPoint] = element.from.split('.');
                    let [toNode, toPoint] = element.to.split('.');

                    if (!isDirectionMatch) {
                        [fromNode, toNode] = [toNode, fromNode];
                        [fromPoint, toPoint] = [toPoint, fromPoint];
                    }

                    const newFrom = `${fromNode}.${fromPoint}`;
                    const newTo = `${toNode}.${toPoint}`;

                    return {
                        ...element,
                        current: branchCurrent.current,
                        from: newFrom,
                        to: newTo
                    };
                }
            }
            return element;
        }));
    };

    const analyzeCircuitGraph = (newCircuitGraph, connectionCounts) => {
        const hasPassiveElements = elements.some(element => element.type === 'resistor');
        if (!hasPassiveElements) {
            setModalMessage('В цепи отсутствуют пассивные элементы')
            setIsModalOpen(true);
            return false;
        }

        const hasActiveElements = elements.some(element => element.type === 'voltageSource' || element.type === 'currentSource');
        if (!hasActiveElements) {
            setModalMessage('В цепи отсутствуют активные элементы')
            setIsModalOpen(true);
            return false;
        }

        const singleConnectionPoints = Object.keys(connectionCounts).filter(key => connectionCounts[key].count === 1);
        if (singleConnectionPoints.length > 0) {
            setModalMessage('Некоторые элементы имеют только одно соединение, что может привести к неправильной работе цепи');
            setIsModalOpen(true);
            return false;
        }
        
        let isAllWiresEdgeFound = false;
        if (newCircuitGraph.nodes !== undefined && newCircuitGraph.edges !== undefined) {
            for (const edge of newCircuitGraph.edges) {
                const allWires = edge.elements.every(element => element.type === 'wire');
                if (allWires) {
                    setModalMessage('Одна или несколько ветвей содержат только провода, что может привести к короткому замыканию')
                    setIsModalOpen(true);
                    isAllWiresEdgeFound = true;
                }
            }
        }
        if (isAllWiresEdgeFound) return false;
        return true;
    }

    const handleStartSimulation = () => {
        const { newCircuitGraph, connectionCounts } = circuitCanvasRef.current.createCircuitGraph();

        if (!analyzeCircuitGraph(newCircuitGraph, connectionCounts)) return;

        if (newCircuitGraph.nodes.length === 0) {
            const simpleCircuitData = {
                'elements': elements.map(element =>  ({
                    type: element.type,
                    value: element.type === 'resistor' ? element.resistance
                    : element.type === 'voltageSource' ? element.voltage
                    : element.current
                }))
            }

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(simpleCircuitData));
            }
            console.log("Circuit for simulation: ", simpleCircuitData);
        } else {
            const { nodes, edges, newNodeToIdMap, newWireToEdgeMap } = formatCircuitGraphForServer(newCircuitGraph);

            const formattedCircuitGraph = { nodes, edges };
            
            setCircuitGraph(formattedCircuitGraph);
            setNodeToIdMap(newNodeToIdMap);
            setWireToEdgeMap(newWireToEdgeMap);

            // Отправка информации об электрической цепи WebSocket-серверу
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(formattedCircuitGraph));
            }
        }
    }

    const handleExport = () => {
        const dataStr = JSON.stringify(elements);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileName = 'circuit_data.json';
    
        let linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
    }

    const handleImport = (e) => {
        const file = e.target.files[0];
    
        if (file) {
            const reader = new FileReader();
    
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target.result);
                    setElements(json); // Обновление состояния элементов
                } catch (error) {
                    console.error("Error parsing JSON!", error);
                }
            };
    
            reader.readAsText(file);
        }
    }

    useEffect(() => {
        if (circuitGraph) {
            console.log("Circuit for simulation: ", circuitGraph);
        }
        nodeToIdMapRef.current = nodeToIdMap
        wireToEdgeMapRef.current = wireToEdgeMap
    }, [circuitGraph, nodeToIdMap, wireToEdgeMap]);

    return (
        <div className="app">
            <input type="file" onChange={handleImport} style={{ display: 'none' }} ref={fileInputRef} />
            <header className="app-header">
            <div className="file-menu">
                <button data-title="Файл" className="file-menu-btn">
                    <img src={fileImage} alt="Файл" />
                </button>
                <div className="dropdown-content">
                    <button onClick={() => fileInputRef.current && fileInputRef.current.click()}>Импорт</button>
                    <button onClick={handleExport}>Экспорт</button>
                </div>
            </div>
            <div className="app-logo-and-title">
                <h1>SimuCircuit</h1>
                <img src={logoImage} alt="Логотип" className="app-logo" /> {/* Класс для стилизации */}
            </div>
            <div className="right-spacer"></div>
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
            {isModalOpen && (
                <CircuitErrorModal onClose={() => setIsModalOpen(false)} message={modalMessage}
                />
            )}
        </div>
    );
}

export default App;
