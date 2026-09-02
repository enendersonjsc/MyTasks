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
- **Histórico NATIVO (7 dias):** Tarefas concluídas continuam visíveis no projeto por até 7 dias (com texto tachado e badge `✓ Concluída em DD/MM/AAAA`). São excluídas automaticamente após esse prazo via `cleanupOldCompletedTasks()`.
- **Edição Completa de Tarefas:** Duplo clique (ou botão dedicado) deve permitir editar tanto o **texto** quanto o **nível de prioridade** (Baixa, Média, Alta) de qualquer tarefa ativa.
- **Alerta de Estagnação:** Se uma tarefa ativa ficar 15 dias sem edição/atualização (`updatedAt`), exibir o selo `⚠️ Xd estagnada`.

### 2. Árvore de Projetos e Subprojetos
- **Hierarquia:** Suporte para até 3 níveis de profundidade (Projeto Principal > Subprojeto > Sub-subprojeto).
- **Roll-up de Visualização:** Selecionar um projeto pai lista as tarefas dele e de todos os subprojetos descendentes.
- **Edição & Ações na Sidebar:**
  - `✏️` ou **Duplo clique no nome**: Renomear projeto ou subprojeto.
  - `+`: Criar subprojeto (respeitando o limite máximo de 3 níveis).
  - `✕`: Encerrar/excluir projeto, subprojetos vinculados e suas tarefas em cascata (com confirmação).

### 3. Widget Pomodoro & Áudio
- Sincronização via `Date.now()` para evitar atraso da contagem em abas em segundo plano.
- Sintetizador nativo via **Web Audio API** (sem dependência de áudio externo) suportando: *Beep*, *Alarme Duplo*, *Zen* e *Mudo*.

---

## 🚀 Próximas Melhorias / Ajustes Pendentes
1. [ ] **Correção do Favicon:** Verificar e corrigir a tag `<link rel="icon">` no `index.html` para voltar a carregar o `favicon.png`.
2. [ ] **Modal/Menu de Edição de Tarefas:** Expandir a edição para permitir trocar o texto e a prioridade da tarefa.
3. [ ] **Painel Global de Concluídas (7 dias):** Criar uma seção/widget compacto na tela mostrando todas as tarefas finalizadas nos últimos 7 dias de forma consolidada, independentemente do projeto ao qual pertencem.
