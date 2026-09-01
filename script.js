// --- ESTADO INICIAL & PERSISTÊNCIA ---
let state = JSON.parse(localStorage.getItem('mytasks_data')) || {
    projects: [],
    tasks: [],
    activeContext: { type: 'inbox', projectId: null },
    audioSettings: { focus: 'double-alarm', break: 'beep' }
};

let targetParentProjectId = null;
const MAX_DEPTH = 3;

// LIMPEZA AUTOMÁTICA EM SEGUNDO PLANO (REMOVE CONCLUÍDAS COM MAIS DE 7 DIAS)
function cleanupOldCompletedTasks() {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    state.tasks = state.tasks.filter(t => {
        if (t.completed && t.completedAt) {
            return (now - t.completedAt) < SEVEN_DAYS_MS;
        }
        return true;
    });
}

// --- ELEMENTOS DO DOM ---
const projectsTreeEl = document.getElementById('projects-tree');
const tasksListEl = document.getElementById('tasks-list');
const currentContextTitle = document.getElementById('current-context-title');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskPriority = document.getElementById('task-priority');

// Modal
const btnNewProject = document.getElementById('btn-new-project');
const projectModal = document.getElementById('project-modal');
const modalTitle = document.getElementById('modal-title');
const projectNameInput = document.getElementById('project-name-input');
const projectColorInput = document.getElementById('project-color-input');
const btnSaveProject = document.getElementById('btn-save-project');
const btnCancelProject = document.getElementById('btn-cancel-project');

// Pomodoro
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const soundFocusSelect = document.getElementById('sound-focus');
soundFocusSelect.value = state.audioSettings?.focus || 'double-alarm';
const soundBreakSelect = document.getElementById('sound-break');
soundBreakSelect.value = state.audioSettings?.break || 'beep';

// --- SINTETIZADOR DE ÁUDIO ---
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
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'double-alarm') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1046.50, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.setValueAtTime(0.01, now + 0.1);
        gain.gain.setValueAtTime(0.2, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
    } else if (type === 'zen') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.start(now);
        osc.stop(now + 1.5);
    }
}

soundFocusSelect.onchange = (e) => {
    state.audioSettings.focus = e.target.value;
    playSound(e.target.value);
    saveData();
};

soundBreakSelect.onchange = (e) => {
    state.audioSettings.break = e.target.value;
    playSound(e.target.value);
    saveData();
};

// --- POMODORO TIMER ---
let timerInterval = null;
let timeLeft = 25 * 60;
let isFocusMode = true;
let targetTime = null;

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

startBtn.onclick = () => {
    if (timerInterval) return;
    targetTime = Date.now() + timeLeft * 1000;
    startBtn.disabled = true;
    pauseBtn.disabled = false;

    timerInterval = setInterval(() => {
        const now = Date.now();
        timeLeft = Math.max(0, Math.round((targetTime - now) / 1000));
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            playSound(isFocusMode ? soundFocusSelect.value : soundBreakSelect.value);
            isFocusMode = !isFocusMode;
            timeLeft = isFocusMode ? 25 * 60 : 5 * 60;
            updateTimerDisplay();
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            alert(isFocusMode ? "Pausa encerrada! Hora de focar." : "Ciclo de foco finalizado! Hora de descansar.");
        }
    }, 250);
};

pauseBtn.onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
};

resetBtn.onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    isFocusMode = true;
    timeLeft = 25 * 60;
    updateTimerDisplay();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
};

// --- SALVAR E RENDERIZAR ---
function saveData() {
    localStorage.setItem('mytasks_data', JSON.stringify(state));
    render();
}

function render() {
    cleanupOldCompletedTasks();
    renderSidebar();
    renderTasks();
}

// --- SIDEBAR E ESTRUTURA DE PROJETOS ---
function renderSidebar() {
    projectsTreeEl.innerHTML = '';
    renderProjectTree(null, projectsTreeEl, 1);
}

