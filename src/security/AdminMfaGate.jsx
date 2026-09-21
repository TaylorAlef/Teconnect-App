import React, { useCallback, useEffect, useRef, useState } from 'react';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'RH']);

function MfaError({ message }) {
  return message ? (
    <div style={{
      marginTop: 16,
      padding: '11px 13px',
      borderRadius: 10,
      border: '1px solid rgba(248,113,113,.28)',
      background: 'rgba(127,29,29,.18)',
      color: '#fecaca',
      fontSize: 13,
      lineHeight: 1.5,
    }}>
      {message}
    </div>
  ) : null;
}

export default function AdminMfaGate({ supabase, profile, onVerified }) {
  const [state, setState] = useState('checking');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const preparingRef = useRef(false);

  const prepare = useCallback(async () => {
    if (!supabase || !profile || !ADMIN_ROLES.has(profile.role)) {
      onVerified?.();
      return;
    }

    if (preparingRef.current) return;
    preparingRef.current = true;
    setBusy(true);
    setError('');

    try {
      const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal.error) throw aal.error;
      if (aal.data?.currentLevel === 'aal2' && aal.data?.nextLevel === 'aal2') {
        onVerified?.();
        return;
      }

      const factorsResult = await supabase.auth.mfa.listFactors();
      if (factorsResult.error) throw factorsResult.error;

      const verifiedTotp = (factorsResult.data?.totp || []).find((factor) => factor.status === 'verified');
      if (verifiedTotp) {
        setFactorId(verifiedTotp.id);
        setState('challenge');
        return;
      }

      // Clean up an interrupted enrollment so the administrator can restart safely.
      const pendingTotp = (factorsResult.data?.totp || []).find((factor) => factor.status === 'unverified');
      if (pendingTotp) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: pendingTotp.id });
        if (unenrollError) throw unenrollError;
      }

      const enrollTotp = async (friendlyName = 'Te-connect Admin') => {
        return supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName,
        });
      };

      let enrollment = await enrollTotp();

      if (enrollment.error) {
        // Supabase can retain a factor created by a previous interrupted
        // enrollment. Re-read the factor list instead of trying to create
        // another factor with the same friendly name.
        const retryFactors = await supabase.auth.mfa.listFactors();
        if (retryFactors.error) throw enrollment.error;

        const existingVerified = (retryFactors.data?.totp || []).find(
          (factor) => factor.status === 'verified'
        );
        if (existingVerified) {
          setFactorId(existingVerified.id);
          setState('challenge');
          return;
        }

        const existingPending = (retryFactors.data?.totp || []).find(
          (factor) => factor.status === 'unverified'
        );
        if (existingPending) {
          const { error: cleanupError } = await supabase.auth.mfa.unenroll({
            factorId: existingPending.id,
          });
          if (cleanupError) throw cleanupError;

          // Supabase may take a moment to release the friendly name after
          // unenrolling a stale factor. Use a unique fallback name so an
          // old "Te-connect Admin" factor can never block the login flow.
          const retryEnrollment = await enrollTotp(
            `Te-connect Admin ${Date.now()}`
          );
          if (retryEnrollment.error) throw retryEnrollment.error;

          enrollment = retryEnrollment;
          setFactorId(retryEnrollment.data.id);
          setQrCode(retryEnrollment.data?.totp?.qr_code || '');
          setSecret(retryEnrollment.data?.totp?.secret || '');
          setState('enroll');
          return;
        }

        // Last-resort recovery for Supabase's duplicate-friendly-name error.
        // The factor may exist server-side while the first listFactors() call
        // is still returning a stale snapshot.
        const duplicateFriendlyName = /friendly name|already exists|já existe/i.test(
          enrollment.error?.message || ''
        );
        if (duplicateFriendlyName) {
          const fallbackEnrollment = await enrollTotp(
            `Te-connect Admin ${Date.now()}`
          );
          if (!fallbackEnrollment.error) {
            enrollment = fallbackEnrollment;
          } else {
            throw fallbackEnrollment.error;
          }
        } else {
          throw enrollment.error;
        }
      }

      setFactorId(enrollment.data.id);
      setQrCode(enrollment.data?.totp?.qr_code || '');
      setSecret(enrollment.data?.totp?.secret || '');
      setState('enroll');
    } catch (e) {
      setError(e?.message || 'Não foi possível preparar a autenticação multifator.');
      setState('error');
    } finally {
      preparingRef.current = false;
      setBusy(false);
    }
  }, [onVerified, profile, supabase]);

  useEffect(() => {
    prepare();
  }, [prepare]);

  const verify = async () => {
    const normalizedCode = code.replace(/\D/g, '');
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError('Introduza o código de 6 dígitos do autenticador.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const result = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: normalizedCode,
      });
      if (result.error) throw result.error;

      await supabase.auth.refreshSession();
      const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal.data?.currentLevel !== 'aal2') {
        throw new Error('A autenticação foi validada, mas a sessão ainda não atingiu AAL2. Tente novamente.');
      }

      onVerified?.();
    } catch (e) {
      setError(e?.message || 'Código MFA inválido ou expirado.');
    } finally {
      setBusy(false);
    }
  };

  if (!profile || !ADMIN_ROLES.has(profile.role)) return null;

  const isEnroll = state === 'enroll';
  const isChallenge = state === 'challenge';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: 'radial-gradient(circle at 50% 0%, #162b4d 0%, #07101f 48%, #040912 100%)',
      color: '#fff',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: isEnroll ? 720 : 480,
        padding: 30,
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,.11)',
        background: 'rgba(10,20,35,.96)',
        boxShadow: '0 28px 90px rgba(0,0,0,.42)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', fontWeight: 800, fontSize: 19,
          }}>T</div>
          <div>
            <strong style={{ display: 'block', fontSize: 18 }}>Te-connect</strong>
            <span style={{ color: 'rgba(255,255,255,.58)', fontSize: 12 }}>Segurança administrativa</span>
          </div>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 9px', borderRadius: 999,
          background: 'rgba(34,197,94,.10)', color: '#86efac', fontSize: 11, fontWeight: 700,
          letterSpacing: '.04em', textTransform: 'uppercase',
        }}>MFA obrigatório</div>

        {isEnroll && (
          <>
            <h1 style={{ margin: '16px 0 8px', fontSize: 25 }}>Configure o autenticador</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.68)', lineHeight: 1.6, fontSize: 14 }}>
              O acesso de administradores, RH e Super Admin exige uma segunda etapa. Abra Google Authenticator, Microsoft Authenticator, 1Password ou outra aplicação TOTP e leia o QR Code.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 24, alignItems: 'center', marginTop: 24 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 18, minHeight: 240, display: 'grid', placeItems: 'center' }}>
                {qrCode ? (
                  <img
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`}
                    alt="QR Code para configurar MFA"
                    style={{ width: '100%', maxWidth: 240, height: 'auto' }}
                  />
                ) : (
                  <span style={{ color: '#334155', fontSize: 13 }}>A gerar QR Code…</span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,.72)', fontSize: 12, marginBottom: 8 }}>
                  Código de 6 dígitos
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(event) => { if (event.key === 'Enter') verify(); }}
                    placeholder="000000"
                    style={{
                      display: 'block', width: '100%', marginTop: 7, boxSizing: 'border-box',
                      padding: '13px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.13)',
                      background: '#07111f', color: '#fff', fontSize: 22, letterSpacing: '.25em',
                    }}
                  />
                </label>
                {secret && (
                  <details style={{ marginTop: 12, color: 'rgba(255,255,255,.56)', fontSize: 11 }}>
                    <summary style={{ cursor: 'pointer' }}>Não consegue ler o QR Code?</summary>
                    <div style={{ marginTop: 7, padding: 9, borderRadius: 8, background: '#07111f', color: '#cbd5e1', wordBreak: 'break-all' }}>{secret}</div>
                  </details>
                )}
                <button
                  type="button"
                  onClick={verify}
                  disabled={busy || code.length !== 6 || !factorId}
                  style={{
                    width: '100%', marginTop: 18, padding: '13px 16px', border: 0, borderRadius: 10,
                    background: busy || code.length !== 6 ? '#334155' : '#2563eb', color: '#fff',
                    fontWeight: 700, cursor: busy || code.length !== 6 ? 'not-allowed' : 'pointer',
                  }}
                >{busy ? 'A validar…' : 'Ativar MFA e continuar'}</button>
              </div>
            </div>
          </>
        )}

        {isChallenge && (
          <>
            <h1 style={{ margin: '16px 0 8px', fontSize: 25 }}>Confirme a sua identidade</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.68)', lineHeight: 1.6, fontSize: 14 }}>
              Este acesso administrativo requer o código do seu autenticador.
            </p>
            <label style={{ display: 'block', marginTop: 22, color: 'rgba(255,255,255,.72)', fontSize: 12 }}>
              Código MFA
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(event) => { if (event.key === 'Enter') verify(); }}
                placeholder="000000"
                style={{
                  display: 'block', width: '100%', marginTop: 7, boxSizing: 'border-box',
                  padding: '14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.13)',
                  background: '#07111f', color: '#fff', fontSize: 24, textAlign: 'center', letterSpacing: '.3em',
                }}
              />
            </label>
            <button
              type="button"
              onClick={verify}
              disabled={busy || code.length !== 6}
              style={{
                width: '100%', marginTop: 18, padding: '13px 16px', border: 0, borderRadius: 10,
                background: busy || code.length !== 6 ? '#334155' : '#2563eb', color: '#fff',
                fontWeight: 700, cursor: busy || code.length !== 6 ? 'not-allowed' : 'pointer',
              }}
            >{busy ? 'A validar…' : 'Verificar e entrar'}</button>
          </>
        )}

        {state === 'checking' && (
          <div style={{ padding: '36px 0 10px', color: 'rgba(255,255,255,.7)', textAlign: 'center' }}>A verificar a segurança da sessão…</div>
        )}

        {state === 'error' && (
          <>
            <h1 style={{ margin: '16px 0 8px', fontSize: 25 }}>MFA necessário</h1>
            <p style={{ color: 'rgba(255,255,255,.68)', lineHeight: 1.6, fontSize: 14 }}>
              Não foi possível preparar o segundo fator. O painel administrativo permanece bloqueado até a autenticação ser concluída.
            </p>
            <button
              type="button"
              onClick={prepare}
              disabled={busy}
              style={{
                width: '100%', marginTop: 18, padding: '13px 16px', border: 0, borderRadius: 10,
                background: '#2563eb', color: '#fff', fontWeight: 700,
              }}
            >Tentar novamente</button>
          </>
        )}

        <MfaError message={error} />

        <div style={{ marginTop: 22, paddingTop: 15, borderTop: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.48)', fontSize: 11, lineHeight: 1.5 }}>
          O segundo fator é TOTP. O Te-connect não envia SMS para esta etapa.
        </div>
      </div>
    </div>
  );
}
