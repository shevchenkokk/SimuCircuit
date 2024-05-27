import numpy as np
from .components import (
    Resistor,
    VoltageSource,
    CurrentSource,
    Direction
)
from .utils import LU_decomposition, solve_LU

class Node:
    def __init__(self, label):
        self.label = label
        self.children = []
        self.potential = None

    def add_edge(self, child, edge):
        self.children.append([child, edge])

    def __str__(self):
        return self.label
    
    
class Edge:
    def __init__(self, label, current_direction, elements):
        self.label = label
        self.current_direction = current_direction
        self.elements = elements
        self.current_strength = None
        self.voltage_sum, self.resistance_sum = self.calculate_element_contribution()

    # Проверка, является ли ветвь особой
    # Особая ветвь – ветвь с бесконечным сопротивлением
    def is_specific(self):
        is_specific = True
        for element in self.elements:
            if isinstance(element, Resistor):
                is_specific = False
        return is_specific
    
    def calculate_element_contribution(self):
        voltage_sum, resistance_sum = 0, 0
        for element in self.elements:
            if isinstance(element, Resistor):
                resistance_sum += element.resistance
            elif isinstance(element, VoltageSource):
                voltage_sum += element.voltage if element.direction.start_node == self.current_direction.start_node.label \
                    else -element.voltage
        return voltage_sum, resistance_sum
    
    def form_phi_equation(self, n):
        phi, c = np.zeros(n), 0
        numerator, denominator = self.voltage_sum, self.resistance_sum
        start_node_index = self.current_direction.start_node.index
        end_node_index = self.current_direction.end_node.index
        denominator = 1 if denominator == 0 else denominator
        phi[start_node_index] += 1 / denominator
        phi[end_node_index] -= 1 / denominator
        c += numerator / denominator
        return phi, c

    def calculate_current_strength(self):
        numerator = self.current_direction.start_node.potential - self.current_direction.end_node.potential
        denominator = 0
        numerator += self.voltage_sum
        denominator += self.resistance_sum
        if denominator != 0:
            current_strength = numerator / denominator
        else:
            current_strength = 0
            for _, edge in self.current_direction.end_node.children:
                if edge is not self:
                    if edge.current_strength is None:
                        edge.calculate_current_strength()
                    if self.current_direction.end_node.label == edge.current_direction.end_node.label:
                        current_strength -= edge.current_strength
                    else:
                        current_strength += edge.current_strength
        self.current_direction = self.current_direction if current_strength > 0 \
            else Direction(self.current_direction.end_node, self.current_direction.start_node)
        self.current_strength = abs(current_strength)

    def __str__(self):
        res = 'id: ' + self.label + ' ' + str(self.current_direction.start_node.label) + '-' + \
            str(self.current_direction.end_node.label)
        if self.current_strength is not None:
            res += '  I = ' + str(round(self.current_strength, 3))
        return res
    
