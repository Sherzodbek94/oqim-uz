import type { User } from './auth';

/** One durable object per normalized email. KV is read only on first import. */
export class UserAccount {
  constructor(private state: DurableObjectState, private env: {OQIM_USERS: KVNamespace}) {}

  async fetch(request: Request): Promise<Response> {
    const email = new URL(request.url).searchParams.get('email');
    if (!email || email !== email.trim().toLowerCase() || email.length > 128)
      return Response.json({ok: false}, {status: 400});
    // The binding is internal; this endpoint is not exposed by the public router.
    return this.state.blockConcurrencyWhile(async () => {
      const boundEmail = await this.state.storage.get<string>('email');
      if (boundEmail && boundEmail !== email) return Response.json({ok: false}, {status: 409});
      if (!boundEmail) {
        const raw = await this.env.OQIM_USERS.get(`user:${email}`);
        const legacy: User | null = raw ? JSON.parse(raw) : null;
        if (legacy && legacy.email.toLowerCase() !== email) return Response.json({ok: false}, {status: 500});
        await this.state.storage.put({email, user: legacy ? {...legacy, revision: 1} : null});
      }
      const current = await this.state.storage.get<User | null>('user') ?? null;
      if (request.method === 'GET') return Response.json({ok: true, user: current});
      if (request.method !== 'PUT') return Response.json({ok: false}, {status: 405});
      const input = await request.json() as {user: User; expected: number | null};
      if (input.user.email !== email || input.expected !== (current?.revision ?? null))
        return Response.json({ok: false}, {status: 409});
      const user = {...input.user, revision: (current?.revision ?? 0) + 1};
      // KV remains a directory for paginated admin discovery, never auth authority.
      // A failed mirror must not undo a committed account or permit duplicate creation.
      await this.state.storage.transaction(async tx => {
        await tx.put('user', user);
        await tx.setAlarm(Date.now() + 1_000);
      });
      return Response.json({ok: true, user});
    });
  }

  async alarm(): Promise<void> {
    await this.state.blockConcurrencyWhile(async () => {
      const user = await this.state.storage.get<User>('user');
      if (!user) return;
      try {
        await this.env.OQIM_USERS.put(`user:${user.email}`, JSON.stringify(user));
      } catch {
        console.error(JSON.stringify({event: 'account_directory_write_failed'}));
        await this.state.storage.setAlarm(Date.now() + 60_000);
      }
    });
  }
}
