/* --- MYTASKS LOGIC & STATE ENGINE --- */

const STATE_KEY = 'mytasks_state';

let state = {
    tasks: [],
    projects: [],
    expandedProjects: [],
    currentContext: 'inbox', // 'inbox', 'all', ou ID do projeto
    pomodoro: {
        mode: 'focus', // 'focus', 'short', 'long'
        timeLeft: 25 * 60,
        isRunning: false,
        lastTick: null,
        sound: 'beep'
    }
};

let pomoInterval = null;
let audioCtx = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    cleanupOldCompletedTasks();
    renderSidebar();
    renderTasks();
    initPomodoroDisplay();

    // Sincronização do input de cor Hex
    const colorInput = document.getElementById('project-color');
    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            document.getElementById('project-color-hex').innerText = e.target.value;
        });
    }
});

/* --- PERSISTÊNCIA --- */
function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadState() {
    const data = localStorage.getItem(STATE_KEY);
    if (data) {
        try {
            state = Object.assign(state, JSON.parse(data));
        } catch (e) {
            console.error("Erro ao carregar estado do localStorage", e);
        }
    }
}

/* --- LIMPEZA DE TAREFAS CONCLUÍDAS (> 7 DIAS) --- */
function cleanupOldCompletedTasks() {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    state.tasks = state.tasks.filter(task => {
        if (task.completed && task.completedAt) {
            return (now - task.completedAt) < SEVEN_DAYS_MS;
        }
        return true;
    });
    saveState();
}

/* --- GESTÃO DE CONTEXTO E NAVEGAÇÃO --- */
function switchContext(contextId) {
    state.currentContext = contextId;
    
    document.querySelectorAll('.nav-item, .tree-item').forEach(el => el.classList.remove('active'));
    
    if (contextId === 'inbox') {
        document.getElementById('nav-inbox').classList.add('active');
        document.getElementById('current-context-title').innerText = '📥 Caixa de Entrada';
        document.getElementById('current-context-subtitle').innerText = 'Tarefas sem projeto atribuído';
    } else if (contextId === 'all') {
        document.getElementById('nav-all').classList.add('active');
        document.getElementById('current-context-title').innerText = '🌐 Todas as Tarefas';
        document.getElementById('current-context-subtitle').innerText = 'Visão global das tarefas ativas';
    } else {
        const proj = state.projects.find(p => p.id === contextId);
        if (proj) {
            const elem = document.querySelector(`[data-project-id="${contextId}"]`);
            if (elem) elem.classList.add('active');
            document.getElementById('current-context-title').innerText = `📁 ${proj.name}`;
            document.getElementById('current-context-subtitle').innerText = `Tarefas do projeto e subprojetos`;
        }
    }

    renderTasks();
}

/* --- REGRAS DE ROLL-UP E PROJETOS --- */
function getProjectDescendants(projectId) {
    let ids = [projectId];
    const children = state.projects.filter(p => p.parentId === projectId);
    children.forEach(child => {
        ids = ids.concat(getProjectDescendants(child.id));
    });
    return ids;
}

function getProjectDepth(parentId) {
    let depth = 1;
    let curr = state.projects.find(p => p.id === parentId);
    while (curr) {
        depth++;
        curr = state.projects.find(p => p.id === curr.parentId);
    }
    return depth;
}

/* --- RENDERAÇÃO DA SIDEBAR E ÁRVORE --- */
function renderSidebar() {
    // Atualizar Contadores
    const activeTasks = state.tasks.filter(t => !t.completed && !t.hiddenFromView);
    
    document.getElementById('badge-inbox').innerText = activeTasks.filter(t => !t.projectId).length;
    document.getElementById('badge-all').innerText = activeTasks.length;

    const treeContainer = document.getElementById('projects-tree');
    treeContainer.innerHTML = '';

    const rootProjects = state.projects.filter(p => !p.parentId);
    rootProjects.forEach(proj => {
        treeContainer.appendChild(createProjectNode(proj, 0));
    });

    saveState();
}

