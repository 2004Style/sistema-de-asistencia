const urlBase = process.env.NEXT_PUBLIC_URL_BACKEND;
export const BACKEND_ROUTES = {
  urlSockets: urlBase,
  urlHttpBase: `${urlBase}/api`,
  urlUsuarios: `${urlBase}/api/users`,
  urlUsersRegister: `${urlBase}/api/users/register`,
  urlVerifyCode: `${urlBase}/api/users/codigo`,
  urlRoles: `${urlBase}/api/roles`,
  urlAsistencias: `${urlBase}/api/asistencia`,
  urlJustificaciones: `${urlBase}/api/justificaciones`,
  urlHorarios: `${urlBase}/api/horarios`,
  urlTurnos: `${urlBase}/api/turnos`,
  urlLogin: `${urlBase}/api/users/login/credentials`,
  urlRefreshToken: `${urlBase}/api/auth/refresh-token`,
  urlReportesList: `${urlBase}/api/reportes/listar`,
  urlAsistenciaFacial: `${urlBase}/api/asistencia/registro-facial`,
  urlNotificaciones: `${urlBase}/api/notificaciones`,
};