function renderProjectTree(parentId, container, depth) {
    const children = state.projects.filter(p => p.parentId === parentId);

    children.forEach(proj => {
        const itemContainer = document.createElement('div');
        
        const isCurrentActive = state.activeContext.type === 'project' && state.activeContext.projectId === proj.id;
        const indentPadding = (depth - 1) * 12;

        const row = document.createElement('div');
        row.className = `project-row ${isCurrentActive ? 'active' : ''}`;
        row.style.paddingLeft = `${8 + indentPadding}px`;
        row.onclick = () => setContext('project', proj.id);

        const canHaveSubprojects = depth < MAX_DEPTH;

        row.innerHTML = `
            <span class="project-bullet" style="background-color: ${proj.color}"></span>
            <span class="project-name" ondblclick="event.stopPropagation(); editProject('${proj.id}')" title="Duplo clique para renomear">${proj.name}</span>
            <div class="project-actions">
                <button class="btn-action" onclick="event.stopPropagation(); editProject('${proj.id}')" title="Renomear Projeto">✏️</button>
                ${canHaveSubprojects ? `<button class="btn-action" onclick="event.stopPropagation(); openNewProjectModal('${proj.id}')" title="Adicionar Subprojeto">+</button>` : ''}
                <button class="btn-action delete" onclick="event.stopPropagation(); closeProject('${proj.id}')" title="Encerrar Projeto">✕</button>
            </div>
        `;

        itemContainer.appendChild(row);
        container.appendChild(itemContainer);

        renderProjectTree(proj.id, itemContainer, depth + 1);
    });
}

// RENOMEAR PROJETO OU SUBPROJETO
function editProject(projectId) {
    const proj = state.projects.find(p => p.id === projectId);
    if (!proj) return;

    const newName = prompt("Editar nome do projeto:", proj.name);
    if (newName !== null && newName.trim() !== "") {
        proj.name = newName.trim();
        saveData();
    }
}

// ENCERRAR/EXCLUIR PROJETO EM CASCATA
function closeProject(projectId) {
    const proj = state.projects.find(p => p.id === projectId);
    if (!proj) return;

    const allRelatedProjectIds = getAllSubProjectIds(projectId);
    
    if (confirm(`Deseja encerrar o projeto "${proj.name}"?\nIsso excluirá o projeto, seus subprojetos e todas as tarefas vinculadas.`)) {
        state.projects = state.projects.filter(p => !allRelatedProjectIds.includes(p.id));
        state.tasks = state.tasks.filter(t => !allRelatedProjectIds.includes(t.projectId));

        if (state.activeContext.type === 'project' && allRelatedProjectIds.includes(state.activeContext.projectId)) {
            setContext('inbox');
        } else {
            saveData();
        }
    }
}

function getBreadcrumbPath(projectId) {
    const path = [];
    let curr = state.projects.find(p => p.id === projectId);
    while (curr) {
        path.unshift(curr.name);
        curr = state.projects.find(p => p.id === curr.parentId);
    }
    return path.join(' > ');
}

function setContext(type, projectId = null) {
    state.activeContext = { type, projectId };
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    if (type === 'inbox') {
        currentContextTitle.innerText = "📥 Caixa de Entrada";
        document.querySelector('[data-type="inbox"]').classList.add('active');
    } else {
        currentContextTitle.innerText = getBreadcrumbPath(projectId) || "Projeto";
    }
    
    saveData();
}

// --- MODAL DE PROJETOS ---
btnNewProject.onclick = () => openNewProjectModal(null);

function openNewProjectModal(parentId = null) {
    targetParentProjectId = parentId;
    projectNameInput.value = '';
    
    if (parentId) {
        const parentProj = state.projects.find(p => p.id === parentId);
        modalTitle.innerText = `Subprojeto de "${parentProj.name}"`;
        projectColorInput.value = parentProj ? parentProj.color : '#3498db';
    } else {
        modalTitle.innerText = "Novo Projeto Principal";
        projectColorInput.value = '#3498db';
    }
    
    projectModal.classList.remove('hidden');
}

