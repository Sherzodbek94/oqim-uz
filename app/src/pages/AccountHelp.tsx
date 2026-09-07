import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { OQIM_SERVER } from '@/lib/net/client';
import { requestJson } from '@/lib/net/http';

export default function AccountHelp() {
  const [link, setLink] = useState(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    return {purpose: fragment.get('action') === 'verify' ? 'verify' as const : 'reset' as const,
      token: fragment.get('token') ?? '', email: fragment.get('email') ?? ''};
  });
  const [email, setEmail] = useState(link.email);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    // Tokens stay in memory, never localStorage, request URLs or browser history.
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }, []);
  const confirming = Boolean(link.token);
  const title = link.purpose === 'reset' ? 'Parolni tiklash' : 'Emailni tasdiqlash';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (confirming && link.purpose === 'reset' && password !== repeat) {
      setError('Parollar bir xil emas. Qayta tekshiring.'); return;
    }
    setBusy(true);
    const response = await requestJson<{ok: boolean; error?: string; message?: string}>(
      `${OQIM_SERVER}/api/auth/${link.purpose}/${confirming ? 'confirm' : 'request'}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, ...(confirming ? {token: link.token,
          ...(link.purpose === 'reset' ? {password} : {})} : {})}),
      });
    setBusy(false);
    if (!response.ok) {setError(response.error ?? 'Amal bajarilmadi. Qayta urinib ko‘ring.'); return;}
    setPassword(''); setRepeat('');
    setMessage(confirming ? link.purpose === 'reset' ? 'Parol yangilandi. Oldingi sessiyalar bekor qilindi. Yangi parolingiz bilan kiring.'
      : 'Emailingiz tasdiqlandi.' : 'Mos hisob mavjud bo‘lsa, emailga havola yuboriladi. Spam papkasini ham tekshiring.');
  }

  function startAgain(purpose: 'verify' | 'reset') {
    setLink({purpose, token: '', email: ''}); setMessage(''); setError(''); setPassword(''); setRepeat('');
  }
  return <section aria-labelledby="account-title" className="mx-auto w-full max-w-lg px-5 py-12">
    <Link to="/profil" className="text-sm font-semibold text-emerald-700 underline">Profilga qaytish</Link>
    <h1 id="account-title" className="mb-4 mt-6 text-3xl font-bold text-ink-900">{title}</h1>
    <p className="mb-6 text-base text-ink-600">{confirming ? 'Havola bir marta ishlaydi. Amalni quyida tasdiqlang.'
      : 'Hisobingizda ishlatgan email manzilini kiriting.'}</p>
    {message ? <div role="status" className="rounded-xl bg-emerald-50 p-5 text-ink-900">{message}</div> :
      <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
        <div><label htmlFor="account-email" className="mb-2 block font-medium">Email</label>
          <input id="account-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
            readOnly={confirming} required maxLength={128} className="w-full rounded-xl border border-ink-400 bg-white px-4 py-3 text-base" /></div>
        {confirming && link.purpose === 'reset' && <>
          <div><label htmlFor="account-password" className="mb-2 block font-medium">Yangi parol</label>
            <input id="account-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required
              value={password} onChange={e => setPassword(e.target.value)} aria-describedby="password-help"
              className="w-full rounded-xl border border-ink-400 bg-white px-4 py-3 text-base" />
            <p id="password-help" className="mt-2 text-sm text-ink-600">Kamida 12 belgi kiriting.</p></div>
          <div><label htmlFor="account-repeat" className="mb-2 block font-medium">Parolni takrorlang</label>
            <input id="account-repeat" type="password" autoComplete="new-password" required value={repeat} onChange={e => setRepeat(e.target.value)}
              className="w-full rounded-xl border border-ink-400 bg-white px-4 py-3 text-base" /></div>
        </>}
        {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
        <button disabled={busy} className="btn-primary w-full" type="submit">{busy ? 'Kutilmoqda…' : confirming ? 'Tasdiqlash' : 'Havola yuborish'}</button>
      </form>}
    <div className="mt-6 flex flex-wrap gap-4 text-sm">
      <button disabled={busy} onClick={() => startAgain('reset')} className="font-semibold text-emerald-700 underline">Parolni tiklash havolasini so‘rash</button>
      <button disabled={busy} onClick={() => startAgain('verify')} className="font-semibold text-emerald-700 underline">Email tasdiqlash havolasini so‘rash</button>
    </div>
  </section>;
}
