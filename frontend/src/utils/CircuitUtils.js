



export function formatCircuitGraphForServer(circuitGraph) {
    const nodeToIdMap = new Map();
    let nodeId = 1;
    let edgeId = 1;

    // Присваиваем каждому узлу уникальный ID на основе его строки координат
    circuitGraph.nodes.forEach(node => {
        if (!nodeToIdMap.has(node)) {
            nodeToIdMap.set(node, nodeId++);
        }
    })

    // Форматируем узлы, заменяя координаты на ID
    const formattedNodes = Array.from(nodeToIdMap.values());

    // Форматируем рёбра
    const formattedEdges = circuitGraph.edges.map(edge => {
        return {
            id: edgeId++,
            from: nodeToIdMap.get(edge.from),
            to: nodeToIdMap.get(edge.to),
            elements: edge.elements.map(element => {
                if (element.type === 'wire') {
                    return {
                        id: element.id,
                        type: element.type,
                    };
                } else {
                    const value = element.type === 'resistor' ? element.resistance
                        : element.type === 'voltageSource' ? element.voltage
                        : element.current;
                    if (element.type === 'voltageSource' || element.type === 'currentSource') {
                        return {
                            id: element.id,
                            type: element.type,
                            value: value,
                            direction: { 
                                from: nodeToIdMap.get(element.direction.from),
                                to: nodeToIdMap.get(element.direction.to)
                            }
                        };
                    } else {
                        return {
                            id: element.id,
                            type: element.type,
                            value: value
                        };
                    }
                }
            })
        };
    });

    return {
        nodes: formattedNodes,
        edges: formattedEdges
    }
}