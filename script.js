/**
 * MyTasks - Regras de Negócio & Persistência
 */

let state = {
    tasks: [],
    projects: [],
    currentView: 'all', // 'all', 'inbox', ou ID do projeto
    editingTaskId: null
};

// Pomodoro State
let pomodoro = {
    timeLeft: 1500, // 25 min
    isRunning: false,
    timerId: null,
    endTime: null,
    sound: 'beep'
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    loadLocalStorage();
    cleanupOldCompletedTasks();
    setupEventListeners();
    render();
});

function loadLocalStorage() {
    const savedState = localStorage.getItem('mytasks_state');
    if (savedState) {
        state = JSON.parse(savedState);
    } else {
        // Estrutura Inicial Padrão
        state.projects = [
            { id: 'p1', name: 'Trabalho', color: '#f75a68', parentId: null, expanded: true },
            { id: 'p2', name: 'Estudos', color: '#04d361', parentId: null, expanded: true }
        ];
        saveLocalStorage();
    }
}

function saveLocalStorage() {
    localStorage.setItem('mytasks_state', JSON.stringify(state));
}

// Expurgar do localStorage concluídas a mais de 7 dias
function cleanupOldCompletedTasks() {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    state.tasks = state.tasks.filter(task => {
        if (task.completed && task.completedAt) {
            return (now - new Date(task.completedAt).getTime()) < SEVEN_DAYS_MS;
        }
        return true;
    });
    saveLocalStorage();
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Navegação Sidebar
    document.getElementById('nav-all-tasks').addEventListener('click', () => switchView('all'));
    document.getElementById('nav-inbox').addEventListener('click', () => switchView('inbox'));
    document.getElementById('btn-add-project').addEventListener('click', createProject);

    // Formulário de Tarefa
    document.getElementById('add-task-form').addEventListener('submit', handleAddTask);
    
    // Limpar Concluídas (Ocultar da lista mantendo no histórico de 7 dias)
    document.getElementById('btn-clear-completed').addEventListener('click', handleClearCompleted);

    // Modal de Edição
    document.getElementById('btn-cancel-edit').addEventListener('click', closeModal);
    document.getElementById('btn-save-edit').addEventListener('click', handleSaveEdit);

    // Pomodoro
    document.getElementById('pomo-start-btn').addEventListener('click', togglePomodoro);
    document.getElementById('pomo-reset-btn').addEventListener('click', resetPomodoro);
    document.getElementById('pomo-sound-select').addEventListener('change', (e) => pomodoro.sound = e.target.value);
}

function switchView(view) {
    state.currentView = view;
    render();
}

// --- GESTÃO DE TAREFAS ---
function handleAddTask(e) {
    e.preventDefault();
    const textInput = document.getElementById('task-input-text');
    const dateInput = document.getElementById('task-input-date');
    const priorityInput = document.getElementById('task-input-priority');

    const newTask = {
        id: 't_' + Date.now(),
        text: textInput.value.trim(),
        projectId: (state.currentView === 'all') ? 'inbox' : state.currentView,
        priority: priorityInput.value, // 'high', 'medium', 'low'
        dueDate: dateInput.value || null,
        completed: false,
        hiddenFromList: false, // flag para a ação "Limpar Concluídas"
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null
    };

    state.tasks.push(newTask);
    saveLocalStorage();
    textInput.value = '';
    dateInput.value = '';
    render();
}

function toggleTaskComplete(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        task.updatedAt = new Date().toISOString();
        saveLocalStorage();
        render();
    }
}

function deleteTask(taskId) {
    if (confirm('Deseja excluir esta tarefa definitivamente?')) {
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        saveLocalStorage();
        render();
    }
}

// Limpar Concluídas: oculta da visualização sem apagar do histórico de 7 dias
function handleClearCompleted() {
    const activeViewTasks = getTasksForCurrentView();
    activeViewTasks.forEach(t => {
        if (t.completed) {
            t.hiddenFromList = true;
        }
    });
    saveLocalStorage();
    render();
}

