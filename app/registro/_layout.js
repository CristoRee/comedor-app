import { Stack } from 'expo-router';
import { useTema } from '../../src/contexts/TemaContext';

export default function LayoutRegistro() {
  const { colores } = useTema();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colores.fondo },
        headerTintColor: colores.texto,
        headerShadowVisible: false,
        headerBackTitle: 'Atrás',
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Departamento' }} />
      <Stack.Screen name="institucion" options={{ title: 'Institución' }} />
      <Stack.Screen name="datos" options={{ title: 'Tus datos' }} />
    </Stack>
  );
}
