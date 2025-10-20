// Constante para 15 dias em milissegundos
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

// Chave para o histórico diário
const HISTORY_KEY = 'todoHistory';

// --- Funções de Storage ---

function getTasksFromStorage() {
    const tasksJson = localStorage.getItem('todoTasks');
    return tasksJson ? JSON.parse(tasksJson) : [];
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
        text: taskText,
        priority: priority,
        dateDisplay: dateDisplay, 
        dateAdded: dateAdded,
        completed: false
    };

    let tasks = getTasksFromStorage();
    tasks.push(task);
    saveTasksToStorage(tasks);

    input.value = '';

    renderTasks();
}

// Função para mudar a prioridade (NOVA)
function changePriority(index, newPriority) {
    let tasks = getTasksFromStorage();
    tasks[index].priority = newPriority;
    saveTasksToStorage(tasks);
    renderTasks();
}

function renderTasks() {
    const taskList = document.getElementById('task-list');
    let tasks = getTasksFromStorage();

    const priorityOrder = { 'alta': 3, 'media': 2, 'baixa': 1 };

    tasks.sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    taskList.innerHTML = ''; 

    tasks.forEach((task, index) => {
        // Compatibilidade com tarefas antigas que só têm o campo 'date'
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
        
        // Aplica classes de cor e estado
        let classList = `task-item task-${task.priority}`;
        if (task.completed) {
            classList += ' task-completed';
        }
        
        const li = document.createElement('li');
        li.className = classList;

        // HTML do Seletor de prioridade (NOVO)
        const prioritySelectHTML = `
            <select class="task-priority-select" onchange="changePriority(${index}, this.value)">
                <option value="alta" ${task.priority === 'alta' ? 'selected' : ''}>Alta</option>
                <option value="media" ${task.priority === 'media' ? 'selected' : ''}>Média</option>
                <option value="baixa" ${task.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
            </select>
        `;

        // Conteúdo da tarefa
        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onclick="toggleComplete(${index})">
                ${!task.completed ? prioritySelectHTML : ''} <span class="task-date">(${dateStringToDisplay})</span>
                <span>${task.text}${alertSymbol}</span>
            </div>
            <button class="delete-btn" onclick="deleteTask(${index})">X</button>
        `;

        taskList.appendChild(li);
    });

    saveTasksToStorage(tasks); 
}

// --- Lógica de Conclusão e Histórico ---

function toggleComplete(index) {
    let tasks = getTasksFromStorage();
    const task = tasks[index];

    // Se estava incompleta e agora foi concluída
    if (!task.completed) {
        addToHistory(task);
    } 
    // Se estava concluída e agora foi reaberta (Ignora o histórico neste caso)
    
    task.completed = !task.completed;
    saveTasksToStorage(tasks);
    renderTasks();
    displayHistory(); // Atualiza a exibição do histórico
}

function deleteTask(index) {
    if (confirm('Tem certeza de que deseja excluir esta tarefa?')) {
        let tasks = getTasksFromStorage();
        tasks.splice(index, 1); 
        saveTasksToStorage(tasks);
        renderTasks();
    }
}

// --- Funções de Histórico (NOVAS) ---

function getTodayKey() {
    const now = new Date();
    // Formato: 2025-10-20 (ANO-MÊS-DIA)
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

function addToHistory(task) {
    const history = getHistoryFromStorage();
    const todayKey = getTodayKey();

    if (!history[todayKey]) {
        history[todayKey] = [];
    }
    // Adiciona uma cópia da tarefa ao histórico
    history[todayKey].push({ 
        text: task.text, 
        completedAt: new Date().toLocaleTimeString('pt-BR'),
        // Garante que não haja duplicatas exatas se o usuário marcar/desmarcar rápido
        id: Date.now() 
    }); 
    saveHistoryToStorage(history);
}

function displayHistory() {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;

    const history = getHistoryFromStorage();
    const historyKeys = Object.keys(history).sort().reverse(); // Ordena do mais novo para o mais antigo

    historyContainer.innerHTML = '<h3>Histórico de Conclusões:</h3>';
    
    // Itera por todos os dias no histórico
    historyKeys.forEach(dateKey => {
        const tasks = history[dateKey];
        // Converte a chave da data (ex: 2025-10-20) para um formato legível
        const dateReadable = new Date(dateKey).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        let dayHTML = `
            <details>
                <summary><strong>${dateReadable} (${tasks.length} concluída${tasks.length === 1 ? '' : 's'})</strong></summary>
                <ul>
                    ${tasks.map(t => `<li>[${t.completedAt}] ${t.text}</li>`).join('')}
                </ul>
            </details>
        `;
        historyContainer.innerHTML += dayHTML;
    });
}

// Carrega as tarefas salvas quando a página é aberta
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    displayHistory(); // Carrega e exibe o histórico
});
