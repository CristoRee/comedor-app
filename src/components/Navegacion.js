import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { colores, espaciado, radio, tipografia } from '../theme';

export function Navegacion({ opciones }) {
  const router = useRouter();
  const segmentos = useSegments();
  const actual = `/${segmentos.join('/')}`;

  return (
    <View style={estilos.barra}>
      {opciones.map((opcion) => {
        const activa = actual === opcion.ruta;

        return (
          <Pressable
            key={opcion.ruta}
            onPress={() => router.replace(opcion.ruta)}
            style={({ pressed }) => [
              estilos.pestania,
              activa && estilos.pestaniaActiva,
              pressed && estilos.pestaniaPresionada,
            ]}
          >
            <Text style={[estilos.texto, activa && estilos.textoActivo]}>{opcion.titulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', gap: espaciado.sm },
  pestania: {
    flex: 1,
    paddingVertical: espaciado.sm + 2,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    alignItems: 'center',
  },
  pestaniaActiva: { backgroundColor: colores.primario, borderColor: colores.primario },
  pestaniaPresionada: { opacity: 0.75 },
  texto: { fontSize: tipografia.nota + 1, fontWeight: '600', color: colores.texto },
  textoActivo: { color: '#ffffff' },
});
