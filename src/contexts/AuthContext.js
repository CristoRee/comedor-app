import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const ROLES = ['alumno', 'cocinero', 'encargado', 'admin', 'superadmin'];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState('alumno');
  const [institucionDelClaim, setInstitucionDelClaim] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [institucion, setInstitucion] = useState(null);
  const [sesionResuelta, setSesionResuelta] = useState(false);
  const [perfilResuelto, setPerfilResuelto] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (cuenta) => {
      if (!cuenta) {
        setUsuario(null);
        setPerfil(null);
        setRol('alumno');
        setInstitucionDelClaim(null);
        setPerfilResuelto(true);
        setSesionResuelta(true);
        return;
      }

      // El rol y la institución del personal viven en los custom claims del
      // token. Sin claim asignado, alumno.
      const { claims } = await cuenta.getIdTokenResult();
      setRol(ROLES.includes(claims.rol) ? claims.rol : 'alumno');
      setInstitucionDelClaim(claims.institucionId ?? null);
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

  // El alumno pertenece a la institución que eligió al registrarse; el personal,
  // a la que le asignaron en el claim.
  const institucionId = rol === 'alumno' ? perfil?.institucionId ?? null : institucionDelClaim;

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
      estado: perfil?.estado ?? 'pendiente',
      cerrarSesion,
    }),
    [usuario, perfil, rol, institucionId, institucion, sesionResuelta, perfilResuelto, cerrarSesion]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}
