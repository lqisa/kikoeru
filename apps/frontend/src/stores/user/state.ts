import type { UserState } from '../../types/user';

export default function (): UserState {
  return {
    auth: false,
    name: '',
    group: '',
  };
}
