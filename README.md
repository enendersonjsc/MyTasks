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

### 1. Gestão de Tarefas, Prazos e Alertas
- **Visão "Todas as Tarefas" (Geral):** Contexto global na barra lateral para visualizar todas as tarefas ativas do sistema consolidadas em um único lugar, independentemente de estarem na Caixa de Entrada ou vinculadas a projetos.
- **Data Limite de Entrega (Due Dates):** Campo opcional ao criar/editar uma tarefa para definir a data limite de conclusão.
- **Alertas de Vencimento e Estagnação:**
  - **Tarefa Vencida:** Dispara alerta visual no card (ex: `🚨 Vencida em DD/MM/AAAA`) e notificação no sistema quando a data limite for atingida ou ultrapassada.
  - **Tarefa Estagnada (15 dias sem prazo):** Se uma tarefa não possuir data limite configurada e ficar mais de 15 dias sem edição/atualização (`updatedAt`), ela receberá o mesmo alerta de atenção que as tarefas vencidas (`⚠️ Estagnada há Xd`).
- **Limpeza de Concluídas Preservando Histórico (7 dias):** Ação de "Limpar Concluídas" oculta/remove as tarefas finalizadas da visualização do contexto atual (Caixa de Entrada, Projeto ou Geral), mas **mantém os dados salvos** no sistema para alimentar o histórico compacto dos últimos 7 dias. A remoção definitiva do `localStorage` ocorre exclusivamente após 7 dias via `cleanupOldCompletedTasks()`.
- **Histórico NATIVO (7 dias):** Tarefas concluídas alimentam o painel de histórico por até 7 dias (exibindo `✓ Concluída em DD/MM/AAAA`). São excluídas do armazenamento automaticamente após esse prazo.
- **Edição Completa de Tarefas:** Duplo clique (ou botão dedicado) permite editar o **texto**, a **prioridade** (Baixa, Média, Alta) e a **data de vencimento** de qualquer tarefa ativa.
- **Ordenação por Prioridade:** As tarefas ativas devem sempre ser exibidas na ordem de prioridade: **Alta ➔ Média ➔ Baixa**.

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

## 🚀 Próximas Melhorias Futuras
1. [ ] **Barra de Pesquisa e Filtros Rápidos:** Buscar palavras-chave e filtrar por prioridade em tempo real.
2. [ ] **Backup em JSON (Exportar/Importar):** Permitir o salvamento de uma cópia dos dados locais para arquivo externo e recuperação.
3. [ ] **Alternador de Tema (Dark / Light):** Suporte para alternar entre modo escuro e claro no cabeçalho.
4. [ ] **Atalhos de Teclado:** Ações rápidas para navegação, criação de tarefas e controle do Pomodoro.
5. [ ] **Dashboard de Produtividade:** Métricas completas com contagem de sessões de Pomodoro, gráficos de tarefas concluídas e relatórios por projeto.
