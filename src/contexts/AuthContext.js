import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const ROLES = ['alumno', 'cocinero', 'encargado', 'admin'];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState('alumno');
  const [perfil, setPerfil] = useState(null);
  const [sesionResuelta, setSesionResuelta] = useState(false);
  const [perfilResuelto, setPerfilResuelto] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (cuenta) => {
      if (!cuenta) {
        setUsuario(null);
        setPerfil(null);
        setRol('alumno');
        setPerfilResuelto(true);
        setSesionResuelta(true);
        return;
      }

      // El rol vive en los custom claims del token. Sin claim asignado, alumno.
      const { claims } = await cuenta.getIdTokenResult();
      setRol(ROLES.includes(claims.rol) ? claims.rol : 'alumno');
      setPerfilResuelto(false);
      setUsuario(cuenta);
      setSesionResuelta(true);
    });
  }, []);

  useEffect(() => {
    if (!usuario) return undefined;

    // Escuchar el documento en vivo hace que la aprobación del administrador
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

  const cerrarSesion = useCallback(() => signOut(auth), []);

  const valor = useMemo(
    () => ({
      usuario,
      perfil,
      rol,
      cargando: !sesionResuelta || !perfilResuelto,
      estado: perfil?.estado ?? 'pendiente',
      cerrarSesion,
    }),
    [usuario, perfil, rol, sesionResuelta, perfilResuelto, cerrarSesion]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}
