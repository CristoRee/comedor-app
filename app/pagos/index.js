import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Boton, Campo, Cargando, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';
import { Navegacion } from '../../src/components/Navegacion';
import { fechaCorta, horaCorta } from '../../src/fechas';
import { navegacionDe, permisoDelAdmin } from '../../src/permisos';
import {
  CONCEPTOS,
  conceptoDe,
  formatearMonto,
  normalizarPrecio,
  precioDe,
} from '../../src/precios';
import { colores, espaciado, radio, tipografia } from '../../src/theme';

const CAMPOS_DE_PRECIO = CONCEPTOS.map((concepto) => ({
  clave: concepto.clavePrecio,
  etiqueta: concepto.titulo,
  ayuda: concepto.detalle,
}));

function textoDePrecio(institucion, clave) {
  const valor = precioDe(institucion, clave);
  return valor === null ? '' : String(valor);
}

export default function RegistroDePagos() {
  const { usuarioId, usuarioNombre } = useLocalSearchParams();
  const router = useRouter();
  const { rol, institucionId, institucion } = useAuth();

  const [pagos, setPagos] = useState(null);
  const [error, setError] = useState(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [precios, setPrecios] = useState({});
  const [erroresDePrecio, setErroresDePrecio] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const puedeAjustar = permisoDelAdmin(institucion, 'ajustarPrecios');
  const filtrado = Boolean(usuarioId);

  useEffect(() => {
    setPrecios(
      CAMPOS_DE_PRECIO.reduce(
        (total, campo) => ({ ...total, [campo.clave]: textoDePrecio(institucion, campo.clave) }),
        {}
      )
    );
  }, [institucion]);

  useEffect(() => {
    if (!institucionId) return undefined;

    // Sin orderBy: ordenar del lado del cliente evita depender de un índice
    // compuesto que habría que crear a mano en cada despliegue.
    const consulta = filtrado
      ? query(collection(db, 'pagos'), where('usuarioId', '==', usuarioId))
      : query(collection(db, 'pagos'), where('institucionId', '==', institucionId));

    return onSnapshot(
      consulta,
      (instantanea) => {
        const lista = instantanea.docs.map((registro) => ({ id: registro.id, ...registro.data() }));
        lista.sort((a, b) => (b.fecha?.seconds ?? 0) - (a.fecha?.seconds ?? 0));
        setPagos(lista);
        setError(null);
      },
      () => {
        setPagos([]);
        setError('No se pudo cargar el registro de pagos.');
      }
    );
  }, [institucionId, usuarioId, filtrado]);

  const totales = useMemo(() => {
    if (!pagos) return { cantidad: 0, recaudado: 0 };

    return pagos.reduce(
      (total, pago) => ({
        cantidad: total.cantidad + 1,
        recaudado: total.recaudado + (typeof pago.monto === 'number' ? pago.monto : 0),
      }),
      { cantidad: 0, recaudado: 0 }
    );
  }, [pagos]);

  async function guardarPrecios() {
    const revisados = {};
    const fallos = {};

    for (const campo of CAMPOS_DE_PRECIO) {
      const { vacio, valor } = normalizarPrecio(precios[campo.clave]);

      if (vacio) {
        revisados[campo.clave] = null;
        continue;
      }

      if (valor === null) {
        fallos[campo.clave] = 'Escribí un número mayor o igual a cero.';
        continue;
      }

      revisados[campo.clave] = valor;
    }

    setErroresDePrecio(fallos);
    if (Object.keys(fallos).length) return;

    setGuardando(true);
    setAviso(null);

    try {
      await updateDoc(doc(db, 'instituciones', institucionId), { precios: revisados });
      setAviso({ tipo: 'exito', texto: 'Precios actualizados.' });
      setPanelAbierto(false);
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudieron guardar los precios. Revisá la conexión.' });
    } finally {
      setGuardando(false);
    }
  }

  if (!pagos) {
    return (
      <Pantalla scroll={false}>
        <Cargando texto="Cargando pagos" />
      </Pantalla>
    );
  }

  return (
    <Pantalla scroll={false}>
      <Encabezado
        titulo={filtrado ? 'Pagos del alumno' : 'Registro de pagos'}
        subtitulo={filtrado ? usuarioNombre : institucion?.nombre}
        nota={`${totales.cantidad} ${totales.cantidad === 1 ? 'cobro' : 'cobros'} · ${formatearMonto(totales.recaudado)} recaudados`}
      />

      {filtrado ? (
        <Boton
          titulo="Volver a la ficha del alumno"
          variante="secundario"
          onPress={() => router.replace(`/alumnos/${usuarioId}`)}
        />
      ) : (
        <Navegacion opciones={navegacionDe(rol, institucion)} />
      )}

      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      {!filtrado && puedeAjustar ? (
        <Boton
          titulo={panelAbierto ? 'Cerrar los precios' : 'Ajustar precios'}
          variante="secundario"
          onPress={() => setPanelAbierto((previo) => !previo)}
        />
      ) : null}

      {!filtrado && puedeAjustar && panelAbierto ? (
        <View style={estilos.panel}>
          <Text style={estilos.panelTitulo}>Precios de la institución</Text>
          <Text style={estilos.panelNota}>
            Dejá un precio vacío si tu institución no cobra ese concepto: el botón queda
            deshabilitado en la ficha del alumno.
          </Text>

          {CAMPOS_DE_PRECIO.map((campo) => (
            <Campo
              key={campo.clave}
              etiqueta={campo.etiqueta}
              value={precios[campo.clave] ?? ''}
              onChangeText={(valor) => {
                setPrecios((previos) => ({ ...previos, [campo.clave]: valor }));
                setErroresDePrecio((previos) => ({ ...previos, [campo.clave]: null }));
              }}
              error={erroresDePrecio[campo.clave]}
              ayuda={campo.ayuda}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          ))}

          <Boton titulo="Guardar precios" onPress={guardarPrecios} cargando={guardando} />
        </View>
      ) : null}

      <FlatList
        data={pagos}
        keyExtractor={(pago) => pago.id}
        style={estilos.flex}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Aviso tipo="info" titulo="Sin movimientos">
            {filtrado
              ? 'Este alumno todavía no tiene pagos registrados.'
              : 'Todavía no se registró ningún cobro en esta institución.'}
          </Aviso>
        }
        renderItem={({ item }) => {
          const concepto = conceptoDe(item.tipo);

          return (
            <View style={estilos.fila}>
              <View style={estilos.filaTextos}>
                <Text style={estilos.concepto}>{concepto?.titulo ?? item.tipo}</Text>
                {!filtrado ? <Text style={estilos.alumno}>{item.usuarioNombre}</Text> : null}
                <Text style={estilos.fecha}>
                  {`${fechaCorta(item.fecha)} · ${horaCorta(item.fecha)}`}
                </Text>
                {item.descuentoAplicado === 'media_beca' ? (
                  <Text style={estilos.descuento}>
                    {`Media beca aplicada sobre ${formatearMonto(item.precioBase)}`}
                  </Text>
                ) : null}
              </View>

              <Text style={estilos.monto}>{formatearMonto(item.monto)}</Text>
            </View>
          );
        }}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  lista: { gap: espaciado.sm, paddingBottom: espaciado.lg },
  panel: {
    backgroundColor: '#eef1f5',
    borderRadius: radio.lg,
    padding: espaciado.md,
    gap: espaciado.md,
  },
  panelTitulo: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto },
  panelNota: { fontSize: tipografia.nota, color: colores.textoSuave },
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
  concepto: { fontSize: tipografia.cuerpo, fontWeight: '600', color: colores.texto },
  alumno: { fontSize: tipografia.nota, color: colores.texto },
  fecha: { fontSize: tipografia.nota, color: colores.textoSuave },
  descuento: { fontSize: tipografia.nota, color: colores.advertencia },
  monto: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.exito },
});
