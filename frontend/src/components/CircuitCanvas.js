import React, { useRef, useEffect, useState } from 'react';
import './CircuitCanvas.css';
import { componentsList } from '../components';

function CircuitCanvas({ selectedComponentFromSidebar, setSelectedComponentFromSidebar }) {
    const canvasRef = useRef(null);
    // Состояние для хранения информации о текущем масштабе
    const [scale, setScale] = useState(1); // Начальный масштаб 1x
    // Состояние для кэширования изображений
    const images = useRef({});
    // Состояние для хранения текущих координат курсора
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    // Состояние для хранения информации о текущих элементах и выбранном элементе
    const [elements, setElements] = useState([]);
    // Состояние для хранения информации о текущем положении курсора и выбранном элементе для предпросмотра.
    const [preview, setPreview] = useState(null);
    // Состояние для хранения информации о текущем элементе, на который наведена мышь
    const [hoveredComponentIndex, setHoveredComponentIndex] = useState(null);
    // Состояние для хранения информации о текущем выделенном на холсте элементе
    const [selectedComponentIndex, setSelectedComponentIndex] = useState(null);
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
    function drawComponent(context, component, x, y, opacity=1, rotation=0, isHovered=false, isSelected=false) {
        getOrLoadImage(component.image, (img) => {
            context.save();
            context.globalAlpha = opacity;
            context.translate(x, y);  // Перемещаем контекст в центр элемента
            context.rotate((rotation * Math.PI) / 180); // Вращаем контекст на угол в радианах
            context.drawImage(img, -component.width / 2, - component.height / 2, component.width, component.height);
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

    // Получение соединительных точек элемента
    function getConnectionPoints(element, component) {
        const radians = (element.rotation * Math.PI) / 180;
        return [
            { x: element.x + Math.cos(radians) * component.width / 2, y: element.y - Math.sin(radians) * component.width / 2 },
            { x: element.x - Math.cos(radians) * component.width / 2, y: element.y + Math.sin(radians) * component.width / 2 }
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
            context.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            context.fillStyle = 'turquoise';
            context.fill();
            context.shadowColor = 'rgba(0, 0, 0, 0.5)';
            context.shadowBlur = 5;
            context.strokeStyle = 'white';
            context.lineWidth = 1;
            context.stroke();
        });
    }

    // 
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
        const newScale = Math.min(Math.max(scale + delta, 0.5), 3); // Ограничиваем масштаб от 0.5x до 3x
        setScale(newScale);
    }

    // Корректировка координат курсора при масштабировании
    function getCanvasCoordinates(e) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale; // Учитываем масштаб для X
        const y = (e.clientY - rect.top) / scale; // Учитываем масштаб для Y
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
                    index === hoveredComponentIndex, index === selectedComponentIndex);
            }
        });
        if (preview) {
            const component = componentsList[preview.type];
            drawComponent(context, component, preview.x, preview.y, 0.5, preview.rotation);
        }
    }

    function handleClick(e) {
        let { x, y } = getCanvasCoordinates(e);

        const gridCellSize = 25; // Размер ячейки сетки

        // Округление координат для выравнивания элемента по сетке
        x = Math.round(x / gridCellSize) * gridCellSize;
        y = Math.round(y / gridCellSize) * gridCellSize;
        
        if (selectedComponentFromSidebar && selectedComponentFromSidebar !== 'wire') {
            const newElement = {
                type: selectedComponentFromSidebar,
                x: x,
                y: y,
                rotation: preview.rotation,
            }; // По умолчанию добавляем резистор
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

        if (selectedComponentFromSidebar === 'wire') {
            setIsDrawingWire(true);
            setCurrentWire({ startX: roundedX, startY: roundedY, endX: roundedX, endY: roundedY })
            setSelectedComponentFromSidebar(null);
            return;
        }

        let isConnectionPointClicked = false;
        elements.forEach((element, index) => {
            const component = componentsList[element.type];
            if (element.type === 'wire') {
                // Проверка, попадает ли клик в область провода
                if (isNearWire(roundedX, roundedY, element.startX, element.startY, element.endX, element.endY, 5)) {
                    setIsDragging(true);
                    setDraggedElementIndex(index);
                    setDragOffset({ x: x - element.startX, y: y - element.startY });  // Смещение относительно начальной точки провода
                    setSelectedComponentIndex(index);
                }
            } else if (index === hoveredComponentIndex) {
                // Получаем точки соединения для наведённого элемента
                const connectionPoints = getConnectionPoints(element, component);

                connectionPoints.forEach(point => {
                    if (Math.hypot(point.x - x, point.y - y) < 10) {
                        // Пользователь начал рисовать провод
                        setIsDrawingWire(true);
                        setCurrentWire({ startX: point.x, startY: point.y, endX: point.X, endY: point.Y })
                        isConnectionPointClicked = true;
                    }
                });
            }

            if (!isConnectionPointClicked &&
                !isDrawingWire &&
                x >= element.x - component.width / 2 && x <= element.x + component.width / 2 &&
                y >= element.y - component.height / 2 && y <= element.y + component.height / 2) {
                setIsDragging(true);
                setDraggedElementIndex(index);
                setDragOffset({ x: x - element.x, y: y - element.y });
                setSelectedComponentIndex(index);
            }
        });
    }

    function handleMouseMove(e) {
        let { x, y } = getCanvasCoordinates(e);
        x = x - dragOffset.x;
        y = y - dragOffset.y;

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
            // Рассчитываем ближайший угол в 45 градусов
            const dx = x - currentWire.startX;
            const dy = y - currentWire.startY;
            const dist = Math.hypot(dx, dy);
            const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
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

        if (isDrawingWire) {            
            // Округление конечных координат к ближайшей ячейке сетки
            const roundedEndX = Math.round(currentWire.endX / gridCellSize) * gridCellSize;
            const roundedEndY = Math.round(currentWire.endY / gridCellSize) * gridCellSize;
            
            // Проверяем, что длина провода равна хотя бы одной клетке сетки
            const dist = Math.hypot(roundedEndX - currentWire.startX, roundedEndY - currentWire.startY);
            if (dist >= gridCellSize) {
                const newElement = {
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

        // Управление углом поворота с клавиатуры
        if (e.key === 'r' || e.key === 'R') {
            if (selectedComponentFromSidebar && preview) {
                const newRotation = (preview.rotation + 45) % 360;
                setPreview({
                    type: selectedComponentFromSidebar,
                    x: cursorPosition.x,
                    y: cursorPosition.y,
                    rotation: newRotation
                });
            } else if (selectedComponentIndex !== null) {
                setElements(prevElements => prevElements.map((element, index) => {
                    if (index === selectedComponentIndex) {
                        const newRotation = (element.rotation + 45) % 360;
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
        isDrawingWire, currentWire
    ]);

    return <canvas ref={canvasRef} style={{width: '100%', height: '100%'}}></canvas>;
}

export default CircuitCanvas;