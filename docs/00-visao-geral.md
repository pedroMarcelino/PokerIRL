# 00 — Visão geral

> Status: rascunho revisado · Última atualização: 2026-11-20

## O que é

Uma aplicação para acompanhar **fichas de poker em uma mesa física**. As cartas são reais e ficam na mesa; o celular serve apenas para entrar na sala, apostar e acompanhar os números da rodada.

Não é um cassino online, não há jogo virtual e não há sorteio de cartas pelo sistema.

## Público e uso

- Uma pessoa cria a sala (o **dealer**) e define quanto cada participante começa tendo.
- Os participantes escaneiam um QR code ou digitam o código da sala, colocam seu nome e entram.
- Durante a rodada, cada um aposta no próprio celular.
- Todos veem, em tempo real: próprio saldo, saldo dos outros, quanto cada um apostou, total do pote e valor da rodada.
- Ao terminar a rodada, o dealer escolhe quem ganhou e o pote é creditado a essa pessoa.

## Escopo da fase 1 (dentro)

- Criar sala com valor inicial único para todos e escolha do modo de aposta: **com vez** (vez obrigatória, mínimo igual à maior aposta da rodada e início girando a cada rodada) ou **sem sequência** (valor livre).
- Entrar na sala por código/QR com nome.
- Dealer também é jogador e aparece com a coroa 👑.
- Dealer define a **ordem de jogo** arrastando os jogadores, confere e inicia a partida; a ordem fica travada depois disso.
- Apostas somando fichas fixas (5/10/15/25/50) ou digitando um valor inteiro.
- Pot, valor da rodada e saldos em tempo real.
- Fechar rodada escolhendo o vencedor; pote vai para ele.
- Colinha estática de mãos de poker.

## Fora de escopo (por enquanto)

- Cartas virtuais, cadastro de cartas ou cálculo automático de vencedor.
- Timer, rodadas automáticas, blinds automáticos.
- Rebuy com valores diferentes por pessoa (entrada tardia usa o valor inicial da sala).
- Login com e-mail/senha, histórico entre salas, classificação global.
- Dinheiro real, pagamentos ou saques.

## Glossário

| Termo | Significado |
| --- | --- |
| Dealer | Quem cria e configura a sala, fecha a rodada e também joga |
| Jogador | Qualquer participante da sala, inclusive o dealer |
| Sala | Rodada de jogo identificada por código de 6 dígitos |
| Rodada | Ciclo de apostas que termina quando o dealer escolhe um vencedor |
| Pot | Soma de todas as apostas da rodada atual |
| Valor da rodada | Maior aposta acumulada por um jogador na rodada (quanto se precisa igualar) |
| Com vez | Modo de sala em que o total apostado na rodada precisa alcançar o valor da rodada |
| Sem sequência | Modo de sala em que cada um aposta o valor que quiser, sem mínimo |
| Ficha | Unidade de valor; valores fixos: 5, 10, 15, 25 e 50 |
