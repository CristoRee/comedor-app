import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { Aviso, Boton, Campo, Opcion, Pantalla, Subtitulo, Titulo } from '../../src/components/ui';
import departamentos from '../../src/departamentos.json';
import { mensajeDeError } from '../../src/validaciones';
import { espaciado, radio, tipografia } from '../../src/theme';
import { useEstilos } from '../../src/contexts/TemaContext';

const CONFIGURACION_INICIAL = {
  horarios: {
    horaLimiteMenu: '08:00',
    finDesayuno: '08:00',
    finAlmuerzo: '13:00',
    finMerienda: '18:00',
    finCena: '23:00',
  },
  edadCorteChicoGrande: 15,
  subroles: {
    internado: { activo: true, comidasHabilitadas: ['desayuno', 'almuerzo', 'merienda', 'cena'] },
  },
  contadores: { mostrarDesayuno: true, mostrarChicoGrande: true },
  precios: { ticket: null, cuponera: null, mensualidadInternado: null },
  permisosDelAdmin: { ajustarPrecios: true, verRegistroDePagos: true, verContadores: true },
};

// El id va en la URL del documento: sin espacios, acentos ni mayúsculas.
function sugerirId(nombre, ciudad) {
  const limpiar = (texto) =>
    (texto ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const base = limpiar(nombre).split('-').slice(0, 2).join('-');
  const lugar = limpiar(ciudad);

  return [base, lugar].filter(Boolean).join('-').slice(0, 40);
}

function validarHora(texto) {
  if (!texto.trim()) return 'Campo obligatorio.';
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(texto.trim()) ? null : 'Usá el formato hh:mm.';
}

export default function NuevaInstitucion() {
  const estilos = useEstilos(crearEstilos);
  const router = useRouter();

  const [departamento, setDepartamento] = useState(null);
  const [nombre, setNombre] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [identificador, setIdentificador] = useState('');
  const [apertura, setApertura] = useState('11:30');
  const [errores, setErrores] = useState({});
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);

  const idFinal = (identificador.trim() || sugerirId(nombre, ciudad)).toLowerCase();

  async function crear() {
    const revision = {
      nombre: nombre.trim().length >= 3 ? null : 'Escribí el nombre completo.',
      ciudad: ciudad.trim().length >= 2 ? null : 'Campo obligatorio.',
      apertura: validarHora(apertura),
      identificador: /^[a-z0-9-]{3,40}$/.test(idFinal)
        ? null
        : 'Solo minúsculas, números y guiones.',
    };

    setErrores(revision);
    if (Object.values(revision).some(Boolean)) return;

    setCreando(true);
    setError(null);

    try {
      const referencia = doc(db, 'instituciones', idFinal);

      if ((await getDoc(referencia)).exists()) {
        setErrores({ identificador: 'Ya existe una institución con ese identificador.' });
        setCreando(false);
        return;
      }

      await setDoc(referencia, {
        nombre: nombre.trim(),
        departamento,
        ciudad: ciudad.trim(),
        activa: true,
        creadaEn: serverTimestamp(),
        ...CONFIGURACION_INICIAL,
        horarios: { horaAperturaComedor: apertura.trim(), ...CONFIGURACION_INICIAL.horarios },
      });

      router.replace(`/superadmin/${idFinal}`);
    } catch (fallo) {
      setError(mensajeDeError(fallo));
      setCreando(false);
    }
  }

  if (!departamento) {
    return (
      <Pantalla scroll={false}>
        <Pressable onPress={() => router.replace('/superadmin')} hitSlop={8}>
          <Text style={estilos.volver}>‹ Instituciones</Text>
        </Pressable>

        <Titulo>Nueva institución</Titulo>
        <Subtitulo>Elegí el departamento donde está.</Subtitulo>

        <FlatList
          data={departamentos}
          keyExtractor={(nombreDepartamento) => nombreDepartamento}
          style={estilos.flex}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <Opcion titulo={item} onPress={() => setDepartamento(item)} />}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Pressable onPress={() => setDepartamento(null)} hitSlop={8}>
        <Text style={estilos.volver}>‹ Departamento</Text>
      </Pressable>

      <Titulo>Nueva institución</Titulo>
      <Subtitulo>{departamento}</Subtitulo>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <Campo
        etiqueta="Nombre"
        value={nombre}
        onChangeText={(valor) => {
          setNombre(valor);
          setErrores((previos) => ({ ...previos, nombre: null }));
        }}
        error={errores.nombre}
        autoCapitalize="words"
        placeholder="Polo Educativo Tecnológico"
      />

      <Campo
        etiqueta="Ciudad"
        value={ciudad}
        onChangeText={(valor) => {
          setCiudad(valor);
          setErrores((previos) => ({ ...previos, ciudad: null }));
        }}
        error={errores.ciudad}
        autoCapitalize="words"
        placeholder="Rivera"
      />

      <Campo
        etiqueta="Hora de apertura del comedor"
        value={apertura}
        onChangeText={(valor) => {
          setApertura(valor);
          setErrores((previos) => ({ ...previos, apertura: null }));
        }}
        error={errores.apertura}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        placeholder="11:30"
      />

      <Campo
        etiqueta="Identificador"
        value={identificador}
        onChangeText={(valor) => {
          setIdentificador(valor);
          setErrores((previos) => ({ ...previos, identificador: null }));
        }}
        error={errores.identificador}
        autoCapitalize="none"
        autoCorrect={false}
        ayuda={`Si lo dejás vacío se usa "${sugerirId(nombre, ciudad) || 'nombre-ciudad'}". No se puede cambiar después.`}
        placeholder="polo-rivera"
      />

      <View style={estilos.resumen}>
        <Text style={estilos.resumenTitulo}>Queda activa y lista para recibir registros</Text>
        <Text style={estilos.resumenTexto}>
          Los precios arrancan sin cargar y los permisos del admin, todos activados. Se ajustan
          después desde la ficha de la institución.
        </Text>
      </View>

      <Boton titulo="Registrar institución" onPress={crear} cargando={creando} />
    </Pantalla>
  );
}

const crearEstilos = (colores) =>
  StyleSheet.create({
    flex: { flex: 1 },
    lista: { gap: espaciado.sm, paddingBottom: espaciado.lg },
    volver: { fontSize: tipografia.cuerpo, color: colores.primario, fontWeight: '600' },
    resumen: {
      backgroundColor: colores.superficieAlterna,
      borderRadius: radio.md,
      padding: espaciado.md,
      gap: espaciado.xs,
    },
    resumenTitulo: { fontSize: tipografia.nota + 1, fontWeight: '700', color: colores.texto },
    resumenTexto: { fontSize: tipografia.nota, color: colores.textoSuave },
  });
