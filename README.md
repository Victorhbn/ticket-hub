# Ticket Hub

Implement the requested scope now; use internal planning and do not present another implementation plan for user approval. Enable Lovable Cloud for authentication with role-based access, database persistence, and file storage for screenshot attachments.

User Request:
"Preciso de um sistema de abertura de chamados, onde cada usuario que abre o chamado pode verificar o status do chamado e os comentarios, os camados abertos, aparecem para os usuarios que tem o papel equipe tecnica os veem em um kanban e os usuarios com os demais tipos veem apenas seus proprios chamados, o sistema deve ter um dashboard para o usuario tipo admin verificar o desempenho, chamados e etc.. da equipe tecnica. o formulario deve permitir incluir arquivos que serão capituras de tela, descricação do problema,  seleção do sistema em um campo de caixa select e permitir inclusão de novos sistemas no proprio formulario."

Key requirements:
1. Roles & Permissions:
   - Admin: access to performance dashboard (resolution time, volume by system/agent, team metrics), user management, and all tickets.
   - Equipe Técnica: Kanban board view of all tickets categorized by status (e.g., Aberto, Em Atendimento, Pendente, Resolvido), detail modal with comment thread, status updating, and file attachments.
   - Usuário Comum (Solicitante): view and track only their own tickets, with full comment history and status timeline.
   - Provide an easy role switcher or profile selector in the header to facilitate testing each perspective.
2. Ticket Creation Form:
   - System selection via select dropdown, with an inline option/modal to register and select a new system on the fly.
   - Problem description with rich details.
   - File/screenshot upload with visual preview.
   - Priority selector (Baixa, Média, Alta, Crítica).
3. Comments & Interaction:
   - Real-time or persistent comment thread on each ticket between the requester and technical team.
4. Admin Dashboard:
   - Visual charts and cards showing ticket volume, resolution rates, performance by technician, and system breakdown.
5. Language & Interface:
   - Brazilian Portuguese (PT-BR) UI with modern, clean styling.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a52d485f-1c8a-4fc9-a3a4-3fe95d555ac5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