btnCancelProject.onclick = () => projectModal.classList.add('hidden');

btnSaveProject.onclick = () => {
    const name = projectNameInput.value.trim();
    if (!name) return;

    state.projects.push({
        id: 'proj_' + Date.now(),
        name: name,
        color: projectColorInput.value,
        parentId: targetParentProjectId
    });

    projectModal.classList.add('hidden');
    saveData();
};

// OBTÊM SUBPROJETOS (ROLL-UP)
function getAllSubProjectIds(projectId) {
    let ids = [projectId];
    const children = state.projects.filter(p => p.parentId === projectId);
    children.forEach(child => {
        ids = ids.concat(getAllSubProjectIds(child.id));
    });
    return ids;
}

// --- GERENCIAMENTO DE TAREFAS ---
taskForm.onsubmit = (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;

    const now = Date.now();
    state.tasks.unshift({
        id: 'task_' + now,
        projectId: state.activeContext.type === 'project' ? state.activeContext.projectId : null,
        text: text,
        priority: taskPriority.value,
        completed: false,
        createdAt: now,
        updatedAt: now,
        completedAt: null
    });

    taskInput.value = '';
    saveData();
};

function renderTasks() {
    tasksListEl.innerHTML = '';
    const now = Date.now();
    const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

    let filteredTasks = [];

    if (state.activeContext.type === 'inbox') {
        filteredTasks = state.tasks.filter(t => !t.projectId);
    } else if (state.activeContext.type === 'project') {
        const targetProjectIds = getAllSubProjectIds(state.activeContext.projectId);
        filteredTasks = state.tasks.filter(t => targetProjectIds.includes(t.projectId));
    }

    if (filteredTasks.length === 0) {
        tasksListEl.innerHTML = `<li style="color: #777; font-style: italic; padding: 10px;">Nenhuma tarefa encontrada neste contexto.</li>`;
        return;
    }

    filteredTasks.sort((a, b) => a.completed - b.completed);

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
        
        if (task.projectId) {
            const proj = state.projects.find(p => p.id === task.projectId);
            if (proj) li.style.borderLeft = `5px solid ${proj.color}`;
        }

        const daysInactive = Math.floor((now - task.updatedAt) / (1000 * 60 * 60 * 24));
        const isStale = !task.completed && ((now - task.updatedAt) >= FIFTEEN_DAYS_MS);

        let completedBadge = '';
        if (task.completed && task.completedAt) {
            const dateObj = new Date(task.completedAt);
            completedBadge = `<span class="completed-date">✓ Concluída em ${dateObj.toLocaleDateString()}</span>`;
        }

        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
                <span class="task-text" ondblclick="editTask('${task.id}')">${task.text}</span>
                ${isStale ? `<span class="stale-badge" title="Sem edições há ${daysInactive} dias">⚠️ ${daysInactive}d estagnada</span>` : ''}
            </div>
            ${completedBadge}
            <button class="btn-delete" onclick="deleteTask('${task.id}')" title="Excluir permanentemente">✕</button>
        `;

        tasksListEl.appendChild(li);
    });
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.updatedAt = Date.now();
        task.completedAt = task.completed ? Date.now() : null;
        saveData();
    }
}

function editTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    const newText = prompt("Editar tarefa:", task.text);
    if (newText !== null && newText.trim() !== "") {
        task.text = newText.trim();
        task.updatedAt = Date.now();
        saveData();
    }
}

function deleteTask(id) {
    if (confirm("Deseja excluir permanentemente esta tarefa?")) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveData();
    }
}

// --- NAVEGAÇÃO ---
document.querySelector('[data-type="inbox"]').onclick = () => setContext('inbox');

// Renderização Inicial
render();