function createProjectNode(project, depth) {
    const container = document.createElement('div');
    
    const children = state.projects.filter(p => p.parentId === project.id);
    const hasChildren = children.length > 0;
    const isExpanded = state.expandedProjects.includes(project.id);

    // Contagem Roll-up
    const projectFamily = getProjectDescendants(project.id);
    const count = state.tasks.filter(t => !t.completed && !t.hiddenFromView && projectFamily.includes(t.projectId)).length;

    const item = document.createElement('div');
    item.className = `tree-item tree-indent-${depth}`;
    if (state.currentContext === project.id) item.classList.add('active');
    item.setAttribute('data-project-id', project.id);
    item.onclick = (e) => {
        e.stopPropagation();
        switchContext(project.id);
    };
    item.ondblclick = (e) => {
        e.stopPropagation();
        openProjectModal(project.id);
    };

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.innerText = hasChildren ? (isExpanded ? '▾' : '▸') : '';
    toggle.onclick = (e) => {
        e.stopPropagation();
        toggleProjectAccordion(project.id);
    };

    const dot = document.createElement('span');
    dot.className = 'project-color-dot';
    dot.style.backgroundColor = project.color || '#3b82f6';

    const title = document.createElement('span');
    title.className = 'nav-title';
    title.innerText = project.name;

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.innerText = count;

    const actions = document.createElement('div');
    actions.className = 'tree-actions';
    
    if (depth < 2) { // Limite de 3 níveis (0, 1, 2)
        const addSubBtn = document.createElement('button');
        addSubBtn.className = 'btn-icon';
        addSubBtn.innerText = '+';
        addSubBtn.title = 'Criar Subprojeto';
        addSubBtn.onclick = (e) => {
            e.stopPropagation();
            openProjectModal(null, project.id);
        };
        actions.appendChild(addSubBtn);
    }

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.innerText = '✏️';
    editBtn.title = 'Editar Projeto';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        openProjectModal(project.id);
    };

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon';
    delBtn.innerText = '✕';
    delBtn.title = 'Excluir Projeto';
    delBtn.onclick = (e) => {
        e.stopPropagation();
        deleteProject(project.id);
    };

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    item.appendChild(toggle);
    item.appendChild(dot);
    item.appendChild(title);
    item.appendChild(badge);
    item.appendChild(actions);

    container.appendChild(item);

    if (hasChildren && isExpanded) {
        children.forEach(child => {
            container.appendChild(createProjectNode(child, depth + 1));
        });
    }

    return container;
}

function toggleProjectAccordion(projectId) {
    if (state.expandedProjects.includes(projectId)) {
        state.expandedProjects = state.expandedProjects.filter(id => id !== projectId);
    } else {
        state.expandedProjects.push(projectId);
    }
    renderSidebar();
}

/* --- GESTÃO DE PROJETOS (MODAL) --- */
function openProjectModal(editId = null, parentId = null) {
    const modal = document.getElementById('project-modal');
    const form = document.getElementById('project-form');
    
    form.reset();
    document.getElementById('project-edit-id').value = editId || '';
    document.getElementById('project-parent-id').value = parentId || '';

    if (editId) {
        const proj = state.projects.find(p => p.id === editId);
        if (proj) {
            document.getElementById('project-modal-title').innerText = 'Editar Projeto';
            document.getElementById('project-name').value = proj.name;
            document.getElementById('project-color').value = proj.color || '#3b82f6';
            document.getElementById('project-color-hex').innerText = proj.color || '#3b82f6';
        }
    } else {
        document.getElementById('project-modal-title').innerText = parentId ? 'Novo Subprojeto' : 'Novo Projeto';
        document.getElementById('project-color').value = '#3b82f6';
        document.getElementById('project-color-hex').innerText = '#3b82f6';
    }

    modal.classList.add('active');
}

function closeProjectModal() {
    document.getElementById('project-modal').classList.remove('active');
}

function handleSaveProject(e) {
    e.preventDefault();
    const editId = document.getElementById('project-edit-id').value;
    const parentId = document.getElementById('project-parent-id').value || null;
    const name = document.getElementById('project-name').value.trim();
    const color = document.getElementById('project-color').value;

    if (!name) return;

    if (editId) {
        const proj = state.projects.find(p => p.id === editId);
        if (proj) {
            proj.name = name;
            proj.color = color;
        }
    } else {
        if (parentId && getProjectDepth(parentId) >= 3) {
            alert('Limite máximo de 3 níveis de profundidade atingido.');
            return;
        }
        const newProj = {
            id: 'proj_' + Date.now(),
            name,
            color,
            parentId
        };
        state.projects.push(newProj);
        if (parentId && !state.expandedProjects.includes(parentId)) {
            state.expandedProjects.push(parentId);
        }
    }

    closeProjectModal();
    renderSidebar();
    renderTasks();
}

function deleteProject(projectId) {
    if (!confirm('Deseja excluir este projeto, todos os seus subprojetos e tarefas vinculadas?')) return;

    const family = getProjectDescendants(projectId);
    state.projects = state.projects.filter(p => !family.includes(p.id));
    state.tasks = state.tasks.filter(t => !family.includes(t.projectId));

    if (family.includes(state.currentContext)) {
        state.currentContext = 'inbox';
    }

    renderSidebar();
    renderTasks();
}

