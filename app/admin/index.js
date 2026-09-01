import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../src/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Boton, Cargando, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';
import { Navegacion } from '../../src/components/Navegacion';
import { colores, espaciado, radio, tipografia } from '../../src/theme';

function fechaCorta(marca) {
  return marca?.toDate ? marca.toDate().toLocaleDateString('es-UY') : '—';
}

function Dato({ etiqueta, valor }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.datoEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.datoValor}>{valor}</Text>
    </View>
  );
}

export default function Solicitudes() {
  const { usuario, institucionId, institucion } = useAuth();
  const [solicitudes, setSolicitudes] = useState(null);
  const [procesando, setProcesando] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!institucionId) {
      setSolicitudes([]);
      return undefined;
    }

    const consulta = query(
      collection(db, 'usuarios'),
      where('institucionId', '==', institucionId),
      where('estado', '==', 'pendiente')
    );

    return onSnapshot(
      consulta,
      (instantanea) => {
        const lista = instantanea.docs.map((registro) => ({ id: registro.id, ...registro.data() }));
        lista.sort((a, b) => (a.creadoEn?.seconds ?? 0) - (b.creadoEn?.seconds ?? 0));
        setSolicitudes(lista);
        setError(null);
      },
      () => {
        setSolicitudes([]);
        setError('No se pudo cargar la lista de registros pendientes.');
      }
    );
  }, [institucionId]);

  async function resolver(solicitud, estado) {
    setProcesando(solicitud.id);
    setError(null);

    try {
      await updateDoc(doc(db, 'usuarios', solicitud.id), {
        estado,
        aprobadoPor: usuario.uid,
        aprobadoEn: serverTimestamp(),
      });
    } catch {
      setError('No se pudo actualizar el registro. Revisá la conexión e intentá de nuevo.');
    } finally {
      setProcesando(null);
    }
  }

  async function aprobar(solicitud) {
    setProcesando(solicitud.id);
    setError(null);

    let duplicado;
    try {
      // La cédula se controla dentro de la institución: la misma persona puede
      // existir en otra sin que eso sea un conflicto.
      const mismaCedula = await getDocs(
        query(
          collection(db, 'usuarios'),
          where('institucionId', '==', institucionId),
          where('ci', '==', solicitud.ci)
        )
      );
      duplicado = mismaCedula.docs.find(
        (registro) => registro.id !== solicitud.id && registro.data().estado === 'activo'
      );
    } catch {
      setProcesando(null);
      setError('No se pudo verificar la cédula. Intentá de nuevo.');
      return;
    }

    setProcesando(null);

    if (duplicado) {
      const otro = duplicado.data();
      Alert.alert(
        'Cédula ya registrada',
        `La cédula ${solicitud.ci} figura a nombre de ${otro.nombre} ${otro.apellido}, con la cuenta activa.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aprobar igual', onPress: () => resolver(solicitud, 'activo') },
        ]
      );
      return;
    }

    resolver(solicitud, 'activo');
  }

  function rechazar(solicitud) {
    Alert.alert(
      'Rechazar registro',
      `¿Rechazar el registro de ${solicitud.nombre} ${solicitud.apellido}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Rechazar', style: 'destructive', onPress: () => resolver(solicitud, 'rechazado') },
      ]
    );
  }

  if (!solicitudes) {
    return (
      <Pantalla scroll={false}>
        <Cargando texto="Cargando registros" />
      </Pantalla>
    );
  }

  return (
    <Pantalla scroll={false}>
      <Encabezado
        titulo="Registros pendientes"
        subtitulo={institucion?.nombre}
        nota={
          solicitudes.length === 1
            ? '1 registro esperando aprobación'
            : `${solicitudes.length} registros esperando aprobación`
        }
      />

      <Navegacion
        opciones={[
          { titulo: 'Registros', ruta: '/admin' },
          { titulo: 'Alumnos', ruta: '/alumnos' },
          { titulo: 'Comedor', ruta: '/comedor' },
        ]}
      />

      {!institucionId ? (
        <Aviso tipo="error" titulo="Sin institución asignada">
          Tu usuario no tiene una institución asignada. Hay que ejecutar el script asignar-rol.js
          indicando a qué institución pertenece.
        </Aviso>
      ) : null}

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <FlatList
        data={solicitudes}
        keyExtractor={(solicitud) => solicitud.id}
        style={estilos.flex}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          institucionId ? (
            <Aviso tipo="info" titulo="Todo al día">
              No hay registros esperando aprobación.
            </Aviso>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={estilos.tarjeta}>
            <Text style={estilos.nombre}>{`${item.nombre} ${item.apellido}`}</Text>

            <View style={estilos.datos}>
              <Dato etiqueta="Cédula" valor={item.ci} />
              <Dato etiqueta="Nacimiento" valor={fechaCorta(item.fechaNacimiento)} />
              <Dato etiqueta="Correo" valor={item.email} />
              <Dato etiqueta="Teléfono" valor={item.telefono} />
              <Dato etiqueta="Registrado" valor={fechaCorta(item.creadoEn)} />
            </View>

            <View style={estilos.acciones}>
              <View style={estilos.accion}>
                <Boton
                  titulo="Aprobar"
                  onPress={() => aprobar(item)}
                  cargando={procesando === item.id}
                />
              </View>
              <View style={estilos.accion}>
                <Boton
                  titulo="Rechazar"
                  variante="secundario"
                  onPress={() => rechazar(item)}
                  deshabilitado={procesando === item.id}
                />
              </View>
            </View>
          </View>
        )}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  lista: { gap: espaciado.md, paddingBottom: espaciado.lg },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.md,
  },
  nombre: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto },
  datos: { gap: espaciado.xs },
  dato: { flexDirection: 'row', justifyContent: 'space-between', gap: espaciado.md },
  datoEtiqueta: { fontSize: tipografia.nota, color: colores.textoSuave },
  datoValor: { fontSize: tipografia.nota, color: colores.texto, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  acciones: { flexDirection: 'row', gap: espaciado.sm },
  accion: { flex: 1 },
});
