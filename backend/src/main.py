import uvicorn

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

import circuit_calculator

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Указываем разрешенный домен
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Получение данных от клиента
            data = await websocket.receive_json()
            # Парсинг графа электрической цепи
            circuit_graph = circuit_calculator.parse_circuit(data)
            # Расчёт токов в электрической цепи
            result = calculate_circuit(circuit_graph)
            # Отправка результатов клиенту
            await websocket.send_json(result)
    except Exception as e:
        print('Error: ', e)

def calculate_circuit(circuit_graph):
    result = circuit_graph.solve_circuit()
    return {"message": "circuit graph received", "calculation_result": result}

if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=4000, reload=True)