/* --- GESTÃO E ORDENAÇÃO DE TAREFAS --- */
function handleAddTask(e) {
    e.preventDefault();
    const textInput = document.getElementById('task-text');
    const prioritySelect = document.getElementById('task-priority');
    const dueDateInput = document.getElementById('task-due-date');

    const text = textInput.value.trim();
    if (!text) return;

    let targetProjectId = null;
    if (state.currentContext !== 'inbox' && state.currentContext !== 'all') {
        targetProjectId = state.currentContext;
    }

    const newTask = {
        id: 'task_' + Date.now(),
        text,
        priority: prioritySelect.value, // 'low', 'medium', 'high'
        dueDate: dueDateInput.value || null,
        projectId: targetProjectId,
        completed: false,
        completedAt: null,
        updatedAt: Date.now(),
        hiddenFromView: false
    };

    state.tasks.push(newTask);
    textInput.value = '';
    dueDateInput.value = '';

    renderSidebar();
    renderTasks();
}

function getFilteredTasks() {
    let filtered = state.tasks.filter(t => !t.completed && !t.hiddenFromView);

    if (state.currentContext === 'inbox') {
        filtered = filtered.filter(t => !t.projectId);
    } else if (state.currentContext !== 'all') {
        const family = getProjectDescendants(state.currentContext);
        filtered = filtered.filter(t => family.includes(t.projectId));
    }

    // Regra OBRIGATÓRIA de Ordenação por Prioridade: Alta -> Média -> Baixa
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return filtered;
}

function renderTasks() {
    const container = document.getElementById('active-tasks-list');
    container.innerHTML = '';

    const tasksToDisplay = getFilteredTasks();

    if (tasksToDisplay.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--text-muted);">Nenhuma tarefa pendente por aqui! ✨</div>`;
        return;
    }

    const now = new Date().setHours(0,0,0,0);
    const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

    tasksToDisplay.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority}`;

        // Lado Esquerdo: Cor do Projeto
        if (task.projectId) {
            const proj = state.projects.find(p => p.id === task.projectId);
            if (proj) {
                card.style.borderLeftColor = proj.color || '#3b82f6';
            }
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.onclick = () => toggleTaskComplete(task.id);

        const body = document.createElement('div');
        body.className = 'task-body';
        body.ondblclick = () => openTaskEditModal(task.id);

        const title = document.createElement('div');
        title.className = 'task-title';
        title.innerText = task.text;

        const meta = document.createElement('div');
        meta.className = 'task-meta';

        // Tag de Projeto
        if (task.projectId) {
            const proj = state.projects.find(p => p.id === task.projectId);
            if (proj) {
                const projTag = document.createElement('span');
                projTag.className = 'task-tag';
                projTag.innerText = `📁 ${proj.name}`;
                meta.appendChild(projTag);
            }
        }

        // Alertas de Vencimento e Estagnação
        if (task.dueDate) {
            const due = new Date(task.dueDate + 'T00:00:00').getTime();
            const dateStr = new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
            const dateTag = document.createElement('span');
            
            if (due < now) {
                dateTag.className = 'alert-tag';
                dateTag.innerText = `🚨 Vencida em ${dateStr}`;
            } else {
                dateTag.innerText = `📅 Limit: ${dateStr}`;
            }
            meta.appendChild(dateTag);
        } else {
            // Alerta de Estagnação (15 dias sem edição/prazo)
            const daysUnupdated = (Date.now() - (task.updatedAt || Date.now())) / (1000 * 60 * 60 * 24);
            if (daysUnupdated >= 15) {
                const stagTag = document.createElement('span');
                stagTag.className = 'warning-tag';
                stagTag.innerText = `⚠️ Estagnada há ${Math.floor(daysUnupdated)}d`;
                meta.appendChild(stagTag);
            }
        }

        body.appendChild(title);
        body.appendChild(meta);

        card.appendChild(checkbox);
        card.appendChild(body);

        container.appendChild(card);
    });

    saveState();
}

function toggleTaskComplete(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? Date.now() : null;
        task.updatedAt = Date.now();
        renderSidebar();
        renderTasks();
    }
}

/* --- LIMPEZA DE CONCLUÍDAS E HISTÓRICO --- */
function clearCompletedTasks() {
    let targets = state.tasks.filter(t => t.completed && !t.hiddenFromView);

    if (state.currentContext === 'inbox') {
        targets = targets.filter(t => !t.projectId);
    } else if (state.currentContext !== 'all') {
        const family = getProjectDescendants(state.currentContext);
        targets = targets.filter(t => family.includes(t.projectId));
    }

    targets.forEach(t => t.hiddenFromView = true);
    renderSidebar();
    renderTasks();
}

function toggleHistoryModal() {
    const modal = document.getElementById('history-modal');
    modal.classList.toggle('active');

    if (modal.classList.contains('active')) {
        const list = document.getElementById('history-tasks-list');
        list.innerHTML = '';

        const completedTasks = state.tasks.filter(t => t.completed);
        
        if (completedTasks.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted)">Nenhuma tarefa no histórico dos últimos 7 dias.</div>`;
            return;
        }

        completedTasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const dateStr = task.completedAt ? new Date(task.completedAt).toLocaleDateString('pt-BR') : '--';
            item.innerHTML = `
                <span>${task.text}</span>
                <span class="completed-date">✓ Concluída em ${dateStr}</span>
            `;
            list.appendChild(item);
        });
    }
}

