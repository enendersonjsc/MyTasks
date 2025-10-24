// Constante para 15 dias em milissegundos
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

// Chave para o histórico diário
const HISTORY_KEY = 'todoHistory';

// Variável Global para o Filtro (padrão: todas)
let currentFilter = 'all'; 

// =======================================================
// === POMODORO TIMER LÓGICA ===
// =======================================================
let timerInterval;
let timeRemaining;
let isPaused = true;
let currentPhase = 'pomodoro'; // 'pomodoro' ou 'short-break' ou 'long-break'
let pomodoroCycles = 0; // Contagem de ciclos de 25 minutos

const POMODORO_TIME = 25 * 60; // 25 minutos em segundos
const SHORT_BREAK_TIME = 5 * 60;  // 5 minutos
const LONG_BREAK_TIME = 15 * 60; // 15 minutos

function resetTimerVariables() {
    // Mantemos os ciclos, mas zeramos se o usuário apertar Reset total
    if (pomodoroCycles >= 4) {
         pomodoroCycles = 0;
    }
    currentPhase = 'pomodoro';
    timeRemaining = POMODORO_TIME;
    isPaused = true;
}

function updateDisplay() {
    const minutes = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
    const seconds = String(timeRemaining % 60).padStart(2, '0');
    
    const displayEl = document.getElementById('timer-display');
    const statusEl = document.getElementById('current-phase');
    const cycleEl = document.getElementById('cycle-count');
    const body = document.body;

    if (!displayEl || !statusEl || !cycleEl) return;

    displayEl.textContent = `${minutes}:${seconds}`;
    cycleEl.textContent = pomodoroCycles;
    
    // Atualiza status e classes de estilo
    body.classList.remove('focus-mode', 'break-mode');
    
    if (currentPhase === 'pomodoro') {
        statusEl.textContent = 'Foco (25 min)';
        body.classList.add('focus-mode');
    } else if (currentPhase === 'short-break') {
        statusEl.textContent = 'Descanso Curto (5 min)';
        body.classList.add('break-mode');
    } else if (currentPhase === 'long-break') {
        statusEl.textContent = 'Descanso Longo (15 min)';
        body.classList.add('break-mode');
    }

    // Atualiza o título da página para notificação visual
    document.title = `(${minutes}:${seconds}) MyTasks | ${statusEl.textContent}`;
}

function startTimer() {
    if (!isPaused && timeRemaining > 0) return;
    isPaused = false;
    
    document.getElementById('start-btn').disabled = true;
    document.getElementById('pause-btn').disabled = false;
    
    // Se o timer estiver em 0 (após o handlePhaseEnd), inicia o próximo ciclo
    if (timeRemaining <= 0) {
        setNextPhase();
    }
    
    timerInterval = setInterval(() => {
        if (timeRemaining > 0) {
            timeRemaining--;
            updateDisplay();
        } else {
            clearInterval(timerInterval);
            handlePhaseEnd();
        }
    }, 1000);
}

function pauseTimer() {
    if (isPaused) return;
    isPaused = true;
    clearInterval(timerInterval);

    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
}

function resetTimer() {
    pauseTimer();
    // Zera TUDO
    pomodoroCycles = 0;
    resetTimerVariables();
    updateDisplay();
    
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    document.title = 'MyTasks - Gerenciador de Tarefas';
}

function handlePhaseEnd() {
    // Alerta o usuário quando o tempo acaba
    alert(`Fim do ciclo de ${currentPhase === 'pomodoro' ? 'Foco' : 'Descanso'}! Começando o próximo.`); 
    
    // Configura a próxima fase, mas o startTimer() precisa ser chamado para começar o próximo ciclo
    setNextPhase(); 
    startTimer();
}

function setNextPhase() {
    if (currentPhase === 'pomodoro') {
        pomodoroCycles++;
        
        if (pomodoroCycles % 4 === 0) {
            currentPhase = 'long-break';
            timeRemaining = LONG_BREAK_TIME;
        } else {
            currentPhase = 'short-break';
            timeRemaining = SHORT_BREAK_TIME;
        }
    } else {
        // Volta para o Pomodoro após o descanso (curto ou longo)
        currentPhase = 'pomodoro';
        timeRemaining = POMODORO_TIME;
    }
    
    // Notifica o usuário
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('MyTasks Pomodoro', {
            body: `Começando a fase: ${document.getElementById('current-phase').textContent}`,
            silent: false 
        });
    }
    
    updateDisplay();
}

