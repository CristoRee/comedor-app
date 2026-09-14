import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { db } from '../src/firebase';
import { useAuth } from '../src/contexts/AuthContext';
import { MODOS, useEstilos, useTema } from '../src/contexts/TemaContext';
import { Aviso, Boton, Cargando, Pantalla } from '../src/components/ui';
import { Avatar } from '../src/components/Encabezado';
import { fechaCorta } from '../src/fechas';
import { resumenDeAcceso } from '../src/acceso';
import { espaciado, radio, tipografia } from '../src/theme';

// La foto se guarda dentro del documento del usuario, no en Storage: el plan
// gratuito de Firebase no incluye Storage. Un documento admite 1 MB, así que la
// imagen se achica y se comprime antes de guardarla.
const LADO_MAXIMO = 256;
const LIMITE_BYTES = 180 * 1024;

function Dato({ etiqueta, valor }) {
  const estilos = useEstilos(crearEstilos);

  return (
    <View style={estilos.dato}>
      <Text style={estilos.datoEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.datoValor}>{valor ?? '—'}</Text>
    </View>
  );
}

export default function MiPerfil() {
  const estilos = useEstilos(crearEstilos);
  const { colores, modo, cambiarModo } = useTema();
  const router = useRouter();
  const { usuario, perfil, rol, institucion } = useAuth();

  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function elegirFoto() {
    setAviso(null);

    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setAviso({ tipo: 'error', texto: 'Hace falta permiso para acceder a tus fotos.' });
      return;
    }

    const elegida = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (elegida.canceled) return;

    setSubiendo(true);

    try {
      const activo = elegida.assets[0];

      const lado = Math.min(activo.width, activo.height);
      const origenX = Math.round((activo.width - lado) / 2);
      const origenY = Math.round((activo.height - lado) / 2);

      const contexto = ImageManipulator.manipulate(activo.uri);
      contexto.crop({ originX: origenX, originY: origenY, width: lado, height: lado });
      contexto.resize({ width: LADO_MAXIMO, height: LADO_MAXIMO });

      const imagen = await contexto.renderAsync();
      const guardada = await imagen.saveAsync({
        compress: 0.6,
        format: SaveFormat.JPEG,
        base64: true,
      });

      const foto = `data:image/jpeg;base64,${guardada.base64}`;

      if (foto.length > LIMITE_BYTES) {
        setAviso({ tipo: 'error', texto: 'La imagen es demasiado pesada. Probá con otra.' });
        return;
      }

      await updateDoc(doc(db, 'usuarios', usuario.uid), { fotoPerfil: foto });
      setAviso({ tipo: 'exito', texto: 'Foto actualizada.' });
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo guardar la foto. Probá de nuevo.' });
    } finally {
      setSubiendo(false);
    }
  }

  function quitarFoto() {
    Alert.alert('Quitar la foto', '¿Volver a la imagen por defecto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'usuarios', usuario.uid), { fotoPerfil: null });
            setAviso({ tipo: 'exito', texto: 'Foto quitada.' });
          } catch {
            setAviso({ tipo: 'error', texto: 'No se pudo quitar la foto.' });
          }
        },
      },
    ]);
  }

  if (!perfil) {
    return (
      <Pantalla scroll={false}>
        <Cargando />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Text style={estilos.volver}>‹ Volver</Text>
      </Pressable>

      <View style={estilos.cabecera}>
        <Avatar perfil={perfil} tamanio={96} />
        <View style={estilos.cabeceraTextos}>
          <Text style={estilos.nombre}>{`${perfil.nombre} ${perfil.apellido}`}</Text>
          <Text style={estilos.rol}>{rol}</Text>
          {institucion ? <Text style={estilos.rol}>{institucion.nombre}</Text> : null}
        </View>
      </View>

      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

      <Boton titulo="Cambiar foto" onPress={elegirFoto} cargando={subiendo} />
      {perfil.fotoPerfil ? (
        <Boton titulo="Quitar foto" variante="secundario" onPress={quitarFoto} />
      ) : null}

      <Text style={estilos.seccion}>Mis datos</Text>

      <View style={estilos.tarjeta}>
        <Dato etiqueta="Cédula" valor={perfil.ci} />
        <Dato etiqueta="Nacimiento" valor={fechaCorta(perfil.fechaNacimiento)} />
        <Dato etiqueta="Correo" valor={perfil.email} />
        <Dato etiqueta="Teléfono" valor={perfil.telefono} />
        {rol === 'alumno' ? <Dato etiqueta="Acceso" valor={resumenDeAcceso(perfil)} /> : null}
      </View>

      <Text style={estilos.nota}>
        Tus datos los edita la administración de tu institución: fueron verificados al aprobar tu
        registro.
      </Text>

      <Text style={estilos.seccion}>Apariencia</Text>

      <View style={estilos.opciones}>
        {MODOS.map((opcion) => (
          <Pressable
            key={opcion.clave}
            onPress={() => cambiarModo(opcion.clave)}
            style={[estilos.opcion, modo === opcion.clave && estilos.opcionActiva]}
            accessibilityRole="radio"
            accessibilityState={{ selected: modo === opcion.clave }}
          >
            <Text style={[estilos.opcionTexto, modo === opcion.clave && estilos.opcionTextoActiva]}>
              {opcion.titulo}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={estilos.nota}>
        El modo oscuro queda guardado en este celular. El código QR y el resultado del escáner
        mantienen el fondo claro a propósito, para que se lean siempre.
      </Text>
    </Pantalla>
  );
}

const crearEstilos = (colores) =>
  StyleSheet.create({
    volver: { fontSize: tipografia.cuerpo, color: colores.primario, fontWeight: '600' },
    cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md },
    cabeceraTextos: { flex: 1, gap: 2 },
    nombre: { fontSize: tipografia.titulo - 6, fontWeight: '700', color: colores.texto },
    rol: { fontSize: tipografia.nota + 1, color: colores.textoSuave },
    seccion: {
      fontSize: tipografia.subtitulo,
      fontWeight: '700',
      color: colores.texto,
      marginTop: espaciado.sm,
    },
    tarjeta: {
      backgroundColor: colores.superficie,
      borderRadius: radio.lg,
      borderWidth: 1,
      borderColor: colores.borde,
      padding: espaciado.md,
      gap: espaciado.xs,
    },
    dato: { flexDirection: 'row', justifyContent: 'space-between', gap: espaciado.md },
    datoEtiqueta: { fontSize: tipografia.nota, color: colores.textoSuave },
    datoValor: {
      fontSize: tipografia.nota,
      color: colores.texto,
      fontWeight: '500',
      flexShrink: 1,
      textAlign: 'right',
    },
    nota: { fontSize: tipografia.nota, color: colores.textoSuave },
    opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
    opcion: {
      paddingHorizontal: espaciado.md,
      paddingVertical: espaciado.sm + 2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colores.borde,
      backgroundColor: colores.superficie,
    },
    opcionActiva: { backgroundColor: colores.destacado, borderColor: colores.destacado },
    opcionTexto: { fontSize: tipografia.nota + 1, color: colores.texto, fontWeight: '600' },
    opcionTextoActiva: { color: colores.destacadoTexto },
  });
