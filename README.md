# Painel de Expedicao

Aplicativo simples para acompanhar a expedicao por ondas, calcular a meta diaria e gerar uma mensagem pronta para enviar ao gestor pelo WhatsApp.

## Como usar

Abra o arquivo `index.html` no navegador ou rode o painel por um servidor local.


## O que preencher

- **Rotas planejadas no dia**: total de rotas previstas para expedir.
- **Meta minima (%)**: percentual minimo esperado. O padrao e 85%.
- **Gestor / canal**: texto que aparece no inicio da mensagem.
- **WhatsApp do chefe**: numero com DDI e DDD, exemplo `5511999999999`.
- **Planejadas**: rotas previstas em cada onda.
- **Subiram**: carros/rotas que ja chegaram para carregar.
- **Carregadas**: carros/rotas que ja foram carregados.

## O que o painel calcula

- Percentual expedido no dia.
- Quantas rotas faltam para bater a meta.
- Quantas rotas ainda podem ficar pendentes sem perder a meta.
- Quantas rotas podem ser perdidas por onda.
- Quantas faltam subir por onda.
- Percentual que ja subiu por onda.
- Percentual que falta subir por onda.
- Tempo restante para fechar a onda atual.
- Mensagem pronta para copiar ou abrir no WhatsApp.

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

O botao **Enviar no WhatsApp** abre o WhatsApp com a mensagem pronta. Por seguranca, o WhatsApp ainda pede a confirmacao manual do envio.

Envio 100% automatico exige uma integracao oficial com WhatsApp Business API.