// Inicialização dos Event Listeners do Timer (chamado no DOMContentLoaded)
function initPomodoro() {
    // Garante as variáveis iniciais
    resetTimerVariables();
    updateDisplay();

    // Conexão dos botões
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    if (startBtn) startBtn.onclick = startTimer;
    if (pauseBtn) pauseBtn.onclick = pauseTimer;
    if (resetBtn) resetBtn.onclick = resetTimer;
    
    // Pede permissão de Notificações
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// =======================================================
// === FIM DO BLOCO DO POMODORO TIMER ===
// =======================================================


// --- Funções de Storage ---

function getTasksFromStorage() {
    const tasksJson = localStorage.getItem('todoTasks');
    let tasks = tasksJson ? JSON.parse(tasksJson) : [];
    tasks = tasks.map(task => {
        if (!task.id) {
            task.id = Date.now() + Math.random(); // Adiciona ID único
        }
        if (typeof task.historyLogged === 'undefined') {
            task.historyLogged = false;
        }
        if (typeof task.dueDate === 'undefined') {
            task.dueDate = ''; 
        }
        return task;
    });
    return tasks;
}

function saveTasksToStorage(tasks) {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

function getHistoryFromStorage() {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : {};
}

function saveHistoryToStorage(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// --- Funções Utilitárias para Data ---

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00'); 
    return date.toLocaleDateString('pt-BR');
}

// --- Funções de Filtro, Edição e Utilitárias ---

// Função para definir o filtro atual e re-renderizar
function setFilter(newFilter) {
    currentFilter = newFilter;
    renderTasks();
}

function updatePriorityCounts(tasks) {
    let alta = 0;
    let media = 0;
    let baixa = 0;
    let completedCount = 0;

    tasks.forEach(task => {
        if (!task.completed) { // Conta apenas tarefas PENDENTES
            switch (task.priority) {
                case 'alta':
                    alta++;
                    break;
                case 'media':
                    media++;
                    break;
                case 'baixa':
                    baixa++;
                    break;
            }
        } else {
            completedCount++;
        }
    });

    // Atualiza os contadores no HTML
    const countAltaEl = document.getElementById('count-alta');
    const countMediaEl = document.getElementById('count-media');
    const countBaixaEl = document.getElementById('count-baixa');
    const clearBtn = document.getElementById('clear-completed-btn');

    if (countAltaEl) countAltaEl.textContent = `Alta: ${alta}`;
    if (countMediaEl) countMediaEl.textContent = `Média: ${media}`;
    if (countBaixaEl) countBaixaEl.textContent = `Baixa: ${baixa}`;
    
    // Configura o Botão de Limpeza
    if (clearBtn) {
        clearBtn.disabled = completedCount === 0;
        clearBtn.textContent = `Limpar Concluídas (${completedCount})`;
    }
}

function clearCompletedTasks() {
    if (!confirm('Tem certeza de que deseja remover TODAS as tarefas concluídas da sua lista ativa?')) {
        return;
    }

    let tasks = getTasksFromStorage();
    
    // Mantém apenas as tarefas que NÃO estão concluídas
    tasks = tasks.filter(task => !task.completed); 
    
    saveTasksToStorage(tasks);
    renderTasks(); 
}

// Salva o texto editado (chamado pelo onblur ou onkeydown do input)
function saveTaskText(index, newText) {
    let tasks = getTasksFromStorage();
    
    const taskToUpdate = tasks[index];

    if (!taskToUpdate) return;
    
    // Garante que o texto não esteja vazio
    if (newText.trim() === '') {
        alert('O texto da tarefa não pode estar vazio. Edição cancelada.');
        renderTasks(); // Recarrega para restaurar o texto original
        return;
    }
    
    taskToUpdate.text = newText.trim();
    saveTasksToStorage(tasks);
    renderTasks();
}

// --- Lógica Principal de Adicionar e Renderizar ---

function addTask() {
    const input = document.getElementById('task-input');
    const prioritySelect = document.getElementById('priority-select');
    const dueDateInput = document.getElementById('due-date-input'); 
    
    const taskText = input.value.trim();
    const priority = prioritySelect.value;
    const dueDate = dueDateInput.value; 

    const dateDisplay = new Date().toLocaleDateString('pt-BR');
    const dateAdded = new Date().toISOString(); 

    if (taskText === '') {
        alert('Por favor, digite uma tarefa.');
        return;
    }

    const task = {
        id: Date.now() + Math.random(), 
        text: taskText,
        priority: priority,
        dateDisplay: dateDisplay, 
        dateAdded: dateAdded,
        completed: false,
        historyLogged: false,
        dueDate: dueDate 
    };

    let tasks = getTasksFromStorage();
    tasks.push(task);
    saveTasksToStorage(tasks);

    input.value = '';
    dueDateInput.value = ''; // Limpa o campo de data após adicionar

    renderTasks();
}

function changePriority(index, newPriority) {
    let tasks = getTasksFromStorage();
    tasks[index].priority = newPriority;
    saveTasksToStorage(tasks);
    renderTasks();
}

// FUNÇÃO renderTasks COM DOM PURO E LÓGICA DE DATA LIMITE CORRIGIDA
function renderTasks() {
    const taskList = document.getElementById('task-list');
    let tasks = getTasksFromStorage();

    // 1. ATUALIZA OS CONTADORES
    updatePriorityCounts(tasks); 

    // 2. APLICA O FILTRO
    let filteredTasks = tasks.filter(task => {
        if (currentFilter === 'all' || task.completed) {
            return true;
        }
        return task.priority === currentFilter;
    });
    
    // 3. ORDENAÇÃO
    const priorityOrder = { 'alta': 3, 'media': 2, 'baixa': 1 };

    filteredTasks.sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    taskList.innerHTML = ''; 

    // Pega a meia-noite de hoje para comparação de prazos
    const today = new Date().setHours(0, 0, 0, 0); 

    filteredTasks.forEach((task) => {
        const originalIndex = tasks.findIndex(t => t.id === task.id);
        
        const dateStringForCalculation = task.dateAdded || task.date;
        const dateStringToDisplay = task.dateDisplay || task.date;
        let alertSymbol = '';
        let dueClass = ''; // Classe CSS para alerta de prazo

        // Lógica do Alerta de 15 dias (tarefa antiga)
        if (!task.completed && dateStringForCalculation) {
            try {
                const taskTime = new Date(dateStringForCalculation).getTime();
                const currentTime = new Date().getTime();
                
                if (currentTime - taskTime > FIFTEEN_DAYS_MS) {
                    alertSymbol = ' ⚠️';
                }
            } catch (e) {}
        }
        
        // Lógica do Alerta de Data Limite
        if (!task.completed && task.dueDate) {
            // Cria timestamp da data limite na meia-noite (para comparação justa)
            const dueDateTimestamp = new Date(task.dueDate + 'T00:00:00').setHours(0, 0, 0, 0);
            
            if (dueDateTimestamp < today) {
                // Prazo Expirado (Atrasado)
                dueClass = 'due-expired';
                alertSymbol = ' ❌ ' + alertSymbol; 
            } else if (dueDateTimestamp === today) {
                // Prazo Hoje
                dueClass = 'due-near';
                alertSymbol = ' 🔔 ' + alertSymbol;
            }
        }
        
        let classList = `task-item task-${task.priority} ${dueClass}`; 
        if (task.completed) {
            classList += ' task-completed';
        }
        
        // --- INÍCIO DA CRIAÇÃO DO ELEMENTO (DOM PURO) ---
        const li = document.createElement('li');
        li.className = classList;
        
        // --- 1. Botão de Excluir ---
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'X';
        deleteBtn.onclick = () => deleteTask(originalIndex);
        
        // --- 2. Container Principal (task-content) ---
        const taskContentDiv = document.createElement('div');
        taskContentDiv.className = 'task-content';
        
        // --- 3. Checkbox ---
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.onclick = () => toggleComplete(originalIndex);
        taskContentDiv.appendChild(checkbox);
        
        // --- 4. Seletor de Prioridade ---
        if (!task.completed) {
            const prioritySelect = document.createElement('select');
            prioritySelect.className = 'task-priority-select';
            prioritySelect.onchange = (e) => changePriority(originalIndex, e.target.value);
            
            ['alta', 'media', 'baixa'].forEach(p => {
                const option = document.createElement('option');
                option.value = p;
                option.textContent = p.charAt(0).toUpperCase() + p.slice(1);
                if (task.priority === p) option.selected = true;
                prioritySelect.appendChild(option);
            });
            taskContentDiv.appendChild(prioritySelect);
        }
        
        // --- 5. Data de Criação ---
        const creationDateSpan = document.createElement('span');
        creationDateSpan.className = 'task-date';
        creationDateSpan.textContent = `(Criada em: ${dateStringToDisplay})`;
        taskContentDiv.appendChild(creationDateSpan);
        
        // --- 6. Texto da Tarefa (Com Lógica de Edição) ---
        const textSpan = document.createElement('span');
        textSpan.textContent = task.text; 
        
        if (!task.completed) {
            // Adiciona o ícone de alerta (15 dias ou prazo) ao final do texto, apenas se houver ícone
            if (alertSymbol.trim() !== '') {
                const alertNode = document.createTextNode(alertSymbol);
                textSpan.appendChild(alertNode);
            }
        }
        
        // --- 7. Data Limite (ANEXADA AO FINAL DO TEXTO) ---
        if (task.dueDate) {
            const dueDateSpan = document.createElement('span');
            dueDateSpan.className = 'due-date';
            dueDateSpan.textContent = `Prazo: ${formatDate(task.dueDate)}`;
            textSpan.appendChild(dueDateSpan); 
        }

        if (task.completed) {
            taskContentDiv.appendChild(textSpan);
        } else {
            // Edição Inline segura com addEventListener
            textSpan.className = 'task-text';
            textSpan.title = 'Dê um clique duplo para editar';
            
            textSpan.addEventListener('dblclick', function() {
                const currentSpan = this;
                const originalText = task.text;
                
                const editInput = document.createElement('input');
                editInput.type = 'text';
                editInput.className = 'edit-input';
                editInput.value = originalText;
                
                const save = () => saveTaskText(originalIndex, editInput.value);
                
                taskContentDiv.replaceChild(editInput, currentSpan);
                editInput.focus();
                
                editInput.onblur = save;
                editInput.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault(); 
                        save();
                    }
                };
            });
            taskContentDiv.appendChild(textSpan);
        }
        
        // --- 8. Montagem Final do LI ---
        li.appendChild(taskContentDiv);
        li.appendChild(deleteBtn);

        taskList.appendChild(li);
    });

    saveTasksToStorage(tasks); 
}

