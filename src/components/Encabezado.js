import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useEstilos } from '../contexts/TemaContext';
import { espaciado, radio, tipografia } from '../theme';

function iniciales(perfil) {
  const nombre = (perfil?.nombre ?? '').trim();
  const apellido = (perfil?.apellido ?? '').trim();
  const letras = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();

  return letras || '·';
}

export function Avatar({ perfil, tamanio = 40 }) {
  const estilos = useEstilos(crearEstilos);
  const marco = { width: tamanio, height: tamanio, borderRadius: tamanio * 0.3 };

  if (perfil?.fotoPerfil) {
    return <Image source={{ uri: perfil.fotoPerfil }} style={[estilos.avatar, marco]} />;
  }

  return (
    <View style={[estilos.avatar, estilos.avatarVacio, marco]}>
      <Text style={[estilos.iniciales, { fontSize: tamanio * 0.36 }]}>{iniciales(perfil)}</Text>
    </View>
  );
}

export function Encabezado({ titulo, subtitulo, nota }) {
  const estilos = useEstilos(crearEstilos);
  const router = useRouter();
  const { perfil, cerrarSesion } = useAuth();
  const [abierto, setAbierto] = useState(false);

  return (
    <View style={estilos.encabezado}>
      <View style={estilos.textos}>
        <Text style={estilos.titulo}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
        {nota ? <Text style={estilos.nota}>{nota}</Text> : null}
      </View>

      <Pressable
        onPress={() => setAbierto(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Abrir el menú de la cuenta"
      >
        <Avatar perfil={perfil} />
      </Pressable>

      {/* El menú se despliega desde el avatar: tocar fuera lo cierra. */}
      <Modal
        visible={abierto}
        transparent
        animationType="fade"
        onRequestClose={() => setAbierto(false)}
      >
        <Pressable style={estilos.telon} onPress={() => setAbierto(false)}>
          <View style={estilos.menu}>
            <Pressable
              style={({ pressed }) => [estilos.item, pressed && estilos.itemPresionado]}
              onPress={() => {
                setAbierto(false);
                router.push('/perfil');
              }}
            >
              <Text style={estilos.itemTexto}>Mi perfil</Text>
            </Pressable>

            <View style={estilos.separador} />

            <Pressable
              style={({ pressed }) => [estilos.item, pressed && estilos.itemPresionado]}
              onPress={() => {
                setAbierto(false);
                cerrarSesion();
              }}
            >
              <Text style={[estilos.itemTexto, estilos.itemSalir]}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const crearEstilos = (colores) =>
  StyleSheet.create({
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

    avatar: { borderWidth: 1, borderColor: colores.borde, backgroundColor: colores.superficie },
    avatarVacio: { alignItems: 'center', justifyContent: 'center' },
    iniciales: { fontWeight: '700', color: colores.textoSuave },

    telon: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
    menu: {
      position: 'absolute',
      top: espaciado.xl * 2,
      right: espaciado.lg,
      minWidth: 190,
      backgroundColor: colores.superficie,
      borderRadius: radio.md,
      borderWidth: 1,
      borderColor: colores.borde,
      overflow: 'hidden',
    },
    item: { paddingHorizontal: espaciado.md, paddingVertical: espaciado.md },
    itemPresionado: { backgroundColor: colores.presionado },
    itemTexto: { fontSize: tipografia.cuerpo, color: colores.texto, fontWeight: '600' },
    itemSalir: { color: colores.error },
    separador: { height: 1, backgroundColor: colores.borde },
  });
