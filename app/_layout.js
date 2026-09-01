import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { Cargando } from '../src/components/ui';
import { colores } from '../src/theme';

// La primera sección de cada lista es la pantalla de arranque del rol.
const SECCIONES_POR_ROL = {
  alumno: ['alumno'],
  cocinero: ['cocinero', 'comedor'],
  encargado: ['encargado', 'comedor'],
  admin: ['admin', 'alumnos', 'comedor'],
  superadmin: ['superadmin'],
};

const RUTAS_SIN_SESION = ['login', 'registro'];

function Guardia({ children }) {
  const { cargando, usuario, estado, rol } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;

    const seccion = segmentos[0];

    if (!usuario) {
      if (!RUTAS_SIN_SESION.includes(seccion)) router.replace('/login');
      return;
    }

    if (estado !== 'activo') {
      if (seccion !== 'pendiente') router.replace('/pendiente');
      return;
    }

    const permitidas = SECCIONES_POR_ROL[rol];
    if (!permitidas.includes(seccion)) router.replace(`/${permitidas[0]}`);
  }, [cargando, usuario, estado, rol, segmentos, router]);

  if (cargando) return <Cargando texto="Cargando tu sesión" />;

  return children;
}

export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Guardia>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colores.fondo },
            }}
          />
        </Guardia>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
