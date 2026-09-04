// --- ESTADO & PERSISTÊNCIA ---
let state = JSON.parse(localStorage.getItem('mytasks_data')) || {
    projects: [],
    tasks: [],
    collapsedProjects: [], // IDs dos projetos recolhidos no accordion
    activeContext: { type: 'inbox', projectId: null },
    audioSettings: { focus: 'double-alarm', break: 'beep' }
};

if (!state.collapsedProjects) state.collapsedProjects = [];

let targetParentProjectId = null;
let editingTaskId = null;
const MAX_DEPTH = 3;

// PESOS DE PRIORIDADE PARA ORDENAÇÃO
const PRIORITY_WEIGHTS = { high: 3, medium: 2, low: 1 };

function cleanupOldCompletedTasks() {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    state.tasks = state.tasks.filter(t => !t.completed || !t.completedAt || (now - t.completedAt) < SEVEN_DAYS_MS);
}

// --- DOM ---
const projectsTreeEl = document.getElementById('projects-tree');
const tasksListEl = document.getElementById('tasks-list');
const historyListEl = document.getElementById('history-list');
const historyCountEl = document.getElementById('history-count');
const currentContextTitle = document.getElementById('current-context-title');
const countInboxEl = document.getElementById('count-inbox');
const countAllEl = document.getElementById('count-all');

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskPriority = document.getElementById('task-priority');

// Modais
const btnNewProject = document.getElementById('btn-new-project');
const projectModal = document.getElementById('project-modal');
const modalTitle = document.getElementById('modal-title');
const projectNameInput = document.getElementById('project-name-input');
const projectColorInput = document.getElementById('project-color-input');
const btnSaveProject = document.getElementById('btn-save-project');
const btnCancelProject = document.getElementById('btn-cancel-project');

const editTaskModal = document.getElementById('edit-task-modal');
const editTaskTextInput = document.getElementById('edit-task-text-input');
const editTaskPriorityInput = document.getElementById('edit-task-priority-input');
const btnSaveTaskEdit = document.getElementById('btn-save-task-edit');
const btnCancelTaskEdit = document.getElementById('btn-cancel-task-edit');

// Pomodoro
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

// --- ÁUDIO SINTETIZADO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (type === 'silent') return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'beep') {
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'double-alarm') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1046.50, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now); osc.stop(now + 0.35);
    } else if (type === 'zen') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.start(now); osc.stop(now + 1.5);
    }
}

// --- TIMER POMODORO ---
let timerInterval = null, timeLeft = 25 * 60, isFocusMode = true, targetTime = null;

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    timerDisplay.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

startBtn.onclick = () => {
    if (timerInterval) return;
    targetTime = Date.now() + timeLeft * 1000;
    startBtn.disabled = true; pauseBtn.disabled = false;

    timerInterval = setInterval(() => {
        timeLeft = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval); timerInterval = null;
            playSound(isFocusMode ? document.getElementById('sound-focus').value : document.getElementById('sound-break').value);
            isFocusMode = !isFocusMode;
            timeLeft = isFocusMode ? 25 * 60 : 5 * 60;
            updateTimerDisplay();
            startBtn.disabled = false; pauseBtn.disabled = true;
        }
    }, 250);
};

pauseBtn.onclick = () => { clearInterval(timerInterval); timerInterval = null; startBtn.disabled = false; pauseBtn.disabled = true; };
resetBtn.onclick = () => { clearInterval(timerInterval); timerInterval = null; isFocusMode = true; timeLeft = 25 * 60; updateTimerDisplay(); startBtn.disabled = false; pauseBtn.disabled = true; };

// --- SALVAR & RENDERIZAR ---
function saveData() {
    localStorage.setItem('mytasks_data', JSON.stringify(state));
    render();
}

function render() {
    cleanupOldCompletedTasks();
    updateCounts();
    renderSidebar();
    renderTasks();
    renderGlobalHistory();
}

// --- CONTADORES ---
function updateCounts() {
    const activeTasks = state.tasks.filter(t => !t.completed);
    countInboxEl.innerText = activeTasks.filter(t => !t.projectId).length;
    countAllEl.innerText = activeTasks.length;
}

function getProjectTaskCount(projectId) {
    const allIds = getAllSubProjectIds(projectId);
    return state.tasks.filter(t => !t.completed && allIds.includes(t.projectId)).length;
}

// --- SIDEBAR & ACCORDION ---
function renderSidebar() {
    projectsTreeEl.innerHTML = '';
    renderProjectTree(null, projectsTreeEl, 1);
}

function toggleCollapse(projectId, e) {
    e.stopPropagation();
    const idx = state.collapsedProjects.indexOf(projectId);
    if (idx > -1) state.collapsedProjects.splice(idx, 1);
    else state.collapsedProjects.push(projectId);
    saveData();
}

