// CONFIGURAÇÕES DE TEMPO
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // NOVO: Prazo do histórico
const HISTORY_KEY = 'todoHistory';

let currentFilter = 'all'; 

// =======================================================
// === POMODORO TIMER ===
// =======================================================
let timerInterval, timeRemaining, isPaused = true, currentPhase = 'pomodoro', pomodoroCycles = 0;
const POMODORO_TIME = 25 * 60, SHORT_BREAK_TIME = 5 * 60, LONG_BREAK_TIME = 15 * 60;

function resetTimerVariables() {
    if (pomodoroCycles >= 4) pomodoroCycles = 0;
    currentPhase = 'pomodoro';
    timeRemaining = POMODORO_TIME;
    isPaused = true;
}

function updateDisplay() {
    const minutes = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
    const seconds = String(timeRemaining % 60).padStart(2, '0');
    document.getElementById('timer-display').textContent = `${minutes}:${seconds}`;
    document.getElementById('cycle-count').textContent = pomodoroCycles;
    
    const statusEl = document.getElementById('current-phase');
    document.body.classList.remove('focus-mode', 'break-mode');
    
    if (currentPhase === 'pomodoro') {
        statusEl.textContent = 'Foco (25 min)';
        document.body.classList.add('focus-mode');
    } else {
        statusEl.textContent = currentPhase === 'short-break' ? 'Descanso Curto' : 'Descanso Longo';
        document.body.classList.add('break-mode');
    }
}

function startTimer() {
    if (!isPaused) return;
    isPaused = false;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('pause-btn').disabled = false;
    timerInterval = setInterval(() => {
        if (timeRemaining > 0) { timeRemaining--; updateDisplay(); }
        else { clearInterval(timerInterval); handlePhaseEnd(); }
    }, 1000);
}

function pauseTimer() {
    isPaused = true;
    clearInterval(timerInterval);
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
}

function resetTimer() {
    pauseTimer();
    pomodoroCycles = 0;
    resetTimerVariables();
    updateDisplay();
}

function handlePhaseEnd() {
    alert("Fim do ciclo!");
    if (currentPhase === 'pomodoro') {
        pomodoroCycles++;
        currentPhase = (pomodoroCycles % 4 === 0) ? 'long-break' : 'short-break';
        timeRemaining = (currentPhase === 'long-break') ? LONG_BREAK_TIME : SHORT_BREAK_TIME;
    } else {
        currentPhase = 'pomodoro';
        timeRemaining = POMODORO_TIME;
    }
    updateDisplay();
    startTimer();
}

// =======================================================
// === STORAGE & CORE ===
// =======================================================

function getTasksFromStorage() {
    const tasks = JSON.parse(localStorage.getItem('todoTasks') || '[]');
    return tasks.map(t => ({
        ...t,
        subtasks: t.subtasks || [],
        subtaskExpanded: !!t.subtaskExpanded,
        dueDate: t.dueDate || ''
    }));
}

function saveTasksToStorage(tasks) { localStorage.setItem('todoTasks', JSON.stringify(tasks)); }
function getHistoryFromStorage() { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'); }
function saveHistoryToStorage(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }

// LIMPEZA AUTOMÁTICA (7 DIAS)
function cleanupOldHistory() {
    const history = getHistoryFromStorage();
    const now = new Date();
    let changed = false;

    Object.keys(history).forEach(dateKey => {
        const historyDate = new Date(dateKey + 'T00:00:00');
        if (now - historyDate > SEVEN_DAYS_MS) {
            delete history[dateKey];
            changed = true;
        }
    });

    if (changed) saveHistoryToStorage(history);
}

// =======================================================
// === TAREFAS & SUBTAREFAS ===
// =======================================================

function addTask() {
    const input = document.getElementById('task-input');
    if (!input.value.trim()) return;
    
    const tasks = getTasksFromStorage();
    tasks.push({
        id: Date.now(),
        text: input.value.trim(),
        priority: document.getElementById('priority-select').value,
        dueDate: document.getElementById('due-date-input').value,
        dateAdded: new Date().toISOString(),
        dateDisplay: new Date().toLocaleDateString('pt-BR'),
        completed: false,
        subtasks: []
    });
    
    saveTasksToStorage(tasks);
    input.value = '';
    renderTasks();
}

function toggleComplete(id) {
    const tasks = getTasksFromStorage();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) addToHistory(task);
    }
    saveTasksToStorage(tasks);
    renderTasks();
    displayHistory();
}

function deleteTask(id) {
    if (!confirm("Excluir tarefa?")) return;
    const tasks = getTasksFromStorage().filter(t => t.id !== id);
    saveTasksToStorage(tasks);
    renderTasks();
}

function addSubtask(taskId) {
    const input = document.getElementById(`sub-in-${taskId}`);
    if (!input.value.trim()) return;
    const tasks = getTasksFromStorage();
    const task = tasks.find(t => t.id === taskId);
    task.subtasks.push({ id: Date.now(), text: input.value.trim(), completed: false });
    saveTasksToStorage(tasks);
    renderTasks();
}

function toggleSub(taskId, subId) {
    const tasks = getTasksFromStorage();
    const sub = tasks.find(t => t.id === taskId).subtasks.find(s => s.id === subId);
    sub.completed = !sub.completed;
    saveTasksToStorage(tasks);
    renderTasks();
}

