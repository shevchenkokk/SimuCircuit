from .circuit_graph import (
    Direction,
    CircuitGraph
)

from .components import (
    Resistor,
    VoltageSource,
    CurrentSource,
)

def add_elements(graph_elements):
    elements = []
    for element in graph_elements:
        if element['type'] == 'resistor':
            elements.append(Resistor(resistance=element['value']))
        elif element['type'] == 'voltageSource':
            direction = None
            if 'direction' in element:
                direction = Direction(str(element['direction']['from']), str(element['direction']['to']))
            elements.append(VoltageSource(voltage=element['value'], direction=direction))
        elif element['type'] == 'currentSource':
            direction = Direction(str(element['direction']['from']), str(element['direction']['to']))
            elements.append(CurrentSource(current=element['value'], direction=direction))
    return elements

def parse_circuit(data):
    if 'nodes' not in data and 'elements' in data:
        elements = add_elements(data['elements'])
        circuit = CircuitGraph(elements=elements)
        return circuit

    circuit = CircuitGraph()

    # Создание узлов
    for node_id in data['nodes']:
        node_label = str(node_id)
        circuit.add_node(node_label)

    # Создание рёбер
    for edge in data['edges']:
        edge_label = str(edge['id'])
        from_node_label = str(edge['from'])
        to_node_label = str(edge['to'])
        elements = add_elements(edge['elements'])

        circuit.add_edge(edge_label, from_node_label, to_node_label, *elements)

    return circuit