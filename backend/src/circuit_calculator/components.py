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