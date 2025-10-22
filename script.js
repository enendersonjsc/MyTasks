// Constante para 15 dias em milissegundos
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

// Chave para o histórico diário
const HISTORY_KEY = 'todoHistory';

// Variável Global para o Filtro (padrão: todas)
let currentFilter = 'all'; 

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
    
    // É importante usar o índice, pois a função está sempre rodando a partir do índice da lista COMPLETA
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
    const taskText = input.value.trim();
    const priority = prioritySelect.value;
    
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
        historyLogged: false 
    };

    let tasks = getTasksFromStorage();
    tasks.push(task);
    saveTasksToStorage(tasks);

    input.value = '';

    renderTasks();
}

function changePriority(index, newPriority) {
    let tasks = getTasksFromStorage();
    tasks[index].priority = newPriority;
    saveTasksToStorage(tasks);
    renderTasks();
}

// FUNÇÃO renderTasks CORRIGIDA COM CRIAÇÃO DE ELEMENTOS DOM
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

    filteredTasks.forEach((task) => {
        // Encontra o índice da tarefa original na lista COMPLETA (necessário para as funções de alteração/deleção)
        const originalIndex = tasks.findIndex(t => t.id === task.id);
        
        const dateStringForCalculation = task.dateAdded || task.date;
        const dateStringToDisplay = task.dateDisplay || task.date;
        let alertSymbol = '';

        // Lógica do Alerta de 15 dias
        if (!task.completed && dateStringForCalculation) {
            try {
                const taskTime = new Date(dateStringForCalculation).getTime();
                const currentTime = new Date().getTime();
                
                if (currentTime - taskTime > FIFTEEN_DAYS_MS) {
                    alertSymbol = ' ⚠️';
                }
            } catch (e) {}
        }
        
        let classList = `task-item task-${task.priority}`;
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
        
        // --- 5. Data ---
        const dateSpan = document.createElement('span');
        dateSpan.className = 'task-date';
        dateSpan.textContent = `(${dateStringToDisplay})`;
        taskContentDiv.appendChild(dateSpan);
        
        // --- 6. Texto da Tarefa (Com Lógica de Edição) ---
        const textSpan = document.createElement('span');
        textSpan.textContent = task.text + alertSymbol;
        
        if (task.completed) {
            // Apenas texto
            taskContentDiv.appendChild(textSpan);
        } else {
            // Edição Inline segura com addEventListener
            textSpan.className = 'task-text';
            textSpan.title = 'Dê um clique duplo para editar';
            
            textSpan.addEventListener('dblclick', function() {
                // A referência "this" é o span que foi clicado
                const currentSpan = this;
                const originalText = task.text;
                
                // Cria o input
                const editInput = document.createElement('input');
                editInput.type = 'text';
                editInput.className = 'edit-input';
                editInput.value = originalText;
                
                // Função de Salvar (passa o index original)
                const save = () => saveTaskText(originalIndex, editInput.value);
                
                // Substitui o span pelo input
                taskContentDiv.replaceChild(editInput, currentSpan);
                editInput.focus();
                
                // Salvar ao clicar fora (onblur) ou apertar Enter
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
        
        // --- 7. Montagem Final do LI ---
        li.appendChild(taskContentDiv);
        li.appendChild(deleteBtn);

        taskList.appendChild(li);
        // --- FIM DA CRIAÇÃO DO ELEMENTO ---
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
    
    // Garante que o filtro seja carregado no estado atual
    const filterSelect = document.getElementById('filter-select');
    if (filterSelect) {
        filterSelect.value = currentFilter;
    }
});
