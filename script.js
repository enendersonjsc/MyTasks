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
    
    // É importante encontrar a tarefa pelo ID para evitar erros de índice após filtragem
    const taskToUpdate = tasks.find(t => t.id === tasks[index].id);

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
        // Encontra o índice da tarefa original na lista COMPLETA (necessário para o toggleComplete, changePriority, saveTaskText e deleteTask)
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
        
        const li = document.createElement('li');
        li.className = classList;

        const prioritySelectHTML = `
            <select class="task-priority-select" onchange="changePriority(${originalIndex}, this.value)">
                <option value="alta" ${task.priority === 'alta' ? 'selected' : ''}>Alta</option>
                <option value="media" ${task.priority === 'media' ? 'selected' : ''}>Média</option>
                <option value="baixa" ${task.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
            </select>
        `;
        
        let taskTextHTML;
        if (task.completed) {
             // Se estiver concluída, exibe como texto simples (não editável)
            taskTextHTML = `<span>${task.text}${alertSymbol}</span>`;
        } else {
            // CORREÇÃO: Usando template literal para simplificar o escape do JS do ondblclick
            
            // 1. Prepara a string de código JavaScript para a função 'ondblclick'
            // O uso de barras invertidas triplas (\\') é necessário para que a string final dentro do atributo HTML seja renderizada corretamente.
            const editScript = `
                const span = this;
                // 1.1 Limpa o texto original (remove o ⚠️ e faz escape para HTML)
                const originalText = span.textContent.replace(' ⚠️', '').trim().replace(/'/g, '&apos;').replace(/"/g, '&quot;');
                
                // 1.2 Cria o elemento input. Note o escape: \\" para o HTML (outerHTML) e \\\\' para o JS (onblur/onkeydown)
                span.outerHTML = '<input type=\\"text\\" class=\\"edit-input\\" value=\\"' + originalText + '\\" onblur=\\"saveTaskText(${originalIndex}, this.value)\\" onkeydown=\\"if(event.key === \\"Enter\\") { saveTaskText(${originalIndex}, this.value); }\\">'; 
                
                // 1.3 Garante o foco.
                setTimeout(() => { 
                    const inputEl = document.querySelector('.edit-input');
                    if (inputEl) inputEl.focus(); 
                }, 0);
            `;
            
            // 2. Insere o código (editScript) no atributo ondblclick do SPAN
            taskTextHTML = `
                <span class="task-text" 
                    ondblclick="${editScript.replace(/\n/g, ' ').trim()}"
                    title="Dê um clique duplo para editar">
                    ${task.text}${alertSymbol}
                </span>
            `;
        }

        // Conteúdo da tarefa
        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onclick="toggleComplete(${originalIndex})">
                ${!task.completed ? prioritySelectHTML : ''} 
                <span class="task-date">(${dateStringToDisplay})</span>
                ${taskTextHTML}
            </div>
            <button class="delete-btn" onclick="deleteTask(${originalIndex})">X</button>
        `;

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
        // Filtra a entrada a ser deletada pelo entryId (que é único para o histórico)
        history[dateKey] = history[dateKey].filter(entry => entry.entryId != entryId);
        
        // Se a lista do dia ficar vazia, remove a chave do dia
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
    // Ordena as chaves de data (dias) do mais novo para o mais antigo
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
