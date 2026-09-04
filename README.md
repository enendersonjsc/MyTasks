# MyTasks
Lista de tarefas simples e dinâmica

# 📌 Diretrizes e Especificações do Projeto — MyTasks

## 🎯 Arquitetura de Arquivos
- `index.html` — Estrutura HTML, formulários e modais
- `style.css` — Estilização visual (Tema Escuro / Dark Mode)
- `script.js` — Regras de negócio, Pomodoro e persistência em `localStorage`
- `favicon.png` — Ícone da aba do navegador (Revisar vínculo no `<head>` do `index.html`)
- `README.md` — Documentação oficial e especificação funcional do projeto

---

## 🛠️ Regras de Negócio OBRIGATÓRIAS (Não remover nas atualizações)

### 1. Gestão de Tarefas
- **Visão "Todas as Tarefas" (Geral):** Contexto global na barra lateral para visualizar todas as tarefas ativas do sistema consolidadas em um único lugar, independentemente de estarem na Caixa de Entrada ou vinculadas a projetos.
- **Histórico NATIVO (7 dias):** Tarefas concluídas continuam visíveis no projeto por até 7 dias (com texto tachado e badge `✓ Concluída em DD/MM/AAAA`). São excluídas automaticamente após esse prazo via `cleanupOldCompletedTasks()`.
- **Edição Completa de Tarefas:** Duplo clique (ou botão dedicado) permite editar tanto o **texto** quanto o **nível de prioridade** (Baixa, Média, Alta) de qualquer tarefa ativa.
- **Ordenação por Prioridade:** As tarefas ativas devem sempre ser exibidas na ordem de prioridade: **Alta ➔ Média ➔ Baixa**.
- **Alerta de Estagnação:** Se uma tarefa ativa ficar 15 dias sem edição/atualização (`updatedAt`), exibir o selo `⚠️ Xd estagnada`.

### 2. Identificação Visual de Cores (Lados Esquerdo e Direito)
- **Lado Esquerdo (Cor do Projeto):** Borda ou indicador à esquerda do card da tarefa com a cor definida para o projeto correspondente.
- **Lado Direito (Cor de Prioridade):** Borda ou indicador à direita do card marcando a urgência:
  - 🟢 **Verde:** Baixa Prioridade
  - 🟡 **Amarelo:** Média Prioridade
  - 🔴 **Vermelho:** Alta Prioridade

### 3. Árvore de Projetos, Contadores e Interatividade na Sidebar
- **Árvore Recolhível (Accordion):** Opção de alternar entre expandir e recolher (`▸` / `▾`) subprojetos na sidebar.
- **Contadores de Tarefas:** Exibir o número de tarefas pendentes ao lado da *Caixa de Entrada*, da opção *Todas as Tarefas* e de cada projeto/subprojeto na barra lateral.
- **Arrastar e Soltar (Drag and Drop):** Suporte nativo para reordenar dinamicamente tanto as tarefas na lista principal quanto a estrutura dos projetos/subprojetos na sidebar.
- **Hierarquia:** Suporte para até 3 níveis de profundidade (Projeto Principal > Subprojeto > Sub-subprojeto).
- **Roll-up de Visualização:** Selecionar um projeto pai lista as tarefas dele e de todos os subprojetos descendentes.
- **Edição & Ações na Sidebar:**
  - `✏️` ou **Duplo clique no nome**: Renomear projeto ou subprojeto.
  - `+`: Criar subprojeto (respeitando o limite máximo de 3 níveis).
  - `✕`: Encerrar/excluir projeto, subprojetos vinculados e suas tarefas em cascata (com confirmação).

### 4. Widget Pomodoro & Áudio
- Sincronização via `Date.now()` para evitar atraso da contagem em abas em segundo plano.
- Sintetizador nativo via **Web Audio API** (sem dependência de áudio externo) suportando: *Beep*, *Alarme Duplo*, *Zen* e *Mudo*.

---

## 🚀 Próximas Melhorias / Ajustes Pendentes
1. [ ] **Ajuste de Cores Duplas (Esquerda/Direita):** Aplicar borda esquerda com a cor do projeto e borda direita indicando a prioridade (Verde/Amarelo/Vermelho), ordenando da prioridade Alta para a Baixa.
2. [ ] **Aba "Todas as Tarefas":** Criar a opção no topo da sidebar para ver todo o inventário de tarefas do sistema.
3. [ ] **Contadores na Sidebar:** Injetar badges numéricas ao lado do nome da Caixa de Entrada e de cada projeto.
4. [ ] **Accordion na Árvore:** Adicionar os seletores de expansão/recolhimento dos subprojetos.
5. [ ] **Drag and Drop Geral:** Reimplementar a funcionalidade de arrastar tarefas e projetos.
6. [ ] **Painel Global de Concluídas (7 dias):** Manter o widget compacto na sidebar mostrando a contagem dos últimos 7 dias.
