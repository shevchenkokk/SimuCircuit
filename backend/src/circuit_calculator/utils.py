import numpy as np

def LU_decomposition(matrix: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    n = len(matrix)
    L, U = np.zeros_like(matrix), np.zeros_like(matrix)
    for i in range(n):
        L[i][i] = 1
    for i in range(n):
        for j in range(n):
            if i > j:
                L[i][j] = 1 / U[j][j] * (matrix[i][j] - sum(L[i][k] * U[k][j] for k in range(j)))
            else:
                U[i][j] = matrix[i][j] - sum(L[i][k] * U[k][j] for k in range(i))
    return L, U

def solve_LU(matrix: np.ndarray, f: np.ndarray, L: np.ndarray, U: np.ndarray) -> np.ndarray:
    n = len(matrix)
    x, y = np.zeros(n), np.zeros(n)
    for i in range(n):
        y[i] = f[i] - sum(L[i][k] * y[k] for k in range(i))
    for i in range(n - 1, -1, -1):
        x[i] = 1 / U[i][i] * (y[i] - sum(U[i][k] * x[k] for k in range(i + 1, n)))
    return x