// Constante para 15 dias em milissegundos
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

// Função principal para adicionar uma nova tarefa
function addTask() {
    const input = document.getElementById('task-input');
    const prioritySelect = document.getElementById('priority-select');
    const taskText = input.value.trim();
    const priority = prioritySelect.value;
    
    // Duas datas: uma para exibição (PT-BR) e outra para cálculo (ISO)
    const dateDisplay = new Date().toLocaleDateString('pt-BR');
    const dateAdded = new Date().toISOString(); 

    if (taskText === '') {
        alert('Por favor, digite uma tarefa.');
        return;
    }

    // Cria o objeto da tarefa
    const task = {
        text: taskText,
        priority: priority,
        dateDisplay: dateDisplay, 
        dateAdded: dateAdded, // Novo campo para o alerta de 15 dias
        completed: false
    };

    // Adiciona a tarefa ao Local Storage (para que persista)
    let tasks = getTasksFromStorage();
    tasks.push(task);
    saveTasksToStorage(tasks);

    // Limpa o input
    input.value = '';

    // Renderiza a lista novamente com a nova tarefa na posição correta
    renderTasks();
}

// Função para obter tarefas do Local Storage
function getTasksFromStorage() {
    const tasksJson = localStorage.getItem('todoTasks');
    return tasksJson ? JSON.parse(tasksJson) : [];
}

// Função para salvar tarefas no Local Storage
function saveTasksToStorage(tasks) {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

// Função para renderizar (desenhar) a lista de tarefas
function renderTasks() {
    const taskList = document.getElementById('task-list');
    let tasks = getTasksFromStorage();

    // 1. Classificação das Tarefas: Alta > Média > Baixa. Concluídas por último.
    const priorityOrder = { 'alta': 3, 'media': 2, 'baixa': 1 };

    tasks.sort((a, b) => {
        // Coloca concluídas por último
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // Se não forem concluídas, classifica por prioridade
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    taskList.innerHTML = ''; // Limpa a lista existente

    tasks.forEach((task, index) => {
        // Correção de compatibilidade: trata tarefas antigas que só têm o campo 'date'
        const dateStringForCalculation = task.dateAdded || task.date;
        const dateStringToDisplay = task.dateDisplay || task.date;
        let alertSymbol = '';

        // Lógica do ALERTA ⚠️: Se não estiver concluída E tiver dados de data para cálculo
        if (!task.completed && dateStringForCalculation) {
            try {
                const taskTime = new Date(dateStringForCalculation).getTime();
                const currentTime = new Date().getTime();
                
                // Se a diferença de tempo for maior que 15 dias
                if (currentTime - taskTime > FIFTEEN_DAYS_MS) {
                    alertSymbol = ' ⚠️';
                }
            } catch (e) {
                // Em caso de erro de parsing da data, apenas ignora o alerta
            }
        }
        
        // Define as classes de cor e estado
        let classList = `task-item task-${task.priority}`;
        if (task.completed) {
            classList += ' task-completed';
        }
        
        const li = document.createElement('li');
        li.className = classList;

        // Conteúdo da tarefa
        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onclick="toggleComplete(${index})">
                <span class="task-date">(${dateStringToDisplay})</span>
                <span>${task.text}${alertSymbol}</span>
            </div>
            <button class="delete-btn" onclick="deleteTask(${index})">X</button>
        `;

        taskList.appendChild(li);
    });

    saveTasksToStorage(tasks); // Salva a lista reordenada
}

// Funções toggleComplete e deleteTask permanecem as mesmas
function toggleComplete(index) {
    let tasks = getTasksFromStorage();
    tasks[index].completed = !tasks[index].completed;
    saveTasksToStorage(tasks);
    renderTasks(); // Re-renderiza para aplicar a cor cinza e reordenar
}

function deleteTask(index) {
    if (confirm('Tem certeza de que deseja excluir esta tarefa?')) {
        let tasks = getTasksFromStorage();
        tasks.splice(index, 1); // Remove 1 item a partir do índice
        saveTasksToStorage(tasks);
        renderTasks();
    }
}

// Carrega as tarefas salvas quando a página é aberta
document.addEventListener('DOMContentLoaded', renderTasks);
