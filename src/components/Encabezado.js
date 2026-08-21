import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colores, espaciado, tipografia } from '../theme';

export function Encabezado({ titulo, subtitulo, nota }) {
  const { cerrarSesion } = useAuth();

  return (
    <View style={estilos.encabezado}>
      <View style={estilos.textos}>
        <Text style={estilos.titulo}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
        {nota ? <Text style={estilos.nota}>{nota}</Text> : null}
      </View>
      <Pressable onPress={cerrarSesion} hitSlop={12}>
        <Text style={estilos.salir}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: espaciado.md,
  },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: tipografia.titulo - 4, fontWeight: '700', color: colores.texto },
  subtitulo: { fontSize: tipografia.nota + 1, color: colores.textoSuave },
  nota: { fontSize: tipografia.nota, color: colores.textoSuave },
  salir: { fontSize: tipografia.nota + 1, color: colores.primario, fontWeight: '600', paddingTop: espaciado.xs },
});
