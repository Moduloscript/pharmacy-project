import type { Session } from '@repo/auth';

export type AppBindings = {
  Variables: {
    session: Session['session'];
    user: Session['user'];
  };
};