function toggleExpand(id) {
    const tasks = getTasksFromStorage();
    const task = tasks.find(t => t.id === id);
    task.subtaskExpanded = !task.subtaskExpanded;
    saveTasksToStorage(tasks);
    renderTasks();
}

// =======================================================
// === RENDERIZAÇÃO ===
// =======================================================

function renderTasks() {
    const list = document.getElementById('task-list');
    const tasks = getTasksFromStorage();
    const today = new Date().setHours(0,0,0,0);

    // Filtro e Ordenação
    let filtered = tasks.filter(t => currentFilter === 'all' || t.completed || t.priority === currentFilter);
    const pOrder = { alta: 3, media: 2, baixa: 1 };
    filtered.sort((a,b) => a.completed - b.completed || pOrder[b.priority] - pOrder[a.priority]);

    list.innerHTML = '';
    filtered.forEach(t => {
        const isOld = !t.completed && (new Date() - new Date(t.dateAdded) > FIFTEEN_DAYS_MS);
        const dueStatus = t.dueDate ? (new Date(t.dueDate + 'T00:00:00').setHours(0,0,0,0) < today ? 'due-expired' : (new Date(t.dueDate + 'T00:00:00').setHours(0,0,0,0) === today ? 'due-near' : '')) : '';

        const li = document.createElement('li');
        li.className = `task-item task-${t.priority} ${t.completed ? 'task-completed' : ''} ${dueStatus}`;
        
        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onclick="toggleComplete(${t.id})">
                <span class="task-text">${t.text} ${isOld ? '⚠️' : ''} 
                    ${t.dueDate ? `<span class="due-date ${dueStatus}">Prazo: ${new Date(t.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>` : ''}
                </span>
                <button class="subtask-expander ${t.subtaskExpanded ? 'expanded' : ''}" onclick="toggleExpand(${t.id})">►</button>
            </div>
            <button class="delete-btn" onclick="deleteTask(${t.id})">X</button>
            <div class="subtask-area" style="display: ${t.subtaskExpanded ? 'block' : 'none'}">
                <ul style="list-style:none; padding:0">
                    ${t.subtasks.map(s => `
                        <li class="subtask-item ${s.completed ? 'subtask-completed' : ''}">
                            <input type="checkbox" ${s.completed ? 'checked' : ''} onclick="toggleSub(${t.id}, ${s.id})">
                            <span class="subtask-text">${s.text}</span>
                        </li>
                    `).join('')}
                </ul>
                ${!t.completed ? `
                    <input type="text" id="sub-in-${t.id}" class="new-subtask-input" placeholder="Passo...">
                    <button onclick="addSubtask(${t.id})" style="color:#61dafb; background:none; border:none; cursor:pointer">+</button>
                ` : ''}
            </div>
        `;
        list.appendChild(li);
    });

    // Atualiza contadores
    document.getElementById('count-alta').textContent = `Alta: ${tasks.filter(t => !t.completed && t.priority === 'alta').length}`;
    document.getElementById('count-media').textContent = `Média: ${tasks.filter(t => !t.completed && t.priority === 'media').length}`;
    document.getElementById('count-baixa').textContent = `Baixa: ${tasks.filter(t => !t.completed && t.priority === 'baixa').length}`;
    const compCount = tasks.filter(t => t.completed).length;
    document.getElementById('clear-completed-btn').disabled = compCount === 0;
    document.getElementById('clear-completed-btn').textContent = `Limpar Concluídas (${compCount})`;
}

// =======================================================
// === HISTÓRICO ===
// =======================================================

function addToHistory(task) {
    const h = getHistoryFromStorage();
    const key = new Date().toISOString().split('T')[0];
    if (!h[key]) h[key] = [];
    if (!h[key].some(e => e.id === task.id)) {
        h[key].push({ id: task.id, text: task.text, time: new Date().toLocaleTimeString('pt-BR') });
        saveHistoryToStorage(h);
    }
}

function displayHistory() {
    cleanupOldHistory(); // LIMPA ANTES DE MOSTRAR
    const container = document.getElementById('history-container');
    const h = getHistoryFromStorage();
    const keys = Object.keys(h).sort().reverse();

    container.innerHTML = '<h3>Histórico (Últimos 7 dias)</h3>';
    keys.forEach(k => {
        const dateLabel = new Date(k + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        container.innerHTML += `
            <details>
                <summary><strong>${dateLabel} (${h[k].length})</strong></summary>
                <div style="padding:10px">
                    ${h[k].map(e => `<div class="history-item-line"><span>[${e.time}] ${e.text}</span></div>`).join('')}
                </div>
            </details>
        `;
    });
}

function setFilter(f) { currentFilter = f; renderTasks(); }
function clearCompletedTasks() { 
    if(confirm("Remover concluídas?")) {
        saveTasksToStorage(getTasksFromStorage().filter(t => !t.completed));
        renderTasks();
    }
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    resetTimerVariables();
    updateDisplay();
    renderTasks();
    displayHistory();
    
    document.getElementById('start-btn').onclick = startTimer;
    document.getElementById('pause-btn').onclick = pauseTimer;
    document.getElementById('reset-btn').onclick = resetTimer;
});
