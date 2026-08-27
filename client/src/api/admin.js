import { request } from './client.js';

export async function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: { username, password },
    fallbackError: 'No se pudo iniciar sesión',
  });
}

export async function logout() {
  return request('/auth/logout', { method: 'POST', fallbackError: 'No se pudo cerrar sesión' });
}

export async function fetchSession() {
  return request('/auth/me', { fallbackError: 'No se pudo recuperar la sesión' });
}

export async function changePassword(currentPassword, newPassword) {
  return request('/auth/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
    fallbackError: 'No se pudo cambiar la contraseña',
  });
}

export async function fetchCompanies() {
  return request('/companies', { fallbackError: 'No se pudieron cargar las empresas' });
}

export async function fetchCompany(id) {
  return request(`/companies/${id}`, { fallbackError: 'No se pudo cargar la empresa' });
}

export async function createCompany(data) {
  return request('/companies', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al crear la empresa',
  });
}

export async function updateCompany(id, data) {
  return request(`/companies/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar la empresa',
  });
}

export async function deleteCompany(id) {
  return request(`/companies/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar la empresa',
  });
}

export async function fetchUsers() {
  return request('/users', { fallbackError: 'No se pudieron cargar los usuarios' });
}

export async function createUser(data) {
  return request('/users', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al crear el usuario',
  });
}

export async function updateUser(id, data) {
  return request(`/users/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar el usuario',
  });
}

export async function deleteUser(id) {
  return request(`/users/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar el usuario',
  });
}

export async function fetchLocals() {
  return request('/locals', { fallbackError: 'No se pudieron cargar los locales' });
}

export async function createLocal(data) {
  return request('/locals', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al crear el local',
  });
}

export async function updateLocal(id, data) {
  return request(`/locals/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar el local',
  });
}

export async function deleteLocal(id) {
  return request(`/locals/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar el local',
  });
}
