export type User = {
  id: string;
  email: string;
  full_name?: string | null;
  role?: string | null;
  tenant_id?: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user?: User;
};
