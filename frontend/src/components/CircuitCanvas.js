import React, { useRef, useEffect, useState } from 'react';
import { componentsList } from '../components';

function CircuitCanvas({ selectedComponentFromSidebar, setSelectedComponentFromSidebar }) {
    const canvasRef = useRef(null);
    // Состояние для кэширования изображений
    const images = useRef({});
    // Состояние для хранения текущих координат курсора
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    // Состояние для хранения информации о текущих элементах и выбранном элементе
    const [elements, setElements] = useState([]);
    // Состояние для хранения информации о текущем положении курсора и выбранном элементе для предпросмотра.
    const [preview, setPreview] = useState(null);
    // Состояние для хранения информации о текущем угле поворота выбранного элемента
    const [rotation, setRotation] = useState(0);
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
        context.strokeStyle = 'white';
        context.lineWidth = 3;
        context.stroke();

        if (isSelected) {
            context.strokeStyle = 'turquoise';
            context.lineWidth = 2;
            const rectX = Math.min(wire.startX, wire.endX);
            const rectY = Math.min(wire.startY, wire.endY);
            const rectWidth = Math.abs(wire.endX - wire.startX);
            const rectHeight = Math.abs(wire.endY - wire.startY);
            context.strokeRect(rectX, rectY - 2, rectWidth, rectHeight + 4);
        }
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
        const radians = (rotation * Math.PI) / 180;

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
            const rotatedX = point.x * Math.cos(radians) - point.y * Math.sin(radians);
            const rotatedY = point.x * Math.sin(radians) + point.y * Math.cos(radians);

            context.beginPath();
            context.arc(rotatedX, rotatedY, 4, 0, 2 * Math.PI);
            context.fillStyle = 'turquoise';
            context.fill();
            context.shadowColor = 'rgba(0, 0, 0, 0.5)';
            context.shadowBlur = 5;
            context.strokeStyle = 'white';
            context.lineWidth = 0.5;
            context.stroke();
        });
    }

    function handleResize() {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        const scale = window.devicePixelRatio; // Учет плотности пикселей устройства

        // Устанавливаем фактические размеры холста в пикселях
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;

        // Устанавливаем размеры стилей для корректного отображения на странице
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        context.scale(scale, scale);
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
        const rect = canvasRef.current.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        const gridCellSize = 25; // Размер ячейки сетки

        // Округление координат для выравнивания элемента по сетке
        const x = Math.round(rawX / gridCellSize) * gridCellSize;
        const y = Math.round(rawY / gridCellSize) * gridCellSize;
        
        if (selectedComponentFromSidebar && selectedComponentFromSidebar !== 'wire') {
            const newElement = {
                type: selectedComponentFromSidebar,
                x: x,
                y: y,
                rotation: rotation,
            }; // По умолчанию добавляем резистор
            setElements(prevElements => [...prevElements, newElement]);
            setSelectedComponentFromSidebar(null);
            setPreview(null);
            setRotation(0);
            return;
        }

        let isComponentClicked = false;
        elements.forEach((element, index) => {
            if (element.type === 'wire') {
                const rectX = Math.min(element.startX, element.endX);
                const rectY = Math.min(element.startY, element.endY);
                const rectWidth = Math.abs(element.endX - element.startX);
                const rectHeight = Math.abs(element.endY - element.startY);

                if (x >= rectX && x <= rectX + rectWidth && y >= rectY && y <= rectY + rectHeight) {
                    setSelectedComponentIndex(index);
                    isComponentClicked = true;
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
        const rect = canvasRef.current.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

         // Округление координат для выравнивания элемента по сетке
         const gridCellSize = 25;
         const x = Math.round(rawX / gridCellSize) * gridCellSize;
         const y = Math.round(rawY / gridCellSize) * gridCellSize;

        if (selectedComponentFromSidebar === 'wire') {
            setIsDrawingWire(true);
            setCurrentWire({ startX: x, startY: y, endX: x, endY: y })
            setSelectedComponentFromSidebar(null);
            return;
        }

        let isConnectionPointClicked = false;
        elements.forEach((element, index) => {
            const component = componentsList[element.type];
            if (element.type === 'wire') {
                // Проверка, попадает ли клик в область провода
                const rectX = Math.min(element.startX, element.endX);
                const rectY = Math.min(element.startY, element.endY);
                const rectWidth = Math.abs(element.endX - element.startX);
                const rectHeight = Math.abs(element.endY - element.startY);
                if (x >= rectX && x <= rectX + rectWidth && y >= rectY && y <= rectY + rectHeight) {
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
        const rect = canvasRef.current.getBoundingClientRect();
        // Обновление координат курсора относительно холста с учётом смещения между точкой клика и положением элемента
        const x = e.clientX - rect.left - dragOffset.x;
        const y = e.clientY - rect.top - dragOffset.y;

        let isComponentHovered = false;
        elements.forEach((element, index) => {
            if (element.type === 'wire') {
                const rectX = Math.min(element.startX, element.endX);
                const rectY = Math.min(element.startY, element.endY);
                const rectWidth = Math.abs(element.endX - element.startX);
                const rectHeight = Math.abs(element.endY - element.startY);

                if (x >= rectX && x <= rectX + rectWidth && y >= rectY && y <= rectY + rectHeight) {
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
                rotation: rotation
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

    function handleKeyDown(e) {
        // Если компонент не выбран, ничего не делаем
        if (!selectedComponentFromSidebar || !cursorPosition) return;

        const updateRotation = (newRotation) => {
            setRotation(newRotation);
    
            setPreview({
                type: selectedComponentFromSidebar,
                x: cursorPosition.x,
                y: cursorPosition.y,
                rotation: newRotation
            });
        };

        // Управление углом поворота с клавиатуры
        if (e.key === 'r' || e.key === 'R') {
            updateRotation((rotation + 45) % 360);  // Поворот на 10 градусов вправо
        }
    }

    useEffect(() => {
        handleResize();
        const canvas = canvasRef.current;
        window.addEventListener('resize', handleResize);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', clearPreview);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', clearPreview);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [elements, preview, rotation, hoveredComponentIndex,
        selectedComponentFromSidebar, selectedComponentIndex,
        isDragging, draggedElementIndex, dragOffset,
        isDrawingWire, currentWire
    ]);

    return <canvas ref={canvasRef} style={{width: '100%', height: '100%'}}></canvas>;
}

export default CircuitCanvas;