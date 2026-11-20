# 01 — Regras de negócio

> Status: rascunho revisado · Última atualização: 2026-11-20

## 1. Criação da sala

1. O **dealer** informa seu nome, o valor inicial de fichas e o **modo de aposta** da sala.
2. O sistema gera um código de **6 dígitos** único e o QR code aponta para ele.
3. O dealer entra na sala como **jogador**, com o mesmo valor inicial de todos, e aparece com o marcador 👑.
4. Não há senha para a sala em si; o código é o convite.
5. A ordem inicial de jogo é a ordem de entrada: dealer primeiro, depois cada jogador que entra. O dealer pode mudá-la depois na sala (ver §2.1).
6. Os modos disponíveis são:
   - **Por rodada, cada um com a sua vez** (`turn`): se alguém apostou 50, os demais precisam ter apostado **50 ou mais** na rodada para participar — é o *call* do poker. Quem quiser, pode apostar mais e aumentar o valor da rodada.
   - **Sem sequência** (`free`): cada um aposta o que quiser, sem ordem e sem valor mínimo. É o modo padrão.

## 2. Entrada dos jogadores

1. O jogador informa **nome** (obrigatório, até 24 caracteres).
2. Nomes são únicos dentro da sala (comparação sem diferenciar maiúsculas/minúsculas), para evitar confusão na tela.
3. Quem entra depois recebe o **mesmo valor inicial** definido pelo dealer — igual para todos.
4. Não há valor customizado por jogador nem rebuy diferenciado nesta fase.
5. O sistema devolve um **token** ao jogador, guardado no celular, para que ele possa reconectar e apostar.

## 2.1. Ordem de jogo

1. O dealer tem na sala uma seção **Ordem de jogo** com a lista numerada de participantes.
2. Ele pode **arrastar** um jogador para cima ou para baixo; no celular, pode usar os botões **▲/▼**. A mudança é salva e transmitida a todos por WebSocket.
3. **Somente o dealer** pode alterar a ordem — os demais veem a numeração ao lado do nome na lista de jogadores.
4. Quem entra depois é acrescentado ao **fim** da ordem. A ordem continua valendo nas rodadas seguintes.
5. Nesta fase a ordem é uma referência visual para a mesa: o sistema **não bloqueia** a aposta de quem não está na vez.

## 3. Apostas

1. Cada jogador aposta pelo próprio celular.
2. A aposta é um **inteiro positivo**: as fichas **5, 10, 15, 25 e 50** podem ser clicadas várias vezes para somar (50 + 50 + 50 = 150), ou o valor pode ser digitado direto.
3. A aposta é debitada imediatamente do saldo do jogador.
4. O valor vai para o **pot** da rodada e soma à aposta daquele jogador na rodada.
5. O **valor da rodada** é a maior aposta acumulada por um único jogador na rodada atual.
6. Em salas **com vez**, a soma do que o jogador já apostou na rodada com o valor da nova aposta precisa alcançar o valor da rodada. Se ele já tem 50 e o valor da rodada é 150, falta 100. O valor mínimo zera a cada nova rodada.
7. Em salas **sem sequência**, esse mínimo não existe.
8. Não é possível apostar mais do que se tem; com saldo insuficiente, a aposta é recusada.
9. Apostas são registradas no histórico para auditoria.

## 4. Fechamento da rodada

1. Somente o **dealer** pode fechar a rodada.
2. O dealer escolhe **um jogador da sala** como vencedor — ele mesmo pode ser o escolhido.
3. Todo o **pot** é transferido para o saldo do vencedor.
4. O sistema registra o resultado (vencedor, valor, número da rodada), zera apostas/pot/valor da rodada e incrementa o número da rodada.
5. A sala permanece aberta para a próxima rodada.

## 5. Cartas e colinha

- As cartas são **físicas**: o sistema não exibe, não cadastra e não calcula vencedor.
- A tela traz apenas uma **colinha estática** com a ordem de força das mãos (ver `06-colinha-poker.md`).

## 6. Tempo real

- Entrada de jogador, aposta e fechamento de rodada são transmitidos por WebSocket para todos os participantes da sala.
- O estado completo da sala também pode ser consultado via HTTP.
