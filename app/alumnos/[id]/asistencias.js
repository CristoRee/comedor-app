import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../src/firebase';
import { Aviso, Cargando, Pantalla } from '../../../src/components/ui';
import { claveDeFecha, claveLegible, horaCorta } from '../../../src/fechas';
import { NOMBRE_COMIDA } from '../../../src/comedor';
import { espaciado, radio, tipografia } from '../../../src/theme';
import { useEstilos } from '../../../src/contexts/TemaContext';

const ETIQUETA_MEDIO = {
  ticket: 'Descontó 1 ticket',
  beca: 'Beca del comedor',
  internado: 'Internado',
};

// Una asistencia puede terminar de tres maneras, y al admin le sirve
// distinguirlas: el que subió, el que marcó y no apareció (que es lo que
// justifica las advertencias de los becarios), y el que avisó que no venía.
function situacionDe(asistencia, hoy) {
  if (asistencia.estado === 'presente') return 'subio';
  if (asistencia.estado === 'cancelado') return 'cancelo';
  return asistencia.fecha >= hoy ? 'pendiente' : 'falto';
}

export default function HistorialDeAsistencias() {
  const estilos = useEstilos(crearEstilos);
  const { id, nombre } = useLocalSearchParams();
  const router = useRouter();

  const [asistencias, setAsistencias] = useState(null);
  const [error, setError] = useState(null);

  const hoy = claveDeFecha();

  useEffect(() => {
    // Solo por usuarioId: un filtro de un campo no necesita índice compuesto.
    // El orden se hace del lado del cliente.
    const consulta = query(collection(db, 'asistencias'), where('usuarioId', '==', id));

    return onSnapshot(
      consulta,
      (instantanea) => {
        const lista = instantanea.docs.map((registro) => ({ id: registro.id, ...registro.data() }));
        lista.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
        setAsistencias(lista);
        setError(null);
      },
      () => {
        setAsistencias([]);
        setError('No se pudo cargar el historial de asistencias.');
      }
    );
  }, [id]);

  const resumen = useMemo(() => {
    if (!asistencias) return { subio: 0, falto: 0 };

    return asistencias.reduce(
      (total, asistencia) => {
        const situacion = situacionDe(asistencia, hoy);
        if (situacion === 'subio') total.subio += 1;
        if (situacion === 'falto') total.falto += 1;
        return total;
      },
      { subio: 0, falto: 0 }
    );
  }, [asistencias, hoy]);

  if (!asistencias) {
    return (
      <Pantalla scroll={false}>
        <Cargando texto="Cargando asistencias" />
      </Pantalla>
    );
  }

  return (
    <Pantalla scroll={false}>
      <Pressable onPress={() => router.replace(`/alumnos/${id}`)} hitSlop={8}>
        <Text style={estilos.volver}>‹ Ficha del alumno</Text>
      </Pressable>

      <Text style={estilos.titulo}>Historial de asistencias</Text>
      <Text style={estilos.subtitulo}>{nombre}</Text>

      <View style={estilos.resumen}>
        <View style={estilos.resumenItem}>
          <Text style={estilos.resumenValor}>{resumen.subio}</Text>
          <Text style={estilos.resumenEtiqueta}>
            {resumen.subio === 1 ? 'vez que subió' : 'veces que subió'}
          </Text>
        </View>
        <View style={estilos.resumenItem}>
          <Text style={[estilos.resumenValor, estilos.resumenFalto]}>{resumen.falto}</Text>
          <Text style={estilos.resumenEtiqueta}>
            {resumen.falto === 1 ? 'vez que marcó y no fue' : 'veces que marcó y no fue'}
          </Text>
        </View>
      </View>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <FlatList
        data={asistencias}
        keyExtractor={(asistencia) => asistencia.id}
        style={estilos.flex}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Aviso tipo="info" titulo="Sin movimientos">
            Este alumno todavía no marcó ninguna asistencia al comedor.
          </Aviso>
        }
        renderItem={({ item }) => {
          const situacion = situacionDe(item, hoy);
          const comidas = (item.comidas ?? []).map((comida) => NOMBRE_COMIDA[comida] ?? comida);

          return (
            <View style={estilos.fila}>
              <View style={estilos.filaTextos}>
                <Text style={estilos.fecha}>
                  {situacion === 'subio'
                    ? `${claveLegible(item.fecha)} · ${horaCorta(item.presenteEn)}`
                    : claveLegible(item.fecha)}
                </Text>

                {comidas.length ? (
                  <Text style={estilos.detalle}>{`Marcó para ${comidas.join(', ')}`}</Text>
                ) : null}

                {situacion === 'subio' && item.medioAcceso ? (
                  <Text style={estilos.detalle}>{ETIQUETA_MEDIO[item.medioAcceso] ?? item.medioAcceso}</Text>
                ) : null}
              </View>

              <Text
                style={[
                  estilos.estado,
                  situacion === 'subio' && estilos.estadoSubio,
                  situacion === 'falto' && estilos.estadoFalto,
                  situacion === 'cancelo' && estilos.estadoCancelo,
                  situacion === 'pendiente' && estilos.estadoPendiente,
                ]}
              >
                {situacion === 'subio' ? 'Subió' : null}
                {situacion === 'falto' ? 'No subió' : null}
                {situacion === 'cancelo' ? 'Canceló' : null}
                {situacion === 'pendiente' ? 'Marcó para hoy' : null}
              </Text>
            </View>
          );
        }}
      />
    </Pantalla>
  );
}

const crearEstilos = (colores) =>
  StyleSheet.create({
    flex: { flex: 1 },
    lista: { gap: espaciado.sm, paddingBottom: espaciado.lg },
    volver: { fontSize: tipografia.cuerpo, color: colores.primario, fontWeight: '600' },
    titulo: { fontSize: tipografia.titulo - 4, fontWeight: '700', color: colores.texto },
    subtitulo: { fontSize: tipografia.nota + 1, color: colores.textoSuave, marginTop: -espaciado.sm },

    resumen: {
      flexDirection: 'row',
      gap: espaciado.md,
      backgroundColor: colores.superficie,
      borderRadius: radio.lg,
      borderWidth: 1,
      borderColor: colores.borde,
      padding: espaciado.md,
    },
    resumenItem: { flex: 1, alignItems: 'center', gap: 2 },
    resumenValor: { fontSize: 32, fontWeight: '800', color: colores.exito },
    resumenFalto: { color: colores.advertencia },
    resumenEtiqueta: { fontSize: tipografia.nota, color: colores.textoSuave, textAlign: 'center' },

    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espaciado.md,
      backgroundColor: colores.superficie,
      borderRadius: radio.md,
      borderWidth: 1,
      borderColor: colores.borde,
      padding: espaciado.md,
    },
    filaTextos: { flex: 1, gap: 2 },
    fecha: { fontSize: tipografia.cuerpo, fontWeight: '600', color: colores.texto },
    detalle: { fontSize: tipografia.nota, color: colores.textoSuave },
    estado: { fontSize: tipografia.nota, fontWeight: '700' },
    estadoSubio: { color: colores.exito },
    estadoFalto: { color: colores.advertencia },
    estadoCancelo: { color: colores.textoSuave },
    estadoPendiente: { color: colores.primario },
  });
