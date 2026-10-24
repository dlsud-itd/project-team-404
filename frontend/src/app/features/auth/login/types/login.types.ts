export type LoginRequest = {
  /** Email address or username. */
  identifier: string;
  password: string;
};

export type LoginUser = {
  id: string;
  username: string;
  email: string;
  timezone: string;
  inboxProjectId: number;
};

export type LoginResponse = {
  token: string;
  user: LoginUser;
};

export type LoginError = {
  message: string;
  clearPassword: boolean;
};
