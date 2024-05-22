import React, { useRef, useEffect, useState } from 'react';
import { componentsList } from '../components';

function CircuitCanvas({ selectedComponent }) {
    const canvasRef = useRef(null);
    // Состояние для хранения текущих координат курсора
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    // Состояние для хранения информации о текущих элементах и выбранном элементе
    const [elements, setElements] = useState([]);
    // Состояние для хранения информации о текущем положении курсора и выбранном элементе для предпросмотра.
    const [preview, setPreview] = useState(null);
    // Состояние для хранения информации о текущем угле поворота выбранного элемента
    const [rotation, setRotation] = useState(0);

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

    function drawComponent(context, component, x, y, opacity=1, rotation=0) {
        const img = new Image();
        img.src = component.image;
        img.onload = () => {
            context.save();
            context.globalAlpha = opacity;
            context.translate(x, y);  // Перемещаем контекст в центр элемента
            context.rotate((rotation * Math.PI) / 180); // Вращаем контекст на угол в радианах
            context.drawImage(img, - component.width / 2, - component.height / 2, component.width, component.height);
            context.globalAlpha = 1;
            context.restore();
        };
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
        drawGrid(context, 'rgba(128, 128, 128, 0.5)', 25, 25);
        elements.forEach(element => {
            const component = componentsList[element.type];
            drawComponent(context, component, element.x, element.y, 1, element.rotation);
        });
        if (preview) {
            const component = componentsList[preview.type];
            drawComponent(context, component, preview.x, preview.y, 0.5, preview.rotation);
        }
    }

    function handleClick(e) {
        // Если компонент не выбран, ничего не делаем
        if (!selectedComponent) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const newElement = { type: selectedComponent, x: x, y: y, rotation: rotation }; // По умолчанию добавляем резистор
        setElements(prevElements => [...prevElements, newElement]);
        setPreview(null);
        setRotation(0);
    }

    function handleMouseMove(e) {
        if (!selectedComponent) return;  // Активируем предпросмотр только если выбран компонент
    
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCursorPosition({ x, y });

        setPreview({
            type: selectedComponent,
            x: x,
            y: y,
            rotation: rotation
        });
    }

    function clearPreview() {
        setPreview(null);  // Очищаем предпросмотр, когда мышь уходит с канваса
    }

    function handleKeyDown(e) {
        // Если компонент не выбран, ничего не делаем
        if (!selectedComponent || !cursorPosition) return;

        const updateRotation = (newRotation) => {
            setRotation(newRotation);
    
            setPreview({
                type: selectedComponent,
                x: cursorPosition.x,
                y: cursorPosition.y,
                rotation: newRotation
            });
        };

        // Управление углом поворота с клавиатуры
        if (e.key === 'r' || e.key == 'R') {
            updateRotation((rotation + 45) % 360);  // Поворот на 10 градусов вправо
        }
    }

    useEffect(() => {
        handleResize();
        const canvas = canvasRef.current;
        window.addEventListener('resize', handleResize);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', clearPreview);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', clearPreview);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [elements, preview, rotation, selectedComponent]);

    return <canvas ref={canvasRef} style={{width: '100%', height: '100%' }}></canvas>;
}

export default CircuitCanvas;