function renderProjectTree(parentId, container, depth) {
    const children = state.projects.filter(p => p.parentId === parentId);

    children.forEach(proj => {
        const itemContainer = document.createElement('div');
        const hasChildren = state.projects.some(p => p.parentId === proj.id);
        const isCollapsed = state.collapsedProjects.includes(proj.id);
        const isCurrentActive = state.activeContext.type === 'project' && state.activeContext.projectId === proj.id;
        const taskCount = getProjectTaskCount(proj.id);

        const row = document.createElement('div');
        row.className = `project-row ${isCurrentActive ? 'active' : ''}`;
        row.style.paddingLeft = `${8 + (depth - 1) * 10}px`;
        row.draggable = true;
        row.dataset.id = proj.id;

        row.onclick = () => setContext('project', proj.id);

        // Events Drag & Drop Projeto
        row.ondragstart = (e) => { e.dataTransfer.setData('text/plain', proj.id); row.classList.add('dragging'); };
        row.ondragend = () => row.classList.remove('dragging');
        row.ondragover = (e) => e.preventDefault();
        row.ondrop = (e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId !== proj.id) reorderProjects(draggedId, proj.id);
        };

        const toggleIcon = hasChildren ? (isCollapsed ? '▸' : '▾') : '•';

        row.innerHTML = `
            <button class="toggle-btn" onclick="toggleCollapse('${proj.id}', event)">${toggleIcon}</button>
            <span class="project-bullet" style="background-color: ${proj.color}"></span>
            <span class="project-name" ondblclick="event.stopPropagation(); editProject('${proj.id}')">${proj.name}</span>
            <span class="badge-count">${taskCount}</span>
            <div class="project-actions">
                <button class="btn-action" onclick="event.stopPropagation(); editProject('${proj.id}')">✏️</button>
                ${depth < MAX_DEPTH ? `<button class="btn-action" onclick="event.stopPropagation(); openNewProjectModal('${proj.id}')">+</button>` : ''}
                <button class="btn-action delete" onclick="event.stopPropagation(); closeProject('${proj.id}')">✕</button>
            </div>
        `;

        itemContainer.appendChild(row);
        container.appendChild(itemContainer);

        if (hasChildren && !isCollapsed) {
            renderProjectTree(proj.id, itemContainer, depth + 1);
        }
    });
}

function reorderProjects(draggedId, targetId) {
    const draggedIdx = state.projects.findIndex(p => p.id === draggedId);
    const targetIdx = state.projects.findIndex(p => p.id === targetId);
    if (draggedIdx > -1 && targetIdx > -1) {
        const [moved] = state.projects.splice(draggedIdx, 1);
        moved.parentId = state.projects[targetIdx]?.parentId || null;
        state.projects.splice(targetIdx, 0, moved);
        saveData();
    }
}

// --- CONTEXTO DE NAVEGAÇÃO ---
function setContext(type, projectId = null) {
    state.activeContext = { type, projectId };
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    if (type === 'inbox') {
        currentContextTitle.innerText = "📥 Caixa de Entrada";
        document.querySelector('[data-type="inbox"]').classList.add('active');
    } else if (type === 'all') {
        currentContextTitle.innerText = "🌐 Todas as Tarefas (Geral)";
        document.querySelector('[data-type="all"]').classList.add('active');
    } else {
        currentContextTitle.innerText = getBreadcrumbPath(projectId);
    }
    saveData();
}

function getBreadcrumbPath(projectId) {
    const path = [];
    let curr = state.projects.find(p => p.id === projectId);
    while (curr) { path.unshift(curr.name); curr = state.projects.find(p => p.id === curr.parentId); }
    return path.join(' > ');
}

// --- RENDERIZAÇÃO DE TAREFAS & ORDENAÇÃO ---
function renderTasks() {
    tasksListEl.innerHTML = '';
    const now = Date.now();
    const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
    let filteredTasks = [];

    if (state.activeContext.type === 'inbox') {
        filteredTasks = state.tasks.filter(t => !t.projectId);
    } else if (state.activeContext.type === 'all') {
        filteredTasks = [...state.tasks];
    } else if (state.activeContext.type === 'project') {
        const targetProjectIds = getAllSubProjectIds(state.activeContext.projectId);
        filteredTasks = state.tasks.filter(t => targetProjectIds.includes(t.projectId));
    }

    if (filteredTasks.length === 0) {
        tasksListEl.innerHTML = `<li style="color: #777; font-style: italic; padding: 10px;">Nenhuma tarefa encontrada.</li>`;
        return;
    }

    // ORDENAÇÃO: Concluídas ao final, ativas ordenadas por PRIORIDADE ALTA -> BAIXA
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
    });

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item prio-${task.priority} ${task.completed ? 'completed' : ''}`;
        li.draggable = true;

        // Borda Esquerda: Cor do Projeto
        if (task.projectId) {
            const proj = state.projects.find(p => p.id === task.projectId);
            if (proj) li.style.borderLeftColor = proj.color;
        }

        // Drag & Drop Tarefas
        li.ondragstart = () => { li.classList.add('dragging'); window.draggedTaskId = task.id; };
        li.ondragend = () => li.classList.remove('dragging');
        li.ondragover = (e) => e.preventDefault();
        li.ondrop = (e) => {
            e.preventDefault();
            reorderTasks(window.draggedTaskId, task.id);
        };

        const daysInactive = Math.floor((now - task.updatedAt) / (1000 * 60 * 60 * 24));
        const isStale = !task.completed && ((now - task.updatedAt) >= FIFTEEN_DAYS_MS);

        let completedBadge = task.completed && task.completedAt 
            ? `<span class="completed-date">✓ Concluída em ${new Date(task.completedAt).toLocaleDateString()}</span>` : '';

        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
                <span class="task-text" ondblclick="openEditTaskModal('${task.id}')">${task.text}</span>
                ${isStale ? `<span class="stale-badge">⚠️ ${daysInactive}d estagnada</span>` : ''}
            </div>
            ${completedBadge}
            <div class="task-actions-btn">
                <button class="btn-action" onclick="openEditTaskModal('${task.id}')">✏️</button>
                <button class="btn-delete" onclick="deleteTask('${task.id}')">✕</button>
            </div>
        `;
        tasksListEl.appendChild(li);
    });
}

