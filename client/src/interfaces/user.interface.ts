interface UserBase {
  name: string;
  email: string;
  codigo_user: string;
  role_id: number;
  is_active: boolean;
  facial_recognize: boolean;
}

export interface User extends UserBase {
  id: number;
  huella: string | null;
  created_at: string;
  updated_at: string | null;
  isAdmin: boolean;
  isSupervisor: boolean;
}

export interface UserList extends User {}

export interface UserDetails extends User {}

export interface UserCodeResponse extends User {}

export interface UserCreateResponse extends User {}

export interface UserUpdate {
  name: string;
  email: string;
  codigo_user: string;
  role_id: number;
  is_active: boolean;
  password: string;
}

export interface UserUpdateResponse extends User {}
