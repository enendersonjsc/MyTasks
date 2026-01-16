// CONFIGURAÇÕES E ESTADO
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_KEY = 'todoHistory';
let currentFilter = 'all';

// =======================================================
// === POMODORO TIMER (LÓGICA DE TEMPO REAL) ===
// =======================================================
let timerInterval;
let timeRemaining = 25 * 60; // Inicia com 25 min
let isPaused = true;
let currentPhase = 'pomodoro';
let pomodoroCycles = 0;
let endTime; // Marca o momento exato em que o ciclo deve terminar

const POMODORO_TIME = 25 * 60;
const SHORT_BREAK_TIME = 5 * 60;
const LONG_BREAK_TIME = 15 * 60;

function updateTimerDisplay() {
    const m = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
    const s = String(timeRemaining % 60).padStart(2, '0');
    document.getElementById('timer-display').textContent = `${m}:${s}`;
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

    // Define o momento exato do fim baseado no que restava
    endTime = Date.now() + (timeRemaining * 1000);

    document.getElementById('start-btn').disabled = true;
    document.getElementById('pause-btn').disabled = false;

    // Atualiza a cada 200ms para uma transição suave e precisa
    timerInterval = setInterval(() => {
        const now = Date.now();
        const difference = Math.round((endTime - now) / 1000);

        if (difference <= 0) {
            timeRemaining = 0;
            updateTimerDisplay();
            clearInterval(timerInterval);
            handlePhaseEnd();
        } else {
            timeRemaining = difference;
            updateTimerDisplay();
        }
    }, 200);
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
    currentPhase = 'pomodoro';
    timeRemaining = POMODORO_TIME;
    updateTimerDisplay();
}

function handlePhaseEnd() {
    alert("Ciclo finalizado!");
    if (currentPhase === 'pomodoro') {
        pomodoroCycles++;
        currentPhase = (pomodoroCycles % 4 === 0) ? 'long-break' : 'short-break';
        timeRemaining = (currentPhase === 'long-break') ? LONG_BREAK_TIME : SHORT_BREAK_TIME;
    } else {
        currentPhase = 'pomodoro';
        timeRemaining = POMODORO_TIME;
    }
    updateTimerDisplay();
    // Reinicia automaticamente o próximo ciclo (pausado por segurança)
    isPaused = true;
    startTimer();
}

// =======================================================
// === CORE STORAGE & TAREFAS ===
// =======================================================

function getTasksFromStorage() {
    const tasks = JSON.parse(localStorage.getItem('todoTasks') || '[]');
    return tasks.map(t => ({
        ...t,
        subtasks: t.subtasks || [],
        subtaskExpanded: !!t.subtaskExpanded
    }));
}
function saveTasksToStorage(tasks) { localStorage.setItem('todoTasks', JSON.stringify(tasks)); }

// DRAG AND DROP
let dragTargetIndex = null;
function handleDragStart(e, index) { dragTargetIndex = index; e.currentTarget.classList.add('dragging'); }
function handleDragOver(e) { e.preventDefault(); }
function handleDrop(e, toIndex) {
    e.preventDefault();
    if (dragTargetIndex === null || dragTargetIndex === toIndex) return;
    const tasks = getTasksFromStorage();
    const draggedItem = tasks.splice(dragTargetIndex, 1)[0];
    tasks.splice(toIndex, 0, draggedItem);
    saveTasksToStorage(tasks);
    renderTasks();
}
function handleDragEnd(e) { e.currentTarget.classList.remove('dragging'); }

function addTask() {
    const input = document.getElementById('task-input');
    if (!input.value.trim()) return;
    const tasks = getTasksFromStorage();
    tasks.unshift({
        id: Date.now(),
        text: input.value.trim(),
        priority: document.getElementById('priority-select').value,
        dueDate: document.getElementById('due-date-input').value,
        dateAdded: new Date().toISOString(),
        completed: false,
        subtasks: [],
        subtaskExpanded: false
    });
    saveTasksToStorage(tasks);
    input.value = '';
    renderTasks();
}

function updateTaskPriority(id, newPriority) {
    const tasks = getTasksFromStorage();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.priority = newPriority;
        saveTasksToStorage(tasks);
        renderTasks();
    }
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

// =======================================================
// === RENDERIZAÇÃO ===
// =======================================================

