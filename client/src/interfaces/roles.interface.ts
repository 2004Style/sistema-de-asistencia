interface RoleBase {
  nombre: string;
  descripcion: string;
  es_admin: boolean;
  puede_aprobar: boolean;
  puede_ver_reportes: boolean;
  puede_gestionar_usuarios: boolean;
}

export interface RoleList extends RoleBase {
  activo: boolean;
  id: number;
}

export interface RolesDetails extends RoleList {}

export interface CrearRole extends RoleBase {}

export interface ResponseCrearRole extends RoleList {}

export interface ActualizarRole extends RoleBase {}

export interface ResponseActualizarRole extends RoleList {}