/* --- EDIÇÃO COMPLETA DE TAREFAS --- */
function openTaskEditModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-text').value = task.text;
    document.getElementById('edit-task-priority').value = task.priority;
    document.getElementById('edit-task-due-date').value = task.dueDate || '';

    document.getElementById('task-edit-modal').classList.add('active');
}

function closeTaskEditModal() {
    document.getElementById('task-edit-modal').classList.remove('active');
}

function handleSaveTaskEdit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-task-id').value;
    const task = state.tasks.find(t => t.id === id);

    if (task) {
        task.text = document.getElementById('edit-task-text').value.trim();
        task.priority = document.getElementById('edit-task-priority').value;
        task.dueDate = document.getElementById('edit-task-due-date').value || null;
        task.updatedAt = Date.now();
        renderTasks();
    }

    closeTaskEditModal();
}

/* --- WIDGET POMODORO & SÍNTESE DE ÁUDIO WEB AUDIO API --- */
const POMO_TIMES = {
    focus: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
};

function initPomodoroDisplay() {
    document.getElementById('pomo-sound').value = state.pomodoro.sound || 'beep';
    updatePomoDisplay();
}

function setPomoMode(mode) {
    if (state.pomodoro.isRunning) togglePomodoro();
    state.pomodoro.mode = mode;
    state.pomodoro.timeLeft = POMO_TIMES[mode];
    
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`mode-${mode}`).classList.add('active');

    const titles = { focus: '⏱️ Foco', short: '☕ Pausa Curta', long: '🧘 Pausa Longa' };
    document.getElementById('pomo-mode-title').innerText = titles[mode];

    updatePomoDisplay();
}

function updatePomoDisplay() {
    const mins = Math.floor(state.pomodoro.timeLeft / 60).toString().padStart(2, '0');
    const secs = (state.pomodoro.timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('pomo-display').innerText = `${mins}:${secs}`;
}

function togglePomodoro() {
    const btn = document.getElementById('pomo-start-btn');
    if (state.pomodoro.isRunning) {
        clearInterval(pomoInterval);
        state.pomodoro.isRunning = false;
        btn.innerText = 'Iniciar';
    } else {
        state.pomodoro.isRunning = true;
        state.pomodoro.lastTick = Date.now();
        btn.innerText = 'Pausar';

        pomoInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - state.pomodoro.lastTick) / 1000);

            if (elapsed >= 1) {
                state.pomodoro.timeLeft -= elapsed;
                state.pomodoro.lastTick = now;

                if (state.pomodoro.timeLeft <= 0) {
                    state.pomodoro.timeLeft = 0;
                    clearInterval(pomoInterval);
                    state.pomodoro.isRunning = false;
                    btn.innerText = 'Iniciar';
                    playPomodoroSound();
                    alert('Sessão do Pomodoro Finalizada!');
                }
                updatePomoDisplay();
            }
        }, 500);
    }
}

function resetPomodoro() {
    if (state.pomodoro.isRunning) togglePomodoro();
    state.pomodoro.timeLeft = POMO_TIMES[state.pomodoro.mode];
    updatePomoDisplay();
}

function savePomoSettings() {
    state.pomodoro.sound = document.getElementById('pomo-sound').value;
    saveState();
}

/* Sintetizador de Som Nativo (Web Audio API) */
function playPomodoroSound() {
    const soundType = state.pomodoro.sound;
    if (soundType === 'mute') return;

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (soundType === 'beep') {
        playTone(440, 0.5, 'sine');
    } else if (soundType === 'double-alarm') {
        playTone(880, 0.2, 'square');
        setTimeout(() => playTone(880, 0.4, 'square'), 300);
    } else if (soundType === 'zen') {
        playTone(220, 1.5, 'triangle');
    }
}

function playTone(freq, duration, type) {
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.error("Erro ao emitir áudio:", e);
    }
}
