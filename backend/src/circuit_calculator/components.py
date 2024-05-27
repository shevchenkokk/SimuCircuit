class Resistor:
    def __init__(self, resistance):
        self.resistance = resistance


class VoltageSource:
    def __init__(self, voltage, direction):
        self.voltage = voltage
        self.direction = direction


class CurrentSource:
    def __init__(self, current, direction):
        self.current = current
        self.direction = direction


class Direction:
    def __init__(self, start_node, end_node):
        self.start_node = start_node
        self.end_node = end_node