// --- ESTRUTURA DE DADOS E ESTADO INICIAL ---
let state = JSON.parse(localStorage.getItem('mytasks_data')) || {
    projects: [],
    tasks: [],
    activeContext: { type: 'inbox', projectId: null, subprojectId: null },
    audioSettings: { focus: 'double-alarm', break: 'beep' }
};

// --- ELEMENTOS DO DOM ---
const projectsListEl = document.getElementById('projects-list');
const tasksListEl = document.getElementById('tasks-list');
const currentContextTitle = document.getElementById('current-context-title');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskPriority = document.getElementById('task-priority');

// Elementos do Modal de Projetos
const btnNewProject = document.getElementById('btn-new-project');
const projectModal = document.getElementById('project-modal');
const projectNameInput = document.getElementById('project-name-input');
const projectColorInput = document.getElementById('project-color-input');
const btnSaveProject = document.getElementById('btn-save-project');
const btnCancelProject = document.getElementById('btn-cancel-project');

// Elementos do Pomodoro
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const soundFocusSelect = document.getElementById('sound-focus');
const soundBreakSelect = document.getElementById('sound-break');

// --- TAPE SINTETIZADOR DE ÁUDIO (Web Audio API) ---
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
        osc.frequency.setValueAtTime(1046.50, now); // C6
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

// Configurações de som e escuta de testes
soundFocusSelect.value = state.audioSettings?.focus || 'double-alarm';
soundBreakSelect.value = state.audioSettings?.break || 'beep';

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

// --- LÓGICA DO POMODORO (RESILIENTE A ABA EM SEGUNDO PLANO) ---
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
            
            // Toca som configurado
            playSound(isFocusMode ? soundFocusSelect.value : soundBreakSelect.value);

            // Alterna ciclo
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

// --- PERSISTÊNCIA & RENDERIZAÇÃO ---
function saveData() {
    localStorage.setItem('mytasks_data', JSON.stringify(state));
    render();
}

function render() {
    renderSidebar();
    renderTasks();
}

// --- SIDEBAR (PROJETOS & SUBPROJETOS) ---
function renderSidebar() {
    projectsListEl.innerHTML = '';

    state.projects.forEach(proj => {
        const projDiv = document.createElement('div');
        projDiv.className = 'project-group';

        const isProjActive = state.activeContext.type === 'project' && state.activeContext.projectId === proj.id && !state.activeContext.subprojectId;

        projDiv.innerHTML = `
            <div class="nav-item ${isProjActive ? 'active' : ''}" onclick="setContext('project', '${proj.id}')">
                <span class="project-bullet" style="background-color: ${proj.color}"></span>
                <span style="flex: 1;">${proj.name}</span>
                <button class="btn-icon" style="font-size:1rem;" onclick="event.stopPropagation(); promptAddSubproject('${proj.id}')" title="Novo Subprojeto">+</button>
            </div>
            <div class="subprojects-list">
                ${proj.subprojects.map(sub => {
                    const isSubActive = state.activeContext.type === 'project' && state.activeContext.subprojectId === sub.id;
                    return `
                        <div class="nav-item subproject-item ${isSubActive ? 'active' : ''}" onclick="setContext('project', '${proj.id}', '${sub.id}')">
                            <span>└ ${sub.name}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        projectsListEl.appendChild(projDiv);
    });
}

function setContext(type, projectId = null, subprojectId = null) {
    state.activeContext = { type, projectId, subprojectId };
    
    if (type === 'inbox') {
        currentContextTitle.innerText = "📥 Caixa de Entrada";
    } else {
        const proj = state.projects.find(p => p.id === projectId);
        if (subprojectId) {
            const sub = proj.subprojects.find(s => s.id === subprojectId);
            currentContextTitle.innerText = `${proj.name} > ${sub.name}`;
        } else {
            currentContextTitle.innerText = proj ? proj.name : "Projeto";
        }
    }
    
    document.querySelector('[data-type="inbox"]').classList.toggle('active', type === 'inbox');
    saveData();
}

// --- MODAL & GERENCIAMENTO DE PROJETOS ---
btnNewProject.onclick = () => projectModal.classList.remove('hidden');
btnCancelProject.onclick = () => projectModal.classList.add('hidden');

btnSaveProject.onclick = () => {
    const name = projectNameInput.value.trim();
    if (!name) return;

    state.projects.push({
        id: 'proj_' + Date.now(),
        name: name,
        color: projectColorInput.value,
        subprojects: []
    });

    projectNameInput.value = '';
    projectModal.classList.add('hidden');
    saveData();
};

function promptAddSubproject(projectId) {
    const subName = prompt("Nome do Subprojeto:");
    if (!subName) return;

    const proj = state.projects.find(p => p.id === projectId);
    if (proj) {
        proj.subprojects.push({
            id: 'sub_' + Date.now(),
            name: subName.trim()
        });
        saveData();
    }
}

// --- GERENCIAMENTO DE TAREFAS & ALERTA DE 15 DIAS ---
taskForm.onsubmit = (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;

    const now = Date.now();
    state.tasks.unshift({
        id: 'task_' + now,
        projectId: state.activeContext.type === 'project' ? state.activeContext.projectId : null,
        subprojectId: state.activeContext.type === 'project' ? state.activeContext.subprojectId : null,
        text: text,
        priority: taskPriority.value,
        completed: false,
        subtasks: [],
        createdAt: now,
        updatedAt: now // Data base do alerta de inatividade
    });

    taskInput.value = '';
    saveData();
};

function renderTasks() {
    tasksListEl.innerHTML = '';

    // Filtragem por Contexto
    const filteredTasks = state.tasks.filter(t => {
        if (state.activeContext.type === 'inbox') {
            return !t.projectId;
        }
        if (state.activeContext.subprojectId) {
            return t.subprojectId === state.activeContext.subprojectId;
        }
        return t.projectId === state.activeContext.projectId;
    });

    const now = Date.now();
    const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
        
        // Borda com a cor do Projeto
        if (task.projectId) {
            const proj = state.projects.find(p => p.id === task.projectId);
            if (proj) li.style.borderLeft = `5px solid ${proj.color}`;
        }

        // Cálculo de Inatividade para o Alerta (15+ dias sem edições)
        const daysInactive = Math.floor((now - task.updatedAt) / (1000 * 60 * 60 * 24));
        const isStale = !task.completed && ((now - task.updatedAt) >= FIFTEEN_DAYS_MS);

        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">
                <span class="task-text" ondblclick="editTask('${task.id}')">${task.text}</span>
                ${isStale ? `<span class="stale-badge" title="Sem edições há ${daysInactive} dias">⚠️ ${daysInactive} dias estagnada</span>` : ''}
            </div>
            <div class="task-actions">
                <button onclick="deleteTask('${task.id}')">X</button>
            </div>
        `;

        tasksListEl.appendChild(li);
    });
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.updatedAt = Date.now();
        saveData();
    }
}

function editTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    const newText = prompt("Editar tarefa:", task.text);
    if (newText !== null && newText.trim() !== "") {
        task.text = newText.trim();
        task.updatedAt = Date.now(); // Reseta o alerta de 15 dias ao editar
        saveData();
    }
}

function deleteTask(id) {
    if (confirm("Deseja excluir esta tarefa?")) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveData();
    }
}

// Evento da Caixa de Entrada
document.querySelector('[data-type="inbox"]').onclick = () => setContext('inbox');

// Inicialização Geral
render();
