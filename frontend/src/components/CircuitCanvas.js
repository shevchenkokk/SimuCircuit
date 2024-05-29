import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import './CircuitCanvas.css';
import { componentsList } from '../components';
import { v4 as uuidv4 } from 'uuid';

const CircuitCanvas = forwardRef(({
    selectedComponentFromSidebar,
    setSelectedComponentFromSidebar,
    elements,
    setElements,
    scale,
    setScale,
    selectedComponentIndex,
    setSelectedComponentIndex
 }, ref) => {
    const canvasRef = useRef(null);
    // Состояние для кэширования изображений
    const images = useRef({});
    // Состояние для хранения текущих координат курсора
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    // Состояние для хранения информации о текущем положении курсора и выбранном элементе для предпросмотра.
    const [preview, setPreview] = useState(null);
    // Состояние для хранения информации о текущем элементе, на который наведена мышь
    const [hoveredComponentIndex, setHoveredComponentIndex] = useState(null);
    // Состояние для хранения информации о факте перемещения элемента
    const [isDragging, setIsDragging] = useState(false);
    // Состояние для хранения информации о перемещаемом элементе
    const [draggedElementIndex, setDraggedElementIndex] = useState(null);
    // Состояние для хранения информации о сдвиге при перемещении
    const [dragOffset, setDragOffset] = useState({x: 0, y: 0});
    // Состояние для хранения информации о факте рисования провода
    const [isDrawingWire, setIsDrawingWire] = useState(false);
    // Состояние для хранения информации о текущем рисуемом проводе
    const [currentWire, setCurrentWire] = useState(null);
    // Состояние для хранения информации о факте перемещения канваса
    const [isPanning, setIsPanning] = useState(false);
    // Состояние для хранения информации о о начале перемещения канваса
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    // Состояние для хранения информации о текущем смещении канваса относительно исходного положения
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });

    function drawGrid(context, color, stepx, stepy) {
        context.strokeStyle = color;
        context.lineWidth = 0.5;

        for (let i = stepx + 0.5; i < context.canvas.width; i += stepx) {
            context.beginPath();
            context.moveTo(i, 0);
            context.lineTo(i, context.canvas.height);
            context.stroke();
        }

        for (let j = stepy + 0.5; j < context.canvas.height; j += stepy) {
            context.beginPath();
            context.moveTo(0, j);
            context.lineTo(context.canvas.width, j);
            context.stroke();
        }
    }

    function getOrLoadImage(src, callback) {
        if (images.current[src]) {
            callback(images.current[src]);
        } else {
            const img = new Image();
            img.onload = () => {
                images.current[src] = img;
                callback(img);
            };
            img.src = src;
        }
    }

    // Рисование элемента
    function drawComponent(context, component, x, y, opacity=1, rotation=0, isHovered=false, isSelected=false, type=null, value=null) {
        getOrLoadImage(component.image, (img) => {
            context.save();
            context.globalAlpha = opacity;
            context.translate(x, y);  // Перемещаем контекст в центр элемента
            context.rotate((rotation * Math.PI) / 180); // Вращаем контекст на угол в радианах
            context.drawImage(img, -component.width / 2, - component.height / 2, component.width, component.height);

            if (type) {
                // Рисование текста
                context.save();
                if (rotation === 180) {
                    context.rotate((rotation * Math.PI) / 180);
                } else if (rotation === 270) {
                    context.rotate(2 * (rotation * Math.PI) / 180);
                }

                const formattedValue = formatValue(type, value);

                context.font = "12px Arial";
                context.fillStyle = "turquoise";
                context.textAlign = "center";
                context.fillText(formattedValue, 0, -component.height / 2 + 20);  // Отрисовка над элементом
                context.restore();
            }

            if (isHovered) {
                drawConnectionPoints(context, {x, y, width: component.width, height: component.height, rotation})
            }
            if (isSelected) {                
                context.strokeStyle = 'turquoise'; // Выделение компоненты красным цветом при нажатии
                context.lineWidth = 2;
                context.strokeRect(-component.width / 2, -component.height / 2, component.width, component.height);
            }
            context.restore();
        });
    }

    // Рисование провода
    function drawWire(context, wire, isHovered=false, isSelected=false) {
        context.beginPath();
        context.moveTo(wire.startX, wire.startY);
        context.lineTo(wire.endX, wire.endY);
        context.strokeStyle = isSelected ? 'turquoise' : 'white';
        context.lineWidth = 3;
        context.stroke();

        if (isHovered) {
            drawWireConnectionPoints(context, wire.startX, wire.startY);
            drawWireConnectionPoints(context, wire.endX, wire.endY);
        }

        if (wire.current) {
            const dx = Math.abs(wire.endX - wire.startX);
            const dy = Math.abs(wire.endY - wire.startY);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            context.save();
            context.translate((wire.startX + wire.endX) / 2, (wire.startY + wire.endY) / 2);
            context.rotate(Math.atan2(dy, dx));

            // Выбор позиции для текста в зависимости от угла
            let textX = 0;
            let textY = -10;

            if (angle > 90 || angle < -90) {
                context.rotate(Math.PI); // Переворачиваем текст, чтобы он оставался наверху
                textY = 10;
            }

            context.fillStyle = 'turquoise';
            context.font = '12px Arial';
            context.textAlign = "center";
            context.fillText(`${wire.current.toFixed(2)} A`, textX, textY);
            context.restore();
        }
    }

    function drawWireConnectionPoints(context, x, y) {
        context.beginPath();
        context.arc(x, y, 4, 0, 2 * Math.PI);
        context.fillStyle = 'turquoise';
        context.fill();
        context.shadowColor = 'rgba(0, 0, 0, 0.5)';
        context.shadowBlur = 5;
        context.strokeStyle = 'white';
        context.lineWidth = 1;
        context.stroke();
    }

    // Функция для проверки близости точки к отрезку, учитывая порог eps
    function isNearWire(px, py, x1, y1, x2, y2, eps) {
        const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (L2 === 0) return false;

        const t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / L2;
        const tClamped = Math.max(0, Math.min(1, t));
        const nearestX = x1 + tClamped * (x2 - x1);
        const nearestY = y1 + tClamped * (y2 - y1);

        const dx = nearestX - px;
        const dy = nearestY - py;
        return Math.sqrt(dx * dx + dy * dy) <= eps;
    }

    // Получение текущего значения элемента
    function getElementValue(element) {
        switch (element.type) {
            case 'resistor':
                return element.resistance;
            case 'voltageSource':
                return element.voltage;
            case 'currentSource':
                return element.current;
            default:
                return "Неизвестный тип элемента"
        }
    }

    // Присваивание начального значения элемента при его создании
    function setInitialValue(element) {
        switch (element.type) {
            case 'resistor':
                element.resistance = 1; // 1 Ом
                break;
            case 'voltageSource':
                element.voltage = 1; // 1 Вольт
                break;
            case 'currentSource':
                element.current = 1; // 1 Ампер
                break;
            default:
        }
    }

    // Форматирование текста, отображаемого для элемента
    function formatValue(type, value) {
        const num = parseFloat(value);
    
        let formattedValue = num;
        let unit = "";
    
        // Определяем единицу измерения и форматируем число
        switch (type) {
            case 'resistor':
                unit = "Ω";  // Ом
                if (num >= 1000000) {
                    formattedValue = (num / 1000000).toFixed(2) + " M" + unit;  // Мегаомы
                } else if (num >= 1000) {
                    formattedValue = (num / 1000).toFixed(2) + " k" + unit;  // Килоомы
                } else if (num < 1) {
                    formattedValue = (num * 1000).toFixed(2) + " m" + unit;  // Миллиомы
                } else {
                    formattedValue = num.toFixed(2) + " " + unit;
                }
                break;
            case 'voltageSource':
                unit = "В";  // Вольты
                formattedValue = num.toFixed(2) + " " + unit;
                break;
            case 'currentSource':
                unit = "А";  // Амперы
                if (num >= 1000) {
                    formattedValue = (num / 1000).toFixed(2) + " k" + unit;  // Килоамперы
                } else if (num < 1) {
                    formattedValue = (num * 1000).toFixed(2) + " mA";  // Миллиамперы
                } else {
                    formattedValue = num.toFixed(2) + " " + unit;
                }
                break;
            default:
        }
    
        return formattedValue;
    }

    // Получение соединительных точек элемента
    function getConnectionPoints(element, component) {
        if (element.type === 'wire') {
            return [
                {   
                    x: Math.round(element.startX),
                    y: Math.round(element.startY)
                },
                { 
                    x: Math.round(element.endX),
                    y: Math.round(element.endY)
                }
            ]
        }
        const radians = (element.rotation * Math.PI) / 180;
        return [
            {
                x: Math.round(element.x + Math.cos(radians) * component.width / 2),
                y: Math.round(element.y + Math.sin(radians) * component.width / 2)
            },
            { 
                x: Math.round(element.x - Math.cos(radians) * component.width / 2),
                y: Math.round(element.y - Math.sin(radians) * component.width / 2)
            }
        ];
    }

    // Рисование соединительных точек элемента
    function drawConnectionPoints(context, element) {
        // Левая точка
        const points = [
            {
                x: -element.width / 2, y: 0
            },
            {
                x: element.width / 2, y: 0
            }
        ];

        points.forEach(point => {
            context.beginPath();
            context.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            context.fillStyle = 'turquoise';
            context.fill();
            context.shadowColor = 'rgba(0, 0, 0, 0.5)';
            context.shadowBlur = 5;
            context.strokeStyle = 'white';
            context.lineWidth = 1;
            context.stroke();
        });
    }

    // Рисование узлов – точек, в которых сходятся не менее трёх проводников
    function drawNodes(context) {
        const connectionCounts = {};
        elements.forEach(element => {
            const points = getConnectionPoints(element, componentsList[element.type]);
            points.forEach(point => {
                const key = `${point.x}_${point.y}`;
                if (connectionCounts[key]) {
                    connectionCounts[key].count += 1;
                    connectionCounts[key].points.push(element);
                } else {
                    connectionCounts[key] = { count: 1, points: [element] };
                }
            });
        });

        Object.keys(connectionCounts).forEach(key => {
            if (connectionCounts[key].count >= 3) {
                const [x, y] = key.split('_').map(Number);
                context.beginPath();
                context.arc(x, y, 5, 0, 2 * Math.PI, false); // Размер кружка можно настроить
                context.fillStyle = 'turquoise'; // Цвет кружка
                context.fill();
                context.lineWidth = 2;
                context.strokeStyle = '#003300';
                context.stroke();
            }
        });
    }

    useImperativeHandle(ref, () => ({
        createCircuitGraph,
    }));

    // Построение графа, представляющего электрическую цепь
    // TODO
    function createCircuitGraph() {
        // Для поиска узлов
        const connectionCounts = {};
        // Для хранения связей между соединительными точками
        const connections = {}

        elements.forEach(element => {
            const points = getConnectionPoints(element, componentsList[element.type]);
            points.forEach((point, index) => {
                const key = `${point.x}_${point.y}`;
                if (!connections[key]) {
                    connections[key] = []
                }

                if (index === 0 && points[1]) {
                    connections[key].push({ node: `${points[1].x}_${points[1].y}`, element });
                    connections[`${points[1].x}_${points[1].y}`] = connections[`${points[1].x}_${points[1].y}`] || [];
                    connections[`${points[1].x}_${points[1].y}`].push({ node: key, element });
                }

                if (connectionCounts[key]) {
                    connectionCounts[key].count += 1;
                    connectionCounts[key].points.push(element);
                } else {
                    connectionCounts[key] = { count: 1, points: [element] };
                }
            });
        });

        const nodes = Object.keys(connectionCounts).filter(key => connectionCounts[key].count >= 3);
        const nodesSet = new Set(nodes);

        // Поиск всех путей от startNode до endNode со сбором элементов
        function findAllPaths(startNode, endNode, connections) {
            const paths = [];
            const visited = new Set();

            // Используем алгоритм обхода графа в глубину
            function dfs(currentNode, currentPath) {
                if (currentNode === endNode) {
                    // Добавляем копию текущего пути в результат
                    paths.push(currentPath.slice());
                    return;
                }

                visited.add(currentNode);

                if (connections[currentNode]) {
                    connections[currentNode].forEach(neighbor => {
                        if (!visited.has(neighbor.node)) {
                            if (!nodesSet.has(neighbor.node) || neighbor.node === endNode) {
                                if (neighbor.element.type === 'voltageSource' || neighbor.element.type === 'currentSource') {
                                    // Определение направления источника
                                    if (neighbor.element.rotation === 0) {
                                        if (currentNode.split('_')[0] < endNode.split('_')[0]) {
                                            neighbor.element.direction = { from: startNode, to: endNode }
                                        } else {
                                            neighbor.element.direction = { from: endNode, to: startNode }
                                        }
                                    } else if (neighbor.element.rotation === 90) {
                                        if ((currentNode.split('_')[1] < endNode.split('_')[1])) {
                                            neighbor.element.direction = {from: endNode, to: startNode }
                                        } else {
                                            neighbor.element.direction = {from: startNode, to: endNode }
                                        }
                                    } else if (neighbor.element.rotation === 180) {
                                        if ((currentNode.split('_')[0] < endNode.split('_')[0])) {
                                            neighbor.element.direction = {from: endNode, to: startNode }
                                        } else {
                                            neighbor.element.direction = {from: startNode, to: endNode }
                                        }
                                    } else if (neighbor.element.rotation === 270) {
                                        if ((currentNode.split('_')[1] < endNode.split('_')[1])) {
                                            neighbor.element.direction = {from: startNode, to: endNode }
                                        } else {
                                           neighbor.element.direction = {from: endNode, to: startNode }
                                        }
                                    }
                                }
                                currentPath.push(neighbor.element);
                                dfs(neighbor.node, currentPath);
                                currentPath.pop();
                            }
                        }
                    });
                }

                visited.delete(currentNode);
            };

            dfs(startNode, [])

            return paths;
        };
        
        let edges = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const allPaths = findAllPaths(nodes[i], nodes[j], connections);
                edges = edges.concat(allPaths.map(path => ({
                    from: nodes[i],
                    to: nodes[j],
                    elements: path
                })));
            }
        }
        
        const circuitGraph = {
            nodes: nodes,
            edges: edges
        };

        return circuitGraph;
    }

    // Корректировка координат курсора при масштабировании
    function getCanvasCoordinates(e) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale - canvasOffset.x // Учитываем масштаб для X
        const y = (e.clientY - rect.top) / scale - canvasOffset.y; // Учитываем масштаб для Y
        return { x, y };
    }

    function handleResize() {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const context = canvas.getContext('2d', { alpha: true, antialias: true });
        context.imageSmoothingEnabled = false;
        const dpr = window.devicePixelRatio; // Учет плотности пикселей устройства

        // Устанавливаем фактические размеры холста в пикселях
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Устанавливаем размеры стилей для корректного отображения на странице
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        context.scale(dpr * scale, dpr * scale);

        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.save();
        context.translate(canvasOffset.x, canvasOffset.y);

        drawGrid(context, 'rgba(128, 128, 128, 0.35)', 25, 25);
        if (currentWire) {
            drawWire(context, currentWire); // Рисуем провод
        }
        elements.forEach((element, index) => {
            if (element.type === 'wire') {
                drawWire(context, element, index === hoveredComponentIndex, index === selectedComponentIndex)
            } else {
                const component = componentsList[element.type];
                drawComponent(context, component, element.x, element.y, 1, element.rotation,
                    index === hoveredComponentIndex, index === selectedComponentIndex, element.type, getElementValue(element));
            }
        });
        if (preview) {
            const component = componentsList[preview.type];
            drawComponent(context, component, preview.x, preview.y, 0.5, preview.rotation);
        }
        drawNodes(context);
        context.restore();
    }

    function handleWheel(e) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        // Проверяем, находится ли курсор внутри области canvas
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            e.preventDefault(); // Останавливаем прокрутку страницы
            e.stopPropagation(); // Останавливаем всплывание события
        }

        const delta = e.deltaY * -0.01; // Изменение масштаба на каждое движение колесика
        const newScale = Math.min(Math.max(scale + delta, 0.5), 3); // Ограничиваем масштаб от 0.2x до 3x
        setScale(newScale);
    }


    function handleClick(e) {
        let { x, y } = getCanvasCoordinates(e);

        const gridCellSize = 25; // Размер ячейки сетки

        // Округление координат для выравнивания элемента по сетке
        x = Math.round(x / gridCellSize) * gridCellSize;
        y = Math.round(y / gridCellSize) * gridCellSize;
        
        if (selectedComponentFromSidebar && selectedComponentFromSidebar !== 'wire') {
            const newElement = {
                id: uuidv4(),
                type: selectedComponentFromSidebar,
                x: x,
                y: y,
                rotation: preview.rotation,
            }; // По умолчанию добавляем резистор
            setInitialValue(newElement);
            setElements(prevElements => [...prevElements, newElement]);
            setSelectedComponentFromSidebar(null);
            setPreview(null);
            return;
        }

        let isComponentClicked = false;
        elements.forEach((element, index) => {
            if (element.type === 'wire') {
                if (isNearWire(x, y, element.startX, element.startY, element.endX, element.endY, 8)) {
                    isComponentClicked = true;
                    setSelectedComponentIndex(index);
                }
            } else {
                const component = componentsList[element.type];
                if (x >= element.x - component.width / 2 && x <= element.x + component.width / 2 &&
                    y >= element.y - component.height / 2 && y <= element.y + component.height / 2) {
                    isComponentClicked = true;
                    setSelectedComponentIndex(index);
                }
            }
        });

        if (!isComponentClicked) {
            setSelectedComponentIndex(null);
        }
    }

    function handleMouseDown(e) {
        const { x, y } = getCanvasCoordinates(e);

         // Округление координат для выравнивания элемента по сетке
        const gridCellSize = 25;
        const roundedX = Math.round(x / gridCellSize) * gridCellSize;
        const roundedY = Math.round(y / gridCellSize) * gridCellSize;


        let isWireDrawing = false;
        if (selectedComponentFromSidebar === 'wire') {
            isWireDrawing = true;
            setIsDrawingWire(true);
            setCurrentWire({ startX: roundedX, startY: roundedY, endX: roundedX, endY: roundedY })
            setSelectedComponentFromSidebar(null);
            return;
        }

        let isComponentDragging = false;
        elements.forEach((element, index) => {
            let isConnectionPointClicked = false;
            const component = componentsList[element.type];
            // Получаем точки соединения для наведённого элемента
            const connectionPoints = getConnectionPoints(element, component);

            connectionPoints.forEach(point => {
                if (Math.hypot(point.x - x, point.y - y) < 10) {
                    // Пользователь начал рисовать провод
                    isWireDrawing = true;
                    setIsDrawingWire(true);
                    setCurrentWire({ startX: point.x, startY: point.y, endX: point.X, endY: point.Y })
                    isConnectionPointClicked = true;
                }
            });

            if (!isConnectionPointClicked && !isDrawingWire) {
                if (element.type === "wire") {
                    // Проверка, попадает ли клик в область провода
                    if (isNearWire(roundedX, roundedY, element.startX, element.startY, element.endX, element.endY, 8)) {
                        isComponentDragging = true;
                        setIsDragging(true);
                        setDraggedElementIndex(index);
                        setDragOffset({ x: x - element.startX, y: y - element.startY });  // Смещение относительно начальной точки провода
                        setSelectedComponentIndex(index);
                    }
                } else if (x >= element.x - component.width / 2 && x <= element.x + component.width / 2 &&
                y >= element.y - component.height / 2 && y <= element.y + component.height / 2) {
                    isComponentDragging = true;
                    setIsDragging(true);
                    setDraggedElementIndex(index);
                    setDragOffset({ x: x - element.x, y: y - element.y });
                    setSelectedComponentIndex(index);
                }
            }
        });

        if (!isComponentDragging && !isWireDrawing) {
            setIsPanning(true);
            setPanStart({ x, y });
        }
    }

    function handleMouseMove(e) {
        let { x, y } = getCanvasCoordinates(e);
        x = x - dragOffset.x;
        y = y - dragOffset.y;

        if (isPanning) {
            const dx = x - panStart.x;
            const dy = y - panStart.y;
            setCanvasOffset(prevOffset => ({
                x: prevOffset.x + dx,
                y: prevOffset.y + dy
            }));
            return;
        }

        let isComponentHovered = false;
        elements.forEach((element, index) => {
            if (element.type === 'wire') {
                if (isNearWire(x, y, element.startX, element.startY, element.endX, element.endY, 8)) {
                    isComponentHovered = true;
                    setHoveredComponentIndex(index);
                }
            } else {
                const component = componentsList[element.type];
                if (x >= element.x - component.width / 2 && x <= element.x + component.width / 2 &&
                    y >= element.y - component.height / 2 && y <= element.y + component.height / 2) {
                    isComponentHovered = true;
                    setHoveredComponentIndex(index);
                }
            }
        });

        if (!isComponentHovered) {
            setHoveredComponentIndex(null);
        }

        if (isDrawingWire) {
            // Рассчитываем ближайший угол в 90 градусов
            const dx = x - currentWire.startX;
            const dy = y - currentWire.startY;
            const dist = Math.hypot(dx, dy);
            const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 2)) * (Math.PI / 2);
            const endX = currentWire.startX + Math.cos(angle) * dist;
            const endY = currentWire.startY + Math.sin(angle) * dist;
            setCurrentWire(prevWire => ({ ...prevWire, endX: endX, endY: endY }));
        }

        if (!selectedComponentFromSidebar && !isDragging && draggedElementIndex == null) return;

        setCursorPosition({ x, y });

         // Активируем предпросмотр только если выбран компонент из левой панели
        if (selectedComponentFromSidebar) {
            if (selectedComponentFromSidebar === 'wire') return;
            setPreview({
                type: selectedComponentFromSidebar,
                x: x,
                y: y,
                rotation: preview ? preview.rotation : 0
            });
        } else if (isDragging) {
            const element = elements[draggedElementIndex];
            if (element.type === 'wire') {
                // Перемещаем оба конца провода на разницу между новым и старым положением мыши
                const dx = x - element.startX;
                const dy = y - element.startY;
                setElements(prevElements => prevElements.map((el, idx) => idx === draggedElementIndex ? {
                    ...el,
                    startX: el.startX + dx,
                    startY: el.startY + dy,
                    endX: el.endX + dx,
                    endY: el.endY + dy
                } : el));
            } else {
                setElements(prevElements => prevElements.map((element, index) =>
                    index === draggedElementIndex ? { ...element, x: x, y: y } : element
                ));
            }
        } 
    }

    function handleMouseUp() {
        const gridCellSize = 25; // Размер ячейки сетки, по которому производим выравнивание

        if (isPanning) {
            setIsPanning(false);
        }

        if (isDrawingWire) {            
            // Округление конечных координат к ближайшей ячейке сетки
            const roundedEndX = Math.round(currentWire.endX / gridCellSize) * gridCellSize;
            const roundedEndY = Math.round(currentWire.endY / gridCellSize) * gridCellSize;
            
            // Проверяем, что длина провода равна хотя бы одной клетке сетки
            const dist = Math.hypot(roundedEndX - currentWire.startX, roundedEndY - currentWire.startY);
            if (dist >= gridCellSize) {
                const newElement = {
                    id: uuidv4(),
                    type: 'wire',
                    startX: currentWire.startX,
                    startY: currentWire.startY,
                    endX: roundedEndX,
                    endY: roundedEndY,
                };
                setElements(prevElements => [...prevElements, newElement]);
            } else {
                setSelectedComponentFromSidebar('wire');
            }

            setIsDrawingWire(false);
            setCurrentWire(null);
        }
        if (isDragging && draggedElementIndex !== null) {
            setElements(prevElements => prevElements.map((element, index) => {
                if (index === draggedElementIndex) {
                    if (element.type === 'wire') {
                        const roundedStartX = Math.round(element.startX / gridCellSize) * gridCellSize;
                        const roundedStartY = Math.round(element.startY / gridCellSize) * gridCellSize;
                        const roundedEndX = Math.round(element.endX / gridCellSize) * gridCellSize;
                        const roundedEndY = Math.round(element.endY / gridCellSize) * gridCellSize;
                        return { ...element, startX: roundedStartX, startY: roundedStartY, endX: roundedEndX, endY: roundedEndY };
                    } else {
                        const roundedX = Math.round(element.x / gridCellSize) * gridCellSize;
                        const roundedY = Math.round(element.y / gridCellSize) * gridCellSize;
                        return { ...element, x: roundedX, y: roundedY };
                    }
                }
                return element;
            }));

            setIsDragging(false);
            setDraggedElementIndex(null);
            setDragOffset({ x: 0, y: 0 });
        }
    }

    function clearPreview() {
        setPreview(null);  // Очищаем предпросмотр, когда мышь уходит с канваса
    }

    // Обработка нажатий на клавиши
    function handleKeyDown(e) {
        if (!cursorPosition) return;
        
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
            return;
        }

        // Управление углом поворота с клавиатуры
        if (e.key === 'r' || e.key === 'R') {
            if (selectedComponentFromSidebar && preview) {
                const newRotation = (preview.rotation + 90) % 360;
                setPreview({
                    type: selectedComponentFromSidebar,
                    x: cursorPosition.x,
                    y: cursorPosition.y,
                    rotation: newRotation
                });
            } else if (selectedComponentIndex !== null) {
                setElements(prevElements => prevElements.map((element, index) => {
                    if (index === selectedComponentIndex) {
                        const newRotation = (element.rotation + 90) % 360;
                        return { ...element, rotation: newRotation }
                    }
                    return element;
                }));
            }
        }

        // Удаление выбранного элемента
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (selectedComponentIndex !== null) {
                setElements(prevElements => prevElements.filter((_, index) => index !== selectedComponentIndex));
                setSelectedComponentIndex(null); // Сбросить индекс выбранного элемента
            }
        }
    }

    useEffect(() => {
        handleResize();
        const canvas = canvasRef.current;
        window.addEventListener('resize', handleResize);
        canvas.addEventListener('wheel', handleWheel);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', clearPreview);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', clearPreview);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [scale, elements, preview, hoveredComponentIndex,
        selectedComponentFromSidebar, selectedComponentIndex,
        isDragging, draggedElementIndex, dragOffset,
        isDrawingWire, currentWire, isPanning, panStart, canvasOffset
    ]);

    return (
        <div className='circuit-canvas'>
            <canvas ref={canvasRef} style={{width: '100%', height: '100%'}}>
            </canvas>;
        </div>
    );
});

export default CircuitCanvas;