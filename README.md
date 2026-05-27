# Painel de Expedicao

Aplicativo simples para acompanhar a expedicao por ondas, calcular a meta diaria, mostrar quantas rotas faltam carregar e gerar mensagens prontas para enviar no WhatsApp.

## Como usar

Abra o arquivo `index.html` no navegador ou rode o painel por um servidor local.

No computador onde o projeto foi criado, o painel pode ser acessado por:

```text
http://127.0.0.1:8080
```

## O que preencher

- **Rotas planejadas no dia**: total de rotas previstas para expedir.
- **Meta minima (%)**: percentual minimo esperado. O padrao e 85%.
- **Gestor / canal**: texto que aparece no inicio da mensagem.
- **WhatsApp direto**: numero com DDI e DDD, exemplo `5511999999999`. Se deixar vazio, o WhatsApp abre para escolher o grupo manualmente.
- **Disparo para grupo**: ativa os disparos automaticos de mensagem durante as ondas.
- **Planejadas**: rotas previstas em cada onda.
- **Subiram**: carros/rotas que ja chegaram para carregar.
- **Carregadas**: carros/rotas que ja foram carregados.

## O que o painel calcula

- Percentual expedido no dia.
- Quantas rotas faltam carregar no geral.
- Quantas rotas faltam para bater a meta.
- Quantas rotas ainda podem ficar pendentes sem perder a meta.
- Quantas rotas podem ser perdidas por onda.
- Quantas faltam subir por onda.
- Percentual que ja subiu por onda.
- Percentual que falta subir por onda.
- Tempo restante para fechar a onda atual.
- Mensagem pronta para copiar ou abrir no WhatsApp.
- Mensagens automaticas de acompanhamento a cada 15 minutos depois do inicio da onda.

## Disparo automatico para WhatsApp

Clique em **Ativar disparo automatico** e deixe o painel aberto.

O painel prepara uma mensagem em:

- 15 minutos depois do inicio da onda.
- 30 minutos depois do inicio da onda.
- 45 minutos depois do inicio da onda, que tambem e o fechamento da onda.

A mensagem informa quantas rotas faltam carregar na onda e no geral. O painel tenta abrir o WhatsApp Web com a mensagem pronta e tambem copia o texto quando o navegador permite.

Por seguranca do WhatsApp Web e do navegador, o envio final no grupo ainda pode exigir confirmacao manual.

## Exemplo de calculo

Se o dia tem `120` rotas planejadas e a meta e `85%`, o painel calcula:

```text
120 x 85% = 102 rotas
```

Ou seja, e preciso carregar pelo menos `102` rotas. Nesse exemplo, podem ficar ate `18` rotas fora da meta diaria.


## Sincronizar com Supabase


Com isso, quando uma pessoa atualizar uma onda, os outros computadores com o painel aberto recebem a atualizacao em tempo real.

Observacao: esta configuracao inicial permite leitura e escrita publica pela anon key. Para uso interno mais seguro, o proximo passo e colocar login ou uma chave de acesso.

## Observacao sobre WhatsApp

O botao **Abrir WhatsApp** abre o WhatsApp com a mensagem pronta. Por seguranca, o WhatsApp ainda pode pedir a confirmacao manual do envio.

Envio 100% automatico exige uma integracao oficial com WhatsApp Business API.
