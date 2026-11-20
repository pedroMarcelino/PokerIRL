# Índice da documentação

> Última atualização: 2026-11-20 · Status: backend em implementação

| Arquivo | Conteúdo |
| --- | --- |
| [00-visao-geral.md](00-visao-geral.md) | O que é o produto, escopo atual e fora de escopo |
| [01-regras-de-negocio.md](01-regras-de-negocio.md) | Regras da sala, do dealer, das apostas e do fechamento da rodada |
| [02-arquitetura.md](02-arquitetura.md) | Monorepo, stack, camadas e tempo real |
| [03-modelo-de-dados.md](03-modelo-de-dados.md) | Entidades, campos e invariantes |
| [04-api-e-eventos.md](04-api-e-eventos.md) | Contrato HTTP + eventos WebSocket (fonte da verdade da API) |
| [05-fluxos.md](05-fluxos.md) | Diagramas dos fluxos principais |
| [06-colinha-poker.md](06-colinha-poker.md) | Ordem de força das mãos exibida na tela |
| [07-decisoes.md](07-decisoes.md) | Decisões tomadas e por quê |
| [08-roadmap.md](08-roadmap.md) | Etapas, checkpoints de revisão e progresso |

## Memória rápida do projeto

- Projeto: **porkerIRL** (pasta raiz `porkerirl`).
- Poker com **cartas 100% físicas**; o sistema só lida com fichas.
- **Dealer** cria a sala, define o valor inicial igual para todos, joga também e é identificado com 👑.
- Jogadores entram por **código de 6 dígitos / QR code** e informam um **nome**.
- Cada um aposta pelo **próprio celular**; o sistema mostra saldo, apostas, pote e valor da rodada.
- Fim da rodada: o dealer escolhe o vencedor e o **pote vai para ele**.
- Stack: monorepo (npm workspaces), React no front, Node + Fastify + MongoDB + WebSocket no back.
- Ritmo: implementar devagar, com pausa para revisão em cada etapa. Começamos pelo backend.
