import heapq
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
        self.voltage_sum, self.resistance_sum, self.current_sum = self.calculate_element_contribution()

    # Проверка, является ли ветвь особой
    # Особая ветвь – ветвь с бесконечным сопротивлением
    def is_specific(self):
        is_specific = True
        for element in self.elements:
            if isinstance(element, Resistor):
                is_specific = False
        return is_specific
    
    def calculate_element_contribution(self):
        voltage_sum, resistance_sum, current_sum = 0, 0, 0
        for element in self.elements:
            if isinstance(element, Resistor):
                resistance_sum += element.resistance
            elif isinstance(element, VoltageSource):
                voltage_sum += element.voltage if element.direction.start_node == self.current_direction.start_node.label \
                    else -element.voltage
            elif isinstance(element, CurrentSource):
                current_sum += element.current if element.direction.start_node == self.current_direction.start_node.label \
                else -element.current
        self.weight = 1 / resistance_sum if resistance_sum != 0 else float('inf')
        return voltage_sum, resistance_sum, current_sum
    
    def form_phi_equation(self, n):
        phi, c = np.zeros(n), 0
        numerator, denominator = self.voltage_sum, self.resistance_sum
        start_node_index = self.current_direction.start_node.index
        end_node_index = self.current_direction.end_node.index
        denominator = 1 if denominator == 0 else denominator
        phi[start_node_index] += 1 / denominator
        phi[end_node_index] -= 1 / denominator
        c += numerator / denominator + self.current_sum
        return phi, c

    def calculate_current_strength(self):
        if self.current_strength is not None:
            return
        
        numerator = self.current_direction.start_node.potential - self.current_direction.end_node.potential
        denominator = 0
        numerator += self.voltage_sum
        denominator += self.resistance_sum

        if denominator != 0:
            current_strength = numerator / denominator + self.current_sum
        else:
            current_strength = 0 + self.current_sum
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
    
    def __lt__(self, other):
        return self.weight < other.weight

    
