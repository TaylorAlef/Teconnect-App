# Te-connect — Release Runbook

## Objetivo

Levar o Te-connect do estado técnico atual para lançamento comercial em Web, Android e iOS sem misturar testes com produção.

## Gate 1 — Código

- [x] Build de produção no CI.
- [x] Branding guard.
- [x] Mobile readiness guard.
- [x] Configuração Capacitor versionada.
- [ ] Gerar e versionar os projetos nativos `android/` e `ios/` em máquina com Android Studio/Xcode.

## Gate 2 — Backend e segurança

- [x] RLS no conjunto de tabelas públicas.
- [x] Isolamento multi-tenant validado no ambiente E2E.
- [x] Matriz de autorização sintética 69/69.
- [ ] Executar matriz com utilizadores reais do Supabase Auth no ambiente E2E.
- [ ] Ativar Leaked Password Protection no Supabase Auth.
- [ ] Definir e impor MFA para administradores.
- [ ] Fazer revisão final dos RPCs SECURITY DEFINER intencionais.
- [ ] Upgrade do projeto Supabase de produção para Pro antes dos clientes pagantes.

## Gate 3 — Produção Web

- [ ] Confirmar variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente Cloudflare.
- [ ] Executar deploy de `main` no Cloudflare.
- [ ] Smoke test em `https://app.te-connect.com/`.
- [ ] Testar login, logout, onboarding e recuperação de acesso.
- [ ] Testar Ponto com GPS em dispositivo real.
- [ ] Testar pedidos e aprovações.
- [ ] Testar faturamento em modo controlado antes do primeiro cliente pagante.

## Gate 4 — Android

- [ ] Executar `npm install`.
- [ ] Executar `npm run build`.
- [ ] Executar `npx cap add android`.
- [ ] Executar `npm run mobile:sync`.
- [ ] Configurar assinatura de release e package id `com.teconnect.app`.
- [ ] Configurar ícone, splash e nome Te-connect.
- [ ] Testar em Android real com login e GPS.
- [ ] Gerar AAB assinado.
- [ ] Publicar em Internal testing no Google Play.
- [ ] Corrigir issues encontrados nos testes de loja.
- [ ] Promover para produção.

Google Play: novos apps e atualizações devem mirar Android 16 / API 36 a partir de 31 de agosto de 2026.

## Gate 5 — iOS

- [ ] Executar `npx cap add ios` em macOS.
- [ ] Executar `npm run mobile:sync`.
- [ ] Configurar Bundle Identifier `com.teconnect.app` no Apple Developer.
- [ ] Configurar assinatura, Team e provisioning.
- [ ] Configurar ícone e Launch Screen.
- [ ] Testar em iPhone físico.
- [ ] Testar login, GPS, sessões, ponto e logout.
- [ ] Distribuir pelo TestFlight.
- [ ] Corrigir issues encontrados no App Review/TestFlight.
- [ ] Submeter para App Store.

## Gate 6 — Comercial e legal

- [ ] Aprovar preços, limites e política de upgrade/downgrade.
- [ ] Publicar Termos de Utilização.
- [ ] Publicar Política de Privacidade.
- [ ] Definir retenção e eliminação de dados.
- [ ] Definir processo de suporte e SLA.
- [ ] Preparar informação de tratamento de dados/DPA quando necessária para clientes empresariais.
- [ ] Preparar documentação de integrações/API.
- [ ] Preparar página de contacto e suporte.

## Regra de publicação

Não publicar clientes pagantes em produção enquanto os gates de segurança, Auth real, Supabase Pro e smoke test de produção permanecerem abertos.