// --- Lógica de Conclusão e Histórico ---

function toggleComplete(index) {
    let tasks = getTasksFromStorage();
    const task = tasks[index];

    if (!task.completed && !task.historyLogged) {
        addToHistory(task);
        task.historyLogged = true; 
    } 
    
    task.completed = !task.completed;
    saveTasksToStorage(tasks);
    renderTasks();
    displayHistory(); 
}

function deleteTask(index) {
    if (confirm('Tem certeza de que deseja excluir esta tarefa?')) {
        let tasks = getTasksFromStorage();
        tasks.splice(index, 1); 
        saveTasksToStorage(tasks);
        renderTasks();
    }
}

// --- Funções de Histórico ---

function getTodayKey() {
    const now = new Date();
    // Formato YYYY-MM-DD
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

function addToHistory(task) {
    const history = getHistoryFromStorage();
    const todayKey = getTodayKey();

    if (!history[todayKey]) {
        history[todayKey] = [];
    }
    
    const exists = history[todayKey].some(entry => entry.id === task.id);

    if (!exists) {
        history[todayKey].push({ 
            id: task.id, 
            text: task.text, 
            completedAt: new Date().toLocaleTimeString('pt-BR'),
            entryId: Date.now() + Math.random() // ID único para a entrada do histórico
        }); 
        saveHistoryToStorage(history);
    }
}

function deleteHistoryEntry(dateKey, entryId) {
    if (!confirm('Tem certeza de que deseja remover esta entrada do histórico?')) {
        return;
    }
    
    const history = getHistoryFromStorage();
    
    if (history[dateKey]) {
        history[dateKey] = history[dateKey].filter(entry => entry.entryId != entryId);
        
        if (history[dateKey].length === 0) {
            delete history[dateKey];
        }
        
        saveHistoryToStorage(history);
        displayHistory(); 
    }
}

function displayHistory() {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;

    const history = getHistoryFromStorage();
    const historyKeys = Object.keys(history).sort().reverse(); 

    historyContainer.innerHTML = '<h3>Histórico de Conclusões:</h3>';
    
    historyKeys.forEach(dateKey => {
        const tasks = history[dateKey];
        
        const dateReadable = new Date(dateKey + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        let listItems = tasks.map(t => `
            <li class="history-item-line">
                [${t.completedAt}] ${t.text}
                <button 
                    class="delete-btn history-delete-btn" 
                    onclick="deleteHistoryEntry('${dateKey}', ${t.entryId})">
                    X
                </button>
            </li>
        `).join('');

        let dayHTML = `
            <details>
                <summary><strong>${dateReadable} (${tasks.length} concluída${tasks.length === 1 ? '' : 's'})</strong></summary>
                <ul>
                    ${listItems}
                </ul>
            </details>
        `;
        historyContainer.innerHTML += dayHTML;
    });
}

// Carrega as tarefas salvas quando a página é aberta
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    displayHistory(); 
    
    // Inicializa o Pomodoro
    initPomodoro(); 
    
    // Garante que o filtro seja carregado no estado atual
    const filterSelect = document.getElementById('filter-select');
    if (filterSelect) {
        filterSelect.value = currentFilter;
    }
});
