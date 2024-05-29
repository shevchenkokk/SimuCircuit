from .circuit_graph import CircuitGraph
from .components import (
    Resistor,
    VoltageSource,
    CurrentSource,
    Direction
)

def parse_circuit(data):
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
        elements = []

        for element in edge['elements']:
            if element['type'] == 'resistor':
                elements.append(Resistor(resistance=element['value']))
            elif element['type'] == 'voltageSource':
                direction = Direction(str(element['direction']['from']), str(element['direction']['to']))
                elements.append(VoltageSource(voltage=element['value'], direction=direction))
            elif element['type'] == 'currentSource':
                direction = Direction(str(element['direction']['from']), str(element['direction']['to']))
                elements.append(CurrentSource(current=element['value'], direction=direction))

        circuit.add_edge(edge_label, from_node_label, to_node_label, *elements)

    return circuit