class CircuitGraph:
    def __init__(self, elements=None):
        self.nodes = {}
        if elements:
            self.elements = elements
        self.num_nodes = 0
        self.num_edges = 0

    def add_node(self, label):
        if label in self.nodes:
            raise Exception(f'node "{label}" is already in the circuit graph')
        node = Node(label)
        node.index = len(self.nodes)
        self.nodes[label] = node
        self.num_nodes += 1

    def add_edge(self, label, first_node, second_node, *elements):
        if first_node not in self.nodes:
            raise Exception(f'node "{first_node}" is not a node of the graph:')
        if second_node not in self.nodes:
            raise Exception(f'node "{first_node}" is not a node of the graph:')
        edge = Edge(label, Direction(self.nodes[first_node], self.nodes[second_node]), elements)
        self.nodes[first_node].add_edge(self.nodes[second_node], edge)
        self.nodes[second_node].add_edge(self.nodes[first_node], edge)
        self.num_edges += 1

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
                        A[node.index] += phi
                        b[node.index] -= c
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
                if edge.current_direction.start_node.label == little_edge.current_direction.start_node.label or \
                    edge.current_direction.end_node.label == little_edge.current_direction.end_node.label:
                    phis -= phi
                    cs -= c
                else:
                    phis += phi
                    cs += c
        return phis, cs
        
    # Метод контурных токов
    # Поиск максимального остовного дерева с использованием алгоритма Прима
    def find_maximum_spanning_tree(self):
        if not self.nodes:
            return []
        
        max_spanning_tree = []
        start_node = next(iter(self.nodes))
        used_nodes = set([start_node])
        edges_heap = []

        for _, edge in self.nodes[start_node].children:
            heapq.heappush(edges_heap, (-edge.weight, edge))

        while edges_heap:
            _, edge = heapq.heappop(edges_heap)
            to_node = edge.current_direction.end_node.label if edge.current_direction.start_node.label in used_nodes \
                else edge.current_direction.start_node.label

            if to_node not in used_nodes:
                used_nodes.add(to_node)
                max_spanning_tree.append(edge)

                for child, next_edge in self.nodes[to_node].children:
                    if child.label not in used_nodes:
                        heapq.heappush(edges_heap, (-next_edge.weight, next_edge))
        return max_spanning_tree
    
    def find_path_in_tree(self, start_node, end_node, tree_edges):
        # DFS для поиска пути в дереве
        def dfs(current_node, target_node, path):
            if current_node.label == target_node.label:
                return path
            
            for child, edge in current_node.children:
                if child not in visited and edge in tree_edges:
                    visited.add(child)
                    res = dfs(child, target_node, path + [(child, edge)])
                    if res is not None:
                        return res
                    
            return None
        
        visited = set([start_node])
        return dfs(start_node, end_node, [])

    def build_independent_loops(self):
        max_spanning_tree = self.find_maximum_spanning_tree()
        tree_edges = set(max_spanning_tree)
        visited_edges = set()

        independent_loops = []

        for node in self.nodes.values():
            for child, edge in node.children:
                if edge not in tree_edges and edge not in visited_edges:
                    path = self.find_path_in_tree(node, child, tree_edges)
                    if path is not None:
                        loop = path + [(node, edge)]
                        independent_loops.append(loop)
                    visited_edges.add(edge)
        return independent_loops
    
    def form_kirchhoff2_matrix(self, loops):
        num_loops = len(loops)
        A = np.zeros((num_loops, num_loops))
        b = np.zeros(num_loops)

        edges_to_direction_nodes_map = {i: dict((edge, node) for node, edge in loop) for i, loop in enumerate(loops)}
        for i, loop in enumerate(loops):
            for direction_node, edge in loop:

                A[i][i] += sum(element.resistance for element in edge.elements if isinstance(element, Resistor))

                for element in edge.elements:
                    if isinstance(element, VoltageSource):
                        if element.direction.end_node == direction_node.label:
                            b[i] += element.voltage
                        else:
                            b[i] -= element.voltage

            for j, other_loop in enumerate(loops):
                if i > j:
                    loop_edges = set(map(lambda x: x[1], loop))
                    other_loop_edges = set(map(lambda x: x[1], other_loop))
                    common_edges = loop_edges.intersection(other_loop_edges)
                    for edge in common_edges:
                        if (edges_to_direction_nodes_map[i][edge].label == edges_to_direction_nodes_map[j][edge].label):
                            is_loops_direction_common = 1
                        else:
                            is_loops_direction_common = -1
                        resistance_sum = sum(element.resistance for element in edge.elements if isinstance(element, Resistor))
                        A[i][j] += resistance_sum * is_loops_direction_common
                        A[j][i] += resistance_sum * is_loops_direction_common
        return A, b
    
    def calculate_edge_currents(self, loops, loop_currents):
        edge_currents = {edge.label: 0 for node in self.nodes.values() for _, edge in node.children}

        for i, loop in enumerate(loops):
            current = loop_currents[i]
            for direction_node, edge in loop:
                if direction_node.label == edge.current_direction.end_node.label:
                    edge_currents[edge.label] += current
                else:
                    edge_currents[edge.label] -= current

        visited = set()
        for node in self.nodes.values():
            for _, edge in node.children:
                if edge not in visited:
                    edge.current_direction = edge.current_direction if edge_currents[edge.label] > 0 \
                        else Direction(edge.current_direction.end_node, edge.current_direction.start_node)
                    edge.current_strength = abs(edge_currents[edge.label])
                    visited.add(edge)

        for edge in visited:
            print(str(edge))

    def solve_circuit_using_ohm_law(self):
        resistance_sum = sum(element.resistance for element in self.elements if isinstance(element, Resistor))
        voltage_sum = sum(element.voltage for element in self.elements if isinstance(element, VoltageSource))
        return voltage_sum / resistance_sum

    def solve_circuit_using_mna(self):
        A, b = self.form_phi_equations()
        print(f'A: {A}')
        print(f'b: {b}')
        L, U = LU_decomposition(A)
        node_potentials = solve_LU(A, b, L, U)
        print(f'potentials: {node_potentials}')

        for node in self.nodes.values():
            node.potential = node_potentials[node.index]

        visited = set()
        for node in self.nodes.values():
            for _, edge in node.children:
                if edge not in visited:
                    visited.add(edge)
                    edge.calculate_current_strength()

    def solve_circuit_using_mca(self):
        independent_loops = self.build_independent_loops()
        A, b = self.form_kirchhoff2_matrix(independent_loops)
        print(f'A: {A}')
        print(f'b: {b}')
        L, U = LU_decomposition(A)
        loop_currents = solve_LU(A, b, L, U)
        print(f'loop currents: {loop_currents}')
        self.calculate_edge_currents(independent_loops, loop_currents)

    def solve_circuit(self):
        # Если число узлов меньше числа независимых контуров
        # эффективнее использовать ММУП, иначе – МКТ
        # частный случай – один контур => закон Ома
        loop_count = self.num_edges - self.num_nodes + 1
        if loop_count == 1:
            current = self.solve_circuit_using_ohm_law()
            analyzing_method = "Ohm's law" 
        elif self.num_nodes < self.num_edges - self.num_nodes + 1:
            self.solve_circuit_using_mna()
            analyzing_method = 'modified nodal analysis'
        else:
            self.solve_circuit_using_mca()
            analyzing_method = 'mesh current analysis'

        # Подготовка данных к отправке клиенту
        if analyzing_method == "Ohm's law":
            result = {
                'method': "Ohm's law",
                'current': current
            }
            return result
        elif analyzing_method == 'modified nodal analysis':
            result = {
                'method': 'modified nodal analysis',
                'node_potentials': {},
                'branch_currents': []
            }
        elif analyzing_method == 'mesh current analysis':
            result = {
                'method': 'mesh current analysis',
                'branch_currents': []
            }

        visited = set()
        for node in self.nodes.values():
            if analyzing_method == 'mna':
                result['node_potentials'][int(node.label)] = node.potential
            for _, edge in node.children:
                if edge not in visited:
                    visited.add(edge)
                    print(str(edge))

                    branch_current = {
                        'id': int(edge.label),
                        'from': int(edge.current_direction.start_node.label),
                        'to': int(edge.current_direction.end_node.label),
                        'current': edge.current_strength
                    }
                    result['branch_currents'].append(branch_current)
        return result  