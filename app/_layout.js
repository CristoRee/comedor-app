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

// Única fuente de verdad sobre si la sección actual corresponde al estado de
// sesión actual. Devuelve la ruta a la que hay que ir, o null si ya está bien.
function calcularRedireccion({ usuario, estado, rol, seccion }) {
  if (!usuario) {
    return RUTAS_SIN_SESION.includes(seccion) ? null : '/login';
  }

  if (estado !== 'activo') {
    return seccion === 'pendiente' ? null : '/pendiente';
  }

  const permitidas = SECCIONES_POR_ROL[rol];
  return permitidas.includes(seccion) ? null : `/${permitidas[0]}`;
}

function Guardia({ children }) {
  const { cargando, usuario, estado, rol } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();
  const seccion = segmentos[0];

  const redireccion = cargando ? null : calcularRedireccion({ usuario, estado, rol, seccion });

  useEffect(() => {
    if (redireccion) router.replace(redireccion);
  }, [redireccion, router]);

  // Mientras la sección actual no corresponda al estado de sesión (por
  // ejemplo, el instante entre cerrar sesión y que el router complete la
  // navegación a /login), se muestra este loader en vez de la pantalla vieja.
  // Sin esto, la pantalla protegida se renderiza una vez con datos nulos y
  // revienta contra cualquier `usuario.uid` o `perfil.nombre` sin proteger.
  if (cargando || redireccion) return <Cargando texto="Cargando tu sesión" />;

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