function reorderTasks(draggedId, targetId) {
    const fromIdx = state.tasks.findIndex(t => t.id === draggedId);
    const toIdx = state.tasks.findIndex(t => t.id === targetId);
    if (fromIdx > -1 && toIdx > -1) {
        const [moved] = state.tasks.splice(fromIdx, 1);
        state.tasks.splice(toIdx, 0, moved);
        saveData();
    }
}

// --- HISTÓRICO GLOBAL (ÚLTIMOS 7 DIAS) ---
function renderGlobalHistory() {
    historyListEl.innerHTML = '';
    const completed = state.tasks.filter(t => t.completed && t.completedAt).sort((a, b) => b.completedAt - a.completedAt);
    historyCountEl.innerText = completed.length;

    completed.forEach(t => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `<span class="history-text" title="${t.text}">${t.text}</span><span>${new Date(t.completedAt).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}</span>`;
        historyListEl.appendChild(li);
    });
}

// --- ACOES DE TAREFA E MODAIS ---
taskForm.onsubmit = (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    const now = Date.now();
    state.tasks.unshift({
        id: 'task_' + now,
        projectId: state.activeContext.type === 'project' ? state.activeContext.projectId : null,
        text, priority: taskPriority.value, completed: false, createdAt: now, updatedAt: now, completedAt: null
    });
    taskInput.value = '';
    saveData();
};

function toggleTask(id) {
    const t = state.tasks.find(x => x.id === id);
    if (t) { t.completed = !t.completed; t.updatedAt = Date.now(); t.completedAt = t.completed ? Date.now() : null; saveData(); }
}

function openEditTaskModal(id) {
    const t = state.tasks.find(x => x.id === id);
    if (!t) return;
    editingTaskId = id; editTaskTextInput.value = t.text; editTaskPriorityInput.value = t.priority;
    editTaskModal.classList.remove('hidden');
}

btnCancelTaskEdit.onclick = () => editTaskModal.classList.add('hidden');
btnSaveTaskEdit.onclick = () => {
    const t = state.tasks.find(x => x.id === editingTaskId);
    if (t && editTaskTextInput.value.trim()) {
        t.text = editTaskTextInput.value.trim(); t.priority = editTaskPriorityInput.value; t.updatedAt = Date.now();
        editTaskModal.classList.add('hidden'); saveData();
    }
};

function deleteTask(id) { if (confirm("Excluir esta tarefa permanentemente?")) { state.tasks = state.tasks.filter(t => t.id !== id); saveData(); } }

// PROJETOS AUXILIARES
btnNewProject.onclick = () => openNewProjectModal(null);
function openNewProjectModal(parentId) {
    targetParentProjectId = parentId; projectNameInput.value = ''; projectModal.classList.remove('hidden');
}
btnCancelProject.onclick = () => projectModal.classList.add('hidden');
btnSaveProject.onclick = () => {
    if (projectNameInput.value.trim()) {
        state.projects.push({ id: 'proj_' + Date.now(), name: projectNameInput.value.trim(), color: projectColorInput.value, parentId: targetParentProjectId });
        projectModal.classList.add('hidden'); saveData();
    }
};

function editProject(id) {
    const p = state.projects.find(x => x.id === id);
    const n = prompt("Novo nome:", p?.name);
    if (n && n.trim()) { p.name = n.trim(); saveData(); }
}

function closeProject(id) {
    const all = getAllSubProjectIds(id);
    if (confirm("Encerrar este projeto e subprojetos vinculados?")) {
        state.projects = state.projects.filter(p => !all.includes(p.id));
        state.tasks = state.tasks.filter(t => !all.includes(t.projectId));
        setContext('inbox');
    }
}

function getAllSubProjectIds(id) {
    let ids = [id];
    state.projects.filter(p => p.parentId === id).forEach(c => ids = ids.concat(getAllSubProjectIds(c.id)));
    return ids;
}

// BOTÕES DE NAVEGAÇÃO FIXOS
document.querySelector('[data-type="inbox"]').onclick = () => setContext('inbox');
document.querySelector('[data-type="all"]').onclick = () => setContext('all');

// Renderização inicial
render();
