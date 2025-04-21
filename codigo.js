document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let processes = [];
    let simulationResults = null;
    
    // Elementos del DOM
    const manualInputSection = document.getElementById('manual-input');
    const manualBtn = document.getElementById('manual-btn');
    const fileBtn = document.getElementById('file-btn');
    const fileInput = document.getElementById('file-input');
    const processTable = document.getElementById('process-table');
    const processList = document.getElementById('process-list');
    const clearAllBtn = document.getElementById('clear-all');
    const addProcessBtn = document.getElementById('add-process');
    const algorithmSelect = document.getElementById('algorithm');
    const quantumContainer = document.getElementById('quantum-container');
    const quantumInput = document.getElementById('quantum');
    const simulateBtn = document.getElementById('simulate-btn');
    const resultsSection = document.getElementById('results');
    const ganttChart = document.getElementById('gantt-chart');
    const metricsList = document.getElementById('metrics-list');
    const cpuUsage = document.getElementById('cpu-usage');
    
    // Event Listeners
    manualBtn.addEventListener('click', () => {
        manualInputSection.classList.remove('hidden');
    });
    
    fileBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileUpload);
    
    addProcessBtn.addEventListener('click', addProcessFromForm);
    
    clearAllBtn.addEventListener('click', clearAllProcesses);
    
    algorithmSelect.addEventListener('change', () => {
        if (algorithmSelect.value === 'rr') {
            quantumContainer.classList.remove('hidden');
        } else {
            quantumContainer.classList.add('hidden');
        }
    });
    
    simulateBtn.addEventListener('click', runSimulation);
    
    // Funciones
    
    function addProcessFromForm() {
        const pid = document.getElementById('pid').value;
        const arrival = parseInt(document.getElementById('arrival').value);
        const burst = parseInt(document.getElementById('burst').value);
        const priority = document.getElementById('priority').value ? parseInt(document.getElementById('priority').value) : 0;
        
        if (!pid || isNaN(arrival) || isNaN(burst)) {
            alert('Por favor complete los campos requeridos (ID, Llegada, Ráfaga)');
            return;
        }
        
        addProcess(pid, arrival, burst, priority);
        
        // Limpiar el formulario
        document.getElementById('pid').value = '';
        document.getElementById('arrival').value = '';
        document.getElementById('burst').value = '';
        document.getElementById('priority').value = '';
    }
    
    function addProcess(pid, arrival, burst, priority = 0) {
        const process = {
            id: pid,
            arrivalTime: arrival,
            burstTime: burst,
            priority: priority,
            remainingTime: burst
        };
        
        processes.push(process);
        updateProcessTable();
    }
    
    function updateProcessTable() {
        processList.innerHTML = '';
        
        processes.forEach((process, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${process.id}</td>
                <td>${process.arrivalTime}</td>
                <td>${process.burstTime}</td>
                <td>${process.priority}</td>
                <td><button class="danger" data-index="${index}">Eliminar</button></td>
            `;
            
            processList.appendChild(row);
        });
        
        // Agregar event listeners a los botones de eliminar
        document.querySelectorAll('#process-list button').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                processes.splice(index, 1);
                updateProcessTable();
            });
        });
    }
    
    function clearAllProcesses() {
        processes = [];
        updateProcessTable();
    }
    
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                let fileProcesses = [];
                
                // Intentar parsear como JSON
                try {
                    fileProcesses = JSON.parse(content);
                } catch (e) {
                    // Si no es JSON, intentar parsear como texto plano
                    const lines = content.split('\n');
                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        
                        const parts = line.split(/\s+/);
                        if (parts.length >= 3) {
                            fileProcesses.push({
                                id: parts[0],
                                arrivalTime: parseInt(parts[1]),
                                burstTime: parseInt(parts[2]),
                                priority: parts.length > 3 ? parseInt(parts[3]) : 0
                            });
                        }
                    }
                }
                
                // Validar los procesos
                if (!Array.isArray(fileProcesses)) {
                    throw new Error('El archivo debe contener un array de procesos');
                }
                
                fileProcesses.forEach(proc => {
                    if (!proc.id || isNaN(proc.arrivalTime) || isNaN(proc.burstTime)) {
                        throw new Error('Cada proceso debe tener id, arrivalTime y burstTime válidos');
                    }
                });
                
                // Agregar los procesos
                processes = fileProcesses.map(proc => ({
                    ...proc,
                    remainingTime: proc.burstTime,
                    priority: proc.priority || 0
                }));
                
                updateProcessTable();
            } catch (error) {
                alert(`Error al procesar el archivo: ${error.message}`);
            }
        };
        
        reader.readAsText(file);
    }
    
    function runSimulation() {
        if (processes.length === 0) {
            alert('Por favor agregue al menos un proceso');
            return;
        }
        
        const algorithm = algorithmSelect.value;
        const quantum = algorithm === 'rr' ? parseInt(quantumInput.value) : null;
        
        if (algorithm === 'rr' && (isNaN(quantum) || quantum <= 0)) {
            alert('Por favor ingrese un quantum válido para Round Robin');
            return;
        }
        
        // Ejecutar el algoritmo seleccionado
        switch (algorithm) {
            case 'fcfs':
                simulationResults = fcfsAlgorithm([...processes]);
                break;
            case 'sjf':
                simulationResults = sjfAlgorithm([...processes]);
                break;
            case 'rr':
                simulationResults = roundRobinAlgorithm([...processes], quantum);
                break;
            default:
                alert('Algoritmo no implementado');
                return;
        }
        
        // Mostrar resultados
        showResults();
        resultsSection.classList.remove('hidden');
    }
    
    // Algoritmo FCFS (First Come First Served)
    function fcfsAlgorithm(processes) {
        // Ordenar procesos por tiempo de llegada
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        let currentTime = 0;
        const gantt = [];
        const metrics = {};
        
        processes.forEach(process => {
            // Calcular tiempo de espera
            const waitTime = Math.max(0, currentTime - process.arrivalTime);
            
            // Actualizar métricas
            metrics[process.id] = {
                waitTime: waitTime,
                turnaroundTime: waitTime + process.burstTime,
                responseTime: waitTime
            };
            
            // Agregar al diagrama de Gantt
            gantt.push({
                process: process.id,
                start: currentTime,
                end: currentTime + process.burstTime
            });
            
            currentTime += process.burstTime;
        });
        
        return { gantt, metrics };
    }
    
    // Algoritmo SJF (Shortest Job First)
    function sjfAlgorithm(processes) {
        let currentTime = 0;
        const gantt = [];
        const metrics = {};
        const readyQueue = [];
        
        // Función para agregar procesos que han llegado a la cola de listos
        function updateReadyQueue(time) {
            processes.forEach(process => {
                if (process.arrivalTime <= time && !readyQueue.includes(process)) {
                    readyQueue.push(process);
                }
            });
            
            // Ordenar por tiempo de ráfaga (SJF)
            readyQueue.sort((a, b) => a.burstTime - b.burstTime);
        }
        
        while (processes.length > 0) {
            updateReadyQueue(currentTime);
            
            if (readyQueue.length === 0) {
                currentTime++;
                continue;
            }
            
            const process = readyQueue.shift();
            const index = processes.findIndex(p => p.id === process.id);
            
            // Calcular tiempo de espera
            const waitTime = currentTime - process.arrivalTime;
            
            // Actualizar métricas
            metrics[process.id] = {
                waitTime: waitTime,
                turnaroundTime: waitTime + process.burstTime,
                responseTime: waitTime
            };
            
            // Agregar al diagrama de Gantt
            gantt.push({
                process: process.id,
                start: currentTime,
                end: currentTime + process.burstTime
            });
            
            currentTime += process.burstTime;
            processes.splice(index, 1);
        }
        
        return { gantt, metrics };
    }
    
    // Algoritmo Round Robin
    function roundRobinAlgorithm(processes, quantum) {
        let currentTime = 0;
        const gantt = [];
        const metrics = {};
        const readyQueue = [];
        const remainingTimes = {};
        
        // Inicializar tiempos restantes
        processes.forEach(process => {
            remainingTimes[process.id] = process.burstTime;
        });
        
        // Función para agregar procesos que han llegado a la cola de listos
        function updateReadyQueue(time) {
            processes.forEach(process => {
                if (process.arrivalTime <= time && !readyQueue.includes(process) && remainingTimes[process.id] > 0) {
                    readyQueue.push(process);
                }
            });
        }
        
        while (true) {
            updateReadyQueue(currentTime);
            
            if (readyQueue.length === 0) {
                if (Object.values(remainingTimes).every(rt => rt === 0)) {
                    break;
                }
                currentTime++;
                continue;
            }
            
            const process = readyQueue.shift();
            
            // Tiempo de ejecución (mínimo entre quantum y tiempo restante)
            const execTime = Math.min(quantum, remainingTimes[process.id]);
            
            // Si es la primera vez que se ejecuta, calcular tiempo de respuesta
            if (!metrics[process.id]) {
                metrics[process.id] = {
                    responseTime: currentTime - process.arrivalTime,
                    waitTime: 0,
                    turnaroundTime: 0
                };
            } else {
                // Sumar tiempo de espera desde la última ejecución
                metrics[process.id].waitTime += currentTime - (metrics[process.id].lastEndTime || process.arrivalTime);
            }
            
            // Agregar al diagrama de Gantt
            gantt.push({
                process: process.id,
                start: currentTime,
                end: currentTime + execTime
            });
            
            // Actualizar tiempo restante
            remainingTimes[process.id] -= execTime;
            
            // Guardar tiempo de finalización para cálculo de espera en la próxima ejecución
            metrics[process.id].lastEndTime = currentTime + execTime;
            
            currentTime += execTime;
            
            // Si aún le queda tiempo, volver a agregar a la cola
            if (remainingTimes[process.id] > 0) {
                readyQueue.push(process);
            } else {
                // Calcular tiempo de retorno
                metrics[process.id].turnaroundTime = currentTime - process.arrivalTime;
            }
        }
        
        return { gantt, metrics };
    }
    
    function showResults() {
        // Mostrar diagrama de Gantt
        ganttChart.innerHTML = '';
        const totalTime = simulationResults.gantt[simulationResults.gantt.length - 1].end;
        
        simulationResults.gantt.forEach(block => {
            const duration = block.end - block.start;
            const width = (duration / totalTime) * 100;
            
            const blockElement = document.createElement('div');
            blockElement.className = 'gantt-block';
            blockElement.style.width = `${width}%`;
            blockElement.style.backgroundColor = getRandomColor(block.process);
            blockElement.textContent = `${block.process} (${block.start}-${block.end})`;
            blockElement.title = `Proceso ${block.process} ejecutándose de ${block.start} a ${block.end}`;
            
            ganttChart.appendChild(blockElement);
        });
        
        // Mostrar métricas
        metricsList.innerHTML = '';
        
        let totalWaitTime = 0;
        let totalResponseTime = 0;
        let totalTurnaroundTime = 0;
        let processCount = 0;
        
        for (const [pid, metric] of Object.entries(simulationResults.metrics)) {
            totalWaitTime += metric.waitTime;
            totalResponseTime += metric.responseTime;
            totalTurnaroundTime += metric.turnaroundTime;
            processCount++;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${pid}</td>
                <td>${metric.waitTime}</td>
                <td>${metric.responseTime}</td>
                <td>${metric.turnaroundTime}</td>
            `;
            metricsList.appendChild(row);
        }
        
        // Calcular promedios
        const avgWaitTime = totalWaitTime / processCount;
        const avgResponseTime = totalResponseTime / processCount;
        const avgTurnaroundTime = totalTurnaroundTime / processCount;
        
        // Mostrar uso de CPU
        const cpuUsageValue = (totalTime / (totalTime + (totalTurnaroundTime - totalTime))) * 100;
        
        cpuUsage.innerHTML = `
            <h4>Métricas Promedio</h4>
            <p>Tiempo de espera promedio: ${avgWaitTime.toFixed(2)}</p>
            <p>Tiempo de respuesta promedio: ${avgResponseTime.toFixed(2)}</p>
            <p>Tiempo de retorno promedio: ${avgTurnaroundTime.toFixed(2)}</p>
            <p>Uso de CPU: ${cpuUsageValue.toFixed(2)}%</p>
        `;
    }
    
    // Función auxiliar para generar colores aleatorios
    function getRandomColor(seed) {
        const colors = [
            '#FF5252', '#FF4081', '#E040FB', '#7C4DFF', '#536DFE', 
            '#448AFF', '#40C4FF', '#18FFFF', '#64FFDA', '#69F0AE', 
            '#B2FF59', '#EEFF41', '#FFFF00', '#FFD740', '#FFAB40'
        ];
        
        // Usar el ID del proceso para seleccionar un color consistente
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }
});