class CircuitGraph:
    def __init__(self):
        self.nodes = {}

    def add_node(self, label):
        if label in self.nodes:
            raise Exception(f'node "{label}" is already in the circuit graph')
        node = Node(label)
        node.index = len(self.nodes)
        self.nodes[label] = node

    def add_edge(self, label, first_node, second_node, *elements):
        if first_node not in self.nodes:
            raise Exception(f'node "{first_node}" is not a node of the graph:')
        if second_node not in self.nodes:
            raise Exception(f'node "{first_node}" is not a node of the graph:')
        edge = Edge(label, Direction(self.nodes[first_node], self.nodes[second_node]), elements)
        self.nodes[first_node].add_edge(self.nodes[second_node], edge)
        self.nodes[second_node].add_edge(self.nodes[first_node], edge)

    def dfs(self, start_node, visited=None):
        if visited is None:
            visited = set()
        visited.add(start_node)
        for child_label in self.nodes[start_node].children:
            if child_label not in visited:
                self.dfs(child_label, visited)
        return visited
    
    def find_specific_edges(self):
        specific_edges = []
        visited = set()
        for node in self.nodes.values():
            for _, edge in node.children:
                if edge not in visited:
                    is_edge_specific = edge.is_specific()
                    if is_edge_specific:
                        specific_edges.append(edge)
                    visited.add(edge)
        return specific_edges
    
    def form_phi_equations(self):
        # число уравнений в СЛАУ
        n = len(self.nodes)
        A = np.zeros((n, n))
        b = np.zeros(n)
        specific_edges = self.find_specific_edges()
        # число узлов, для которых нужно применять правило Кирхгофа для составления уравнения
        # вычитаем из общего числа узлов базовый узел и число особых ветвей
        # для особых ветвей достаточно вычислить потенциал одного из узлов
        k = len(self.nodes) - 1 - len(specific_edges)
        visited_edges = set()
        if not len(specific_edges):
            # выбираем случайный узел и делаем его базовым
            basis_node_index = np.random.randint(0, len(self.nodes))
        else:
            # выбираем случайную особую ветвь и делаем первый узел базовым
            specific_edge_index = np.random.randint(0, len(specific_edges))
            basis_node_index = specific_edges[specific_edge_index].current_direction.start_node.index
            visited_edges.add(specific_edges[specific_edge_index])
        list(self.nodes.values())[basis_node_index].potential = 0
        A[basis_node_index][basis_node_index] = 1
        specific_nodes = {}
        for edge in specific_edges:
            if edge.current_direction.start_node.label not in specific_nodes:
                specific_nodes[edge.current_direction.start_node.label] = [edge]
            else:
                specific_nodes[edge.current_direction.start_node.label].append(edge)
            if edge.current_direction.end_node.label not in specific_nodes:
                specific_nodes[edge.current_direction.end_node.label] = [edge]
            else:
                specific_nodes[edge.current_direction.end_node.label].append(edge)
        for node in self.nodes.values():
            if node.index == basis_node_index:
                continue
            is_calc_second_potential_found = False
            if node.label in specific_nodes:
                for edge in specific_nodes[node.label]:
                    if edge in visited_edges:
                        is_calc_second_potential_found = True
                        phi, c = edge.form_phi_equation(n)
                        if edge.current_direction.end_node.label == node.label:
                            A[node.index] += phi
                            b[node.index] -= c
                        else:
                            A[node.index] -= phi
                            b[node.index] += c
                        break
            if not is_calc_second_potential_found:
                for _, edge in node.children:
                    if edge not in specific_edges:
                        phi, c = edge.form_phi_equation(n)
                    else:
                        other_node = edge.current_direction.end_node if edge.current_direction.start_node is node \
                            else edge.current_direction.start_node
                        phi, c = self.find_current_in_specific(other_node, specific_edges, edge)
                        visited_edges.add(edge)
                    if edge.current_direction.end_node.label == node.label:
                        A[node.index] += phi
                        b[node.index] -= c
                    else:
                        A[node.index] -= phi
                        b[node.index] += c
        return A, b
    
    def find_current_in_specific(self, node, specific_edges, little_edge=None):
        phis, cs = np.zeros(len(self.nodes)), 0
        for _, edge in node.children:
            if edge not in specific_edges:
                phi, c = edge.form_phi_equation(len(self.nodes))
            elif edge is not little_edge:
                other_node = edge.current_direction.end_node if edge.current_direction.start_node is node \
                    else edge.current_direction.start_node
                phi, c = self.find_current_in_specific(other_node, specific_edges, edge)
            if edge is not little_edge:
                if edge.current_direction.start_node.label == little_edge.current_direction.start_node.label:
                    phis -= phi
                    cs -= c
                else:
                    phis += phi
                    cs += c
        return phis, cs

    def solve_circuit(self):
        A, b = self.form_phi_equations()
        print(f'A: {A}')
        print(f'b: {b}')
        L, U = LU_decomposition(A)
        node_potentials = solve_LU(A, b, L, U)
        print(f'potentials: {node_potentials}')

        for node in self.nodes.values():
            node.potential = node_potentials[node.index]

        result = {
            'node_potentials': {},
            'branch_currents': []
        }
        visited = set()
        for node in self.nodes.values():
            result['node_potentials'][int(node.label)] = node.potential
            for _, edge in node.children:
                if edge not in visited:
                    visited.add(edge)
                    edge.calculate_current_strength()

                    print(str(edge))

                    branch_current = {
                        'id': int(edge.label),
                        'from': edge.current_direction.start_node.label,
                        'to': edge.current_direction.end_node.label,
                        'current': edge.current_strength
                    }
                    result['branch_currents'].append(branch_current)

        return result
        