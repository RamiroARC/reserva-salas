import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createCompany,
  deleteCompany,
  fetchCompanies,
  updateCompany,
} from '../../api/admin';
import { readFileAsBase64 } from '../../utils/fileAttachments';
import FormModal from '../shared/FormModal';

const EMPTY_FORM = {
  name: '',
  taxId: '',
  logoPath: '',
  localName: '',
  adminFullName: '',
  adminUsername: '',
  adminPassword: '',
};

function toForm(company) {
  return {
    ...EMPTY_FORM,
    name: company.name ?? '',
    taxId: company.tax_id ?? '',
    logoPath: company.logoPath ?? company.logo_path ?? '',
  };
}

function companyLogoSrc(company) {
  return company?.logoUrl || company?.logoPath || company?.logo_path || '';
}

export default function CompaniesPanel() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);
  const blobUrlRef = useRef('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCompanies(await fetchCompanies());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    },
    []
  );

  const clearLogoFile = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = '';
    }
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    clearLogoFile();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    clearLogoFile();
    setError(null);
    setOpen(true);
  };

  const openEdit = (company) => {
    setEditingId(company.id);
    setForm(toForm(company));
    clearLogoFile();
    setError(null);
    setOpen(true);
  };

  const updateField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleLogoFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('El logo debe ser una imagen.');
      event.target.value = '';
      return;
    }
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = URL.createObjectURL(file);
    setLogoFile(file);
    setError(null);
  };

  const editingCompany = companies.find((item) => item.id === editingId);
  const logoPreview = useMemo(() => {
    if (blobUrlRef.current && logoFile) return blobUrlRef.current;
    if (editingCompany) return companyLogoSrc(editingCompany);
    return form.logoPath.trim();
  }, [logoFile, editingCompany, form.logoPath]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      let logo;
      if (logoFile) {
        logo = {
          mimeType: logoFile.type || 'image/png',
          dataBase64: await readFileAsBase64(logoFile),
        };
      }

      if (editingId) {
        await updateCompany(editingId, {
          name: form.name,
          taxId: form.taxId,
          logoPath: form.logoPath,
          logo,
          active: editingCompany?.active !== false,
          adminPassword: form.adminPassword.trim() || undefined,
        });
        setMessage(`Empresa "${form.name}" actualizada.`);
      } else {
        await createCompany({ ...form, logo });
        setMessage(`Empresa "${form.name}" creada con su administrador.`);
      }

      closeModal();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (company) => {
    setError(null);
    setMessage(null);

    try {
      await updateCompany(company.id, {
        name: company.name,
        taxId: company.tax_id,
        active: !company.active,
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (company) => {
    if (!window.confirm(`¿Eliminar la empresa "${company.name}" y todos sus datos?`)) return;

    setError(null);
    setMessage(null);

    try {
      await deleteCompany(company.id);
      setMessage(`Empresa "${company.name}" eliminada.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>Empresas registradas</h2>
            <p className="panel__subtitle">{companies.length} empresas</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            Nueva empresa
          </button>
        </div>

        {(error && !open) || message ? (
          <div className={`alert ${error && !open ? 'alert--error' : 'alert--success'}`}>
            {error && !open ? error : message}
          </div>
        ) : null}

        {loading ? (
          <div className="loading">Cargando…</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>Empresa</th>
                <th>RUC</th>
                <th>Locales</th>
                <th>Usuarios</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const src = companyLogoSrc(company);
                return (
                  <tr key={company.id}>
                    <td>
                      {src ? (
                        <img className="company-logo-thumb" src={src} alt="" />
                      ) : (
                        <span className="company-logo-thumb company-logo-thumb--empty">Sin logo</span>
                      )}
                    </td>
                    <td>{company.name}</td>
                    <td>{company.tax_id || '—'}</td>
                    <td>{company.locals_count}</td>
                    <td>{company.users_count}</td>
                    <td>
                      <span className={`pill ${company.active ? 'pill--on' : 'pill--off'}`}>
                        {company.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="admin-table__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => openEdit(company)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleToggleActive(company)}
                      >
                        {company.active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => handleDelete(company)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {open && (
        <FormModal
          title={editingId ? 'Editar empresa' : 'Nueva empresa'}
          subtitle={
            editingId
              ? 'Actualiza los datos y carga el logo de la empresa.'
              : 'Crea la empresa junto con su administrador.'
          }
          onClose={closeModal}
        >
          {error && <div className="alert alert--error">{error}</div>}

          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Nombre de la empresa
              <input value={form.name} onChange={updateField('name')} required autoFocus />
            </label>

            <label>
              RUC (opcional)
              <input value={form.taxId} onChange={updateField('taxId')} />
            </label>

            <div className="company-logo-field">
              <span className="company-logo-field__label">Logo de la empresa</span>
              {logoPreview ? (
                <img className="company-logo-preview" src={logoPreview} alt="Vista previa del logo" />
              ) : (
                <p className="form-hint">Aún no hay logo. Se usará el logo genérico de acceso.</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={handleLogoFile}
              />
              <p className="form-hint">PNG, JPG, WEBP, GIF o SVG. Máximo 1.5 MB.</p>
            </div>

            <label>
              O ruta / URL pública
              <input
                value={form.logoPath}
                onChange={updateField('logoPath')}
                placeholder="/banner-jazmines.png"
              />
            </label>

            {editingId ? (
              <label>
                Restablecer contraseña del administrador
                <input
                  type="password"
                  value={form.adminPassword}
                  onChange={updateField('adminPassword')}
                  minLength={6}
                  placeholder="Dejar vacío para no cambiarla"
                />
              </label>
            ) : (
              <>
                <label>
                  Primer local (opcional)
                  <input
                    value={form.localName}
                    onChange={updateField('localName')}
                    placeholder="Salón principal"
                  />
                </label>

                <label>
                  Nombre del administrador
                  <input value={form.adminFullName} onChange={updateField('adminFullName')} />
                </label>

                <label>
                  Usuario del administrador
                  <input value={form.adminUsername} onChange={updateField('adminUsername')} required />
                </label>

                <label>
                  Contraseña del administrador
                  <input
                    type="password"
                    value={form.adminPassword}
                    onChange={updateField('adminPassword')}
                    minLength={6}
                    required
                  />
                </label>
              </>
            )}

            <div className="admin-form__actions">
              <button type="button" className="btn btn--ghost" onClick={closeModal}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting
                  ? editingId
                    ? 'Guardando…'
                    : 'Creando…'
                  : editingId
                    ? 'Guardar cambios'
                    : 'Crear empresa'}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  );
}
