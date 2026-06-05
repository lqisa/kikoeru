import type { UserState } from '../../types/user';

type UserInfo = {
  name: string;
  group: string;
};

const actions = {
  INIT(this: UserState, user: UserInfo) {
    this.name = user.name;
    this.group = user.group;
  },

  SET_AUTH(this: UserState, flag: boolean) {
    this.auth = flag;
  },
};

export default actions;