function renderTasks() {
    const list = document.getElementById('task-list');
    const tasks = getTasksFromStorage();
    let displayTasks = tasks;
    if (currentFilter !== 'all') {
        displayTasks = tasks.filter(t => t.completed || t.priority === currentFilter);
    }

    list.innerHTML = '';
    displayTasks.forEach((t, index) => {
        const li = document.createElement('li');
        li.className = `task-item task-${t.priority} ${t.completed ? 'task-completed' : ''}`;
        li.draggable = true;
        li.ondragstart = (e) => handleDragStart(e, index);
        li.ondragover = (e) => handleDragOver(e);
        li.ondrop = (e) => handleDrop(e, index);
        li.ondragend = (e) => handleDragEnd(e);

        const isOld = !t.completed && (new Date() - new Date(t.dateAdded) > FIFTEEN_DAYS_MS);
        
        li.innerHTML = `
            <div class="task-main-row">
                <div class="task-info">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onclick="event.stopPropagation(); toggleComplete(${t.id})">
                    <span class="task-text">${t.text} ${isOld ? '⚠️' : ''}</span>
                    ${!t.completed ? `
                        <select class="task-priority-inline" onchange="updateTaskPriority(${t.id}, this.value)">
                            <option value="alta" ${t.priority === 'alta' ? 'selected' : ''}>Alta</option>
                            <option value="media" ${t.priority === 'media' ? 'selected' : ''}>Média</option>
                            <option value="baixa" ${t.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
                        </select>
                    ` : ''}
                </div>
                <div style="display:flex; align-items:center; gap:10px">
                    <button class="subtask-expander ${t.subtaskExpanded ? 'expanded' : ''}" onclick="toggleExpand(${t.id})">►</button>
                    <button class="delete-btn" onclick="deleteTask(${t.id})">×</button>
                </div>
            </div>
            ${t.dueDate ? `<div style="font-size:0.75em; margin-top:5px; font-weight:bold">📅 Prazo: ${new Date(t.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</div>` : ''}
            <div class="subtask-area" style="display: ${t.subtaskExpanded ? 'block' : 'none'}">
                <div class="subtask-list">
                    ${t.subtasks.map(s => `
                        <div class="subtask-item ${s.completed ? 'subtask-completed' : ''}">
                            <input type="checkbox" ${s.completed ? 'checked' : ''} onclick="toggleSub(${t.id}, ${s.id})">
                            <span>${s.text}</span>
                        </div>
                    `).join('')}
                </div>
                ${!t.completed ? `
                    <div style="margin-top:8px">
                        <input type="text" placeholder="Passo..." class="new-subtask-input" id="sub-in-${t.id}">
                        <button onclick="addSubtask(${t.id})" style="color:#61dafb; background:none; border:none; cursor:pointer; font-weight:bold">+</button>
                    </div>
                ` : ''}
            </div>
        `;
        list.appendChild(li);
    });
    updateCounters(tasks);
}

function toggleExpand(id) {
    const tasks = getTasksFromStorage();
    const task = tasks.find(t => t.id === id);
    task.subtaskExpanded = !task.subtaskExpanded;
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
    const task = tasks.find(t => t.id === taskId);
    const sub = task.subtasks.find(s => s.id === subId);
    sub.completed = !sub.completed;
    saveTasksToStorage(tasks);
    renderTasks();
}

// =======================================================
// === HISTÓRICO & AUXILIARES ===
// =======================================================

function updateCounters(tasks) {
    document.getElementById('count-alta').textContent = `Alta: ${tasks.filter(t => !t.completed && t.priority === 'alta').length}`;
    document.getElementById('count-media').textContent = `Média: ${tasks.filter(t => !t.completed && t.priority === 'media').length}`;
    document.getElementById('count-baixa').textContent = `Baixa: ${tasks.filter(t => !t.completed && t.priority === 'baixa').length}`;
    const comp = tasks.filter(t => t.completed).length;
    document.getElementById('clear-completed-btn').disabled = comp === 0;
    document.getElementById('clear-completed-btn').textContent = `Limpar Concluídas (${comp})`;
}

function addToHistory(task) {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    const key = new Date().toISOString().split('T')[0];
    if (!h[key]) h[key] = [];
    h[key].push({ text: task.text, time: new Date().toLocaleTimeString('pt-BR') });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

function displayHistory() {
    const container = document.getElementById('history-container');
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    const now = Date.now();
    
    Object.keys(h).forEach(k => {
        if (now - new Date(k + 'T00:00:00').getTime() > SEVEN_DAYS_MS) delete h[k];
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));

    const keys = Object.keys(h).sort().reverse();
    container.innerHTML = '<h3>Histórico (Últimos 7 dias)</h3>';
    keys.forEach(k => {
        const label = new Date(k + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' });
        container.innerHTML += `
            <details>
                <summary><strong>${label} (${h[k].length})</strong></summary>
                <div style="padding:5px 15px">
                    ${h[k].map(e => `<div class="history-item-line">[${e.time}] ${e.text}</div>`).join('')}
                </div>
            </details>
        `;
    });
}

function setFilter(f) { currentFilter = f; renderTasks(); }
function clearCompletedTasks() {
    if (confirm("Remover concluídas?")) {
        saveTasksToStorage(getTasksFromStorage().filter(t => !t.completed));
        renderTasks();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateTimerDisplay();
    renderTasks();
    displayHistory();
    
    document.getElementById('start-btn').onclick = startTimer;
    document.getElementById('pause-btn').onclick = pauseTimer;
    document.getElementById('reset-btn').onclick = resetTimer;
});
