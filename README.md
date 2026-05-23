# Painel de Expedicao

Aplicativo simples para acompanhar a expedicao por ondas, calcular a meta diaria e gerar uma mensagem pronta para enviar ao gestor pelo WhatsApp.

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

## Publicar no GitHub Pages

1. Crie um repositorio no GitHub.
2. Envie estes arquivos para o repositorio:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. No GitHub, abra **Settings**.
4. Entre em **Pages**.
5. Em **Branch**, selecione `main`.
6. Em pasta, selecione `/root`.
7. Clique em **Save**.

Depois de alguns minutos, o GitHub vai gerar um link publico para abrir o painel em qualquer computador ou celular.

## Observacao sobre WhatsApp

O botao **Enviar no WhatsApp** abre o WhatsApp com a mensagem pronta. Por seguranca, o WhatsApp ainda pede a confirmacao manual do envio.

Envio 100% automatico exige uma integracao oficial com WhatsApp Business API.
