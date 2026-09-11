import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const ROLES = ['alumno', 'cocinero', 'encargado', 'admin', 'superadmin'];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [esSuperadmin, setEsSuperadmin] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [institucion, setInstitucion] = useState(null);
  const [sesionResuelta, setSesionResuelta] = useState(false);
  const [perfilResuelto, setPerfilResuelto] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (cuenta) => {
      if (!cuenta) {
        setUsuario(null);
        setPerfil(null);
        setEsSuperadmin(false);
        setPerfilResuelto(true);
        setSesionResuelta(true);
        return;
      }

      // Solo el superadmin viene del claim: es el rol que reparte todos los
      // demás, y un claim no se puede escribir desde la app. El resto sale del
      // documento, así un cambio de rol se aplica sin cerrar sesión.
      const { claims } = await cuenta.getIdTokenResult();
      setEsSuperadmin(claims.rol === 'superadmin');
      setPerfilResuelto(false);
      setUsuario(cuenta);
      setSesionResuelta(true);
    });
  }, []);

  useEffect(() => {
    if (!usuario) return undefined;

    // Escuchar el documento en vivo hace que la aprobación del encargado
    // llegue a la pantalla del alumno sin reiniciar la app.
    return onSnapshot(
      doc(db, 'usuarios', usuario.uid),
      (instantanea) => {
        setPerfil(instantanea.exists() ? { id: instantanea.id, ...instantanea.data() } : null);
        setPerfilResuelto(true);
      },
      () => {
        setPerfil(null);
        setPerfilResuelto(true);
      }
    );
  }, [usuario]);

  // El superadmin es nacional: no pertenece a ninguna institución.
  const rol = esSuperadmin
    ? 'superadmin'
    : ROLES.includes(perfil?.rol) && perfil.rol !== 'superadmin'
      ? perfil.rol
      : 'alumno';

  const institucionId = esSuperadmin ? null : perfil?.institucionId ?? null;

  useEffect(() => {
    if (!institucionId) {
      setInstitucion(null);
      return undefined;
    }

    return onSnapshot(
      doc(db, 'instituciones', institucionId),
      (instantanea) => setInstitucion(instantanea.exists() ? { id: instantanea.id, ...instantanea.data() } : null),
      () => setInstitucion(null)
    );
  }, [institucionId]);

  const cerrarSesion = useCallback(() => signOut(auth), []);

  const valor = useMemo(
    () => ({
      usuario,
      perfil,
      rol,
      institucionId,
      institucion,
      cargando: !sesionResuelta || !perfilResuelto,
      estado: esSuperadmin ? 'activo' : perfil?.estado ?? 'pendiente',
      cerrarSesion,
    }),
    [usuario, perfil, rol, esSuperadmin, institucionId, institucion, sesionResuelta, perfilResuelto, cerrarSesion]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}
