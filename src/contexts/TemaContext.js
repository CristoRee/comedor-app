import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETAS } from '../theme';

const CLAVE = 'mibandeja:tema';

export const MODOS = [
  { clave: 'sistema', titulo: 'Como el celular' },
  { clave: 'claro', titulo: 'Claro' },
  { clave: 'oscuro', titulo: 'Oscuro' },
];

const TemaContext = createContext(null);

export function TemaProvider({ children }) {
  const delSistema = useColorScheme();
  const [modo, setModo] = useState('sistema');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vigente = true;

    AsyncStorage.getItem(CLAVE)
      .then((guardado) => {
        if (vigente && MODOS.some((opcion) => opcion.clave === guardado)) setModo(guardado);
      })
      .catch(() => {})
      .finally(() => {
        if (vigente) setListo(true);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const cambiarModo = useCallback((nuevo) => {
    setModo(nuevo);
    AsyncStorage.setItem(CLAVE, nuevo).catch(() => {});
  }, []);

  const esOscuro = modo === 'sistema' ? delSistema === 'dark' : modo === 'oscuro';

  const valor = useMemo(
    () => ({
      colores: esOscuro ? PALETAS.oscuro : PALETAS.claro,
      esOscuro,
      modo,
      cambiarModo,
      listo,
    }),
    [esOscuro, modo, cambiarModo, listo]
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error('useTema debe usarse dentro de TemaProvider');
  return contexto;
}

// Cada pantalla define sus estilos como función de la paleta; acá se rearman
// solo cuando el tema cambia.
export function useEstilos(crear) {
  const { colores } = useTema();
  return useMemo(() => crear(colores), [crear, colores]);
}
