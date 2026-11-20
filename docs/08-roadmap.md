# 08 — Roadmap

> Status: em execução · Última atualização: 2026-11-20
>
> Cada item marcado com 🔍 é um checkpoint: parar, mostrar o que foi feito e esperar revisão.

## Fase 1 — Backend (implementado, aguardando revisão)

- [x] Documentação inicial (`docs/`)
- [x] Esqueleto do monorepo e pacote compartilhado 🔍
- [x] Contrato HTTP/WebSocket em `04-api-e-eventos.md`
- [x] Servidor: criar sala, entrar, listar estado
- [x] Servidor: apostas com valor inteiro positivo e histórico
- [x] Servidor: modos `turn` (aposta mínima) e `free` + compatibilidade com salas antigas
- [x] Servidor: ordem de jogo editável só pelo dealer, com validação e broadcast
- [x] Servidor: fechar rodada escolhendo vencedor
- [x] Testes automatizados das regras de negócio
- [x] `.env` conferido: driver Mongo e carregamento por caminho absoluto
- [ ] 🔍 Revisão do backend com o usuário

## Fase 2 — Frontend (implementado, aguardando revisão)

- [x] `apps/web` com React + Vite + react-router
- [x] Tela inicial, criar sala e entrar: código/QR + nome
- [x] Tela da sala: saldos, apostas, pot, valor da rodada, dealer 👑
- [x] Controles de aposta por acumulação de fichas + input numérico; colinha visual com cartas, setinha e ordem das cartas invertida
- [x] Seletor de modo na criação da sala e aviso de aposta mínima na sala
- [x] Seção do dealer com arraste/setas para reordenar quem joga; numeração da ordem no card de jogador
- [x] Modal do dealer para escolher o vencedor
- [x] Cliente WebSocket com reconexão e sessão por sala
- [ ] 🔍 Revisão do frontend com o usuário

## Fase 3 — Operação

- [x] Configurar `MONGODB_URI` no Atlas
- [x] Dockerfile do servidor (Node + tsx em runtime)
- [x] Dockerfile do front (build Vite + nginx com fallback SPA)
- [x] `compose.yaml` na raiz subindo API + web com um comando
- [x] Smoke test local: API e site healthy, rota `/r/:code` servida pelo nginx
- [ ] Rodar em produção com HTTPS e domínio
- [ ] Smoke test com duas pessoas apostando de celulares diferentes

## backlog / ideias futuras (fora da fase 1)

- Rebuy e valor diferente por jogador.
- Timer e blinds automáticos.
- Histórico de rodadas e salas anteriores.
- Cálculo de vencedor a partir das cartas (contradiz a decisão atual).