// --- EDICÃO DE TAREFA ---
function openEditModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    state.editingTaskId = taskId;
    document.getElementById('edit-task-text').value = task.text;
    document.getElementById('edit-task-date').value = task.dueDate || '';
    document.getElementById('edit-task-priority').value = task.priority;
    
    document.getElementById('modal-edit-task').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-edit-task').classList.remove('active');
    state.editingTaskId = null;
}

function handleSaveEdit() {
    const task = state.tasks.find(t => t.id === state.editingTaskId);
    if (task) {
        task.text = document.getElementById('edit-task-text').value.trim();
        task.dueDate = document.getElementById('edit-task-date').value || null;
        task.priority = document.getElementById('edit-task-priority').value;
        task.updatedAt = new Date().toISOString();
        saveLocalStorage();
        render();
    }
    closeModal();
}

// --- GESTÃO DE PROJETOS & HIERARQUIA ---
function createProject(parentId = null) {
    const name = prompt('Nome do Projeto:');
    if (!name) return;

    // Verificar Limite de 3 Níveis
    if (parentId) {
        const depth = getProjectDepth(parentId);
        if (depth >= 3) {
            alert('Atingido o limite máximo de 3 níveis de profundidade!');
            return;
        }
    }

    const colors = ['#f75a68', '#fba94c', '#04d361', '#8257e5', '#12a454', '#00b4d8'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newProject = {
        id: 'p_' + Date.now(),
        name: name,
        color: randomColor,
        parentId: typeof parentId === 'string' ? parentId : null,
        expanded: true
    };

    state.projects.push(newProject);
    saveLocalStorage();
    render();
}

function getProjectDepth(projectId) {
    let depth = 1;
    let curr = state.projects.find(p => p.id === projectId);
    while (curr && curr.parentId) {
        depth++;
        curr = state.projects.find(p => p.id === curr.parentId);
    }
    return depth;
}

function deleteProject(projectId) {
    if (!confirm('Excluir este projeto, seus subprojetos e todas as tarefas vinculadas em cascata?')) return;

    // Coletar IDs em cascata
    const idsToDelete = [projectId];
    function collectSubIds(pId) {
        const subs = state.projects.filter(p => p.parentId === pId);
        subs.forEach(s => {
            idsToDelete.push(s.id);
            collectSubIds(s.id);
        });
    }
    collectSubIds(projectId);

    state.projects = state.projects.filter(p => !idsToDelete.includes(p.id));
    state.tasks = state.tasks.filter(t => !idsToDelete.includes(t.projectId));

    if (idsToDelete.includes(state.currentView)) {
        state.currentView = 'all';
    }

    saveLocalStorage();
    render();
}

function toggleAccordion(projectId, e) {
    e.stopPropagation();
    const proj = state.projects.find(p => p.id === projectId);
    if (proj) {
        proj.expanded = !proj.expanded;
        saveLocalStorage();
        render();
    }
}

// Obter IDs de projetos para Roll-up
function getProjectAndSubprojectIds(parentId) {
    let ids = [parentId];
    const subs = state.projects.filter(p => p.parentId === parentId);
    subs.forEach(s => {
        ids = ids.concat(getProjectAndSubprojectIds(s.id));
    });
    return ids;
}

// --- REGRAS DE RENDERIZAÇÃO & ORDENAÇÃO ---
function getTasksForCurrentView() {
    if (state.currentView === 'all') {
        return state.tasks;
    } else if (state.currentView === 'inbox') {
        return state.tasks.filter(t => t.projectId === 'inbox');
    } else {
        const projectIds = getProjectAndSubprojectIds(state.currentView);
        return state.tasks.filter(t => projectIds.includes(t.projectId));
    }
}

function render() {
    renderSidebar();
    renderTasks();
    renderHistory();
    updateBadges();
}

function updateBadges() {
    const activeTasks = state.tasks.filter(t => !t.completed);
    document.getElementById('badge-all').innerText = activeTasks.length;
    document.getElementById('badge-inbox').innerText = activeTasks.filter(t => t.projectId === 'inbox').length;
}

function renderSidebar() {
    const container = document.getElementById('projects-tree');
    container.innerHTML = '';

    // Renderizar projetos de nível raiz (parentId = null)
    const rootProjects = state.projects.filter(p => !p.parentId);
    rootProjects.forEach(proj => {
        container.appendChild(createProjectDOM(proj));
    });

    // Atualizar classe ativa nas navs padrão
    document.getElementById('nav-all-tasks').classList.toggle('active', state.currentView === 'all');
    document.getElementById('nav-inbox').classList.toggle('active', state.currentView === 'inbox');
}

function createProjectDOM(project) {
    const li = document.createElement('li');
    li.className = 'project-item';

    const subprojects = state.projects.filter(p => p.parentId === project.id);
    const hasSub = subprojects.length > 0;
    
    // Contagem de tarefas pendentes no projeto + subprojetos
    const projectIds = getProjectAndSubprojectIds(project.id);
    const pendingCount = state.tasks.filter(t => !t.completed && projectIds.includes(t.projectId)).length;

    const node = document.createElement('div');
    node.className = `project-node ${state.currentView === project.id ? 'active' : ''}`;
    node.onclick = () => switchView(project.id);
    node.ondblclick = () => {
        const newName = prompt('Renomear Projeto:', project.name);
        if (newName) { project.name = newName; saveLocalStorage(); render(); }
    };

    node.innerHTML = `
        ${hasSub ? `<button class="accordion-toggle">${project.expanded ? '▾' : '▸'}</button>` : '<span style="width:14px"></span>'}
        <span class="project-color-dot" style="background-color: ${project.color}"></span>
        <span class="project-title">${project.name}</span>
        <span class="badge">${pendingCount}</span>
        <div class="project-actions">
            <button title="Subprojeto" onclick="event.stopPropagation(); createProject('${project.id}')"><i class="fa-solid fa-plus"></i></button>
            <button title="Excluir" onclick="event.stopPropagation(); deleteProject('${project.id}')"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `;

    if (hasSub) {
        const toggleBtn = node.querySelector('.accordion-toggle');
        toggleBtn.onclick = (e) => toggleAccordion(project.id, e);
    }

    li.appendChild(node);

    if (hasSub) {
        const ulSub = document.createElement('ul');
        ulSub.className = `subprojects-list ${project.expanded ? 'expanded' : ''}`;
        subprojects.forEach(sub => {
            ulSub.appendChild(createProjectDOM(sub));
        });
        li.appendChild(ulSub);
    }

    return li;
}

function renderTasks() {
    const listContainer = document.getElementById('tasks-list');
    listContainer.innerHTML = '';

    // Atualizar Título da Visão
    const titleElem = document.getElementById('current-view-title');
    if (state.currentView === 'all') titleElem.innerText = 'Todas as Tarefas';
    else if (state.currentView === 'inbox') titleElem.innerText = 'Caixa de Entrada';
    else {
        const proj = state.projects.find(p => p.id === state.currentView);
        titleElem.innerText = proj ? proj.name : 'Projeto';
    }

    let viewTasks = getTasksForCurrentView();

    // Filtrar tarefas marcadas como ocultas via "Limpar Concluídas"
    viewTasks = viewTasks.filter(t => !t.hiddenFromList);

    // ORDENAÇÃO OBRIGATÓRIA: Prioridade Alta -> Média -> Baixa
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    viewTasks.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    viewTasks.forEach(task => {
        const card = document.createElement('li');
        card.className = `task-card priority-${task.priority}`;
        card.ondblclick = () => openEditModal(task.id);

        // Cor do Projeto na Borda Esquerda
        let projectColor = '#8d8d99'; // padrão caixa de entrada
        if (task.projectId !== 'inbox') {
            const p = state.projects.find(proj => proj.id === task.projectId);
            if (p) projectColor = p.color;
        }
        card.style.borderLeftColor = projectColor;

        // Cálculos de Alerta (Vencimento e Estagnação 15 dias)
        const now = new Date();
        let isOverdue = false;
        let isStagnant = false;
        let stagnantDays = 0;

        if (!task.completed) {
            if (task.dueDate) {
                const due = new Date(task.dueDate + 'T23:59:59');
                if (now > due) isOverdue = true;
            } else if (task.updatedAt) {
                const updated = new Date(task.updatedAt);
                const diffTime = Math.abs(now - updated);
                stagnantDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (stagnantDays >= 15) isStagnant = true;
            }
        }

        card.innerHTML = `
            <div class="task-main">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskComplete('${task.id}')">
                <span class="task-text" style="${task.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.text}</span>
                <div class="task-tags">
                    ${isOverdue ? `<span class="tag-alert"><i class="fa-solid fa-triangle-exclamation"></i> Vencida</span>` : ''}
                    ${isStagnant ? `<span class="tag-stagnant"><i class="fa-solid fa-clock"></i> ⚠️ ${stagnantDays}d estagnada</span>` : ''}
                    ${task.dueDate ? `<span class="tag-date"><i class="fa-regular fa-calendar"></i> ${formatDate(task.dueDate)}</span>` : ''}
                </div>
            </div>
            <div class="task-card-actions">
                <button title="Editar" onclick="openEditModal('${task.id}')"><i class="fa-solid fa-pen"></i></button>
                <button title="Excluir" onclick="deleteTask('${task.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        listContainer.appendChild(card);
    });
}

function renderHistory() {
    const historyContainer = document.getElementById('history-list');
    historyContainer.innerHTML = '';

    // Filtra concluídas nos últimos 7 dias
    const completedTasks = state.tasks.filter(t => t.completed && t.completedAt);
    document.getElementById('history-counter').innerText = completedTasks.length;

    completedTasks.sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt));

    completedTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span>✓ ${task.text}</span>
            <span class="history-date">${formatDate(task.completedAt)}</span>
        `;
        historyContainer.appendChild(li);
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
}

// --- WIDGET POMODORO & SINTETIZADOR DE ÁUDIO NATIVO ---
function togglePomodoro() {
    const btn = document.getElementById('pomo-start-btn');
    if (pomodoro.isRunning) {
        clearInterval(pomodoro.timerId);
        pomodoro.isRunning = false;
        btn.innerHTML = '<i class="fa-solid fa-play"></i>';
    } else {
        pomodoro.isRunning = true;
        btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        pomodoro.endTime = Date.now() + (pomodoro.timeLeft * 1000);
        
        pomodoro.timerId = setInterval(() => {
            const secondsLeft = Math.round((pomodoro.endTime - Date.now()) / 1000);
            if (secondsLeft <= 0) {
                clearInterval(pomodoro.timerId);
                pomodoro.timeLeft = 0;
                updatePomoDisplay();
                triggerPomoAudio();
                alert('Sessão do Pomodoro encerrada!');
                resetPomodoro();
            } else {
                pomodoro.timeLeft = secondsLeft;
                updatePomoDisplay();
            }
        }, 500);
    }
}

function resetPomodoro() {
    clearInterval(pomodoro.timerId);
    pomodoro.isRunning = false;
    pomodoro.timeLeft = 1500;
    document.getElementById('pomo-start-btn').innerHTML = '<i class="fa-solid fa-play"></i>';
    updatePomoDisplay();
}

function updatePomoDisplay() {
    const minutes = Math.floor(pomodoro.timeLeft / 60);
    const seconds = pomodoro.timeLeft % 60;
    document.getElementById('pomo-timer').innerText = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Web Audio API Sintetizado
function triggerPomoAudio() {
    if (pomodoro.sound === 'mute') return;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (pomodoro.sound === 'beep') {
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (pomodoro.sound === 'alarm') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } else if (pomodoro.sound === 'zen') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(432, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
    }
}
