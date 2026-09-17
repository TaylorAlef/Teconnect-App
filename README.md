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
