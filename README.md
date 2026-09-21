# Teconnect — People OS

SaaS de gestão de RH, assiduidade, ponto, tarefas e operações de pessoas.

## Produção

- Aplicação: https://app.te-connect.com/
- Hosting/CDN: Cloudflare Workers + Workers Static Assets
- Repositório: GitHub `TaylorAlef/Teconnect-App`
- Backend: Supabase

## Deploy Cloudflare

- Branch de produção: `main`
- Build: `npm run build`
- Deploy: `npx wrangler deploy`
- Configuração: `wrangler.jsonc`
- SPA fallback e headers de segurança: `public/_redirects` e `public/_headers`

O frontend usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em tempo de build. Os valores reais devem permanecer configurados no ambiente de produção do Cloudflare e nunca no Git.

## Android — App Colaborador

O projeto usa Capacitor 8 para Android/iOS. A conta ligada a um colaborador ativo é encaminhada automaticamente para `EmployeeMobileWorkspace`; o colaborador não usa o shell administrativo de RH.

O workflow `.github/workflows/android-apk.yml` cria o projeto Android, prepara as permissões de GPS, sincroniza o Capacitor e publica um APK de teste instalável como artefacto do GitHub Actions.

Para o build Android, é necessário criar no repositório o secret do GitHub Actions:

`TECONNECT_SUPABASE_PUBLISHABLE_KEY`

Este secret deve conter apenas a chave **publishable** do projeto Supabase de produção. Nunca coloque a service-role key no GitHub Actions.

O workflow usa Java 21, Android SDK 36 e produz o artefacto `te-connect-collaborador-debug`.

O APK de debug serve para validação do produto. A assinatura de distribuição para Google Play é uma etapa separada e exige um keystore de produção protegido por secrets.
