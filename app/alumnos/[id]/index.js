import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../../src/firebase';
import { useAuth } from '../../../src/contexts/AuthContext';
import { Aviso, Boton, Campo, Cargando, Pantalla } from '../../../src/components/ui';
import { fechaCorta } from '../../../src/fechas';
import { parsearFecha, formatoFecha } from '../../../src/validaciones';
import { evaluarAcceso, resumenDeAcceso } from '../../../src/acceso';
import { permisoDelAdmin } from '../../../src/permisos';
import { CONCEPTOS, cobroDe, formatearMonto } from '../../../src/precios';
import { espaciado, radio, tipografia } from '../../../src/theme';
import { useEstilos } from '../../../src/contexts/TemaContext';

function finDelMes(referencia = new Date()) {
  return new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0, 23, 59, 59);
}

function Dato({ etiqueta, valor }) {
  const estilos = useEstilos(crearEstilos);
  return (
    <View style={estilos.dato}>
      <Text style={estilos.datoEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.datoValor}>{valor}</Text>
    </View>
  );
}

export default function FichaDelAlumno() {
  const estilos = useEstilos(crearEstilos);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { usuario, institucionId, institucion } = useAuth();

  const [alumno, setAlumno] = useState(undefined);
  const [becaDesde, setBecaDesde] = useState('');
  const [becaHasta, setBecaHasta] = useState('');
  const [erroresBeca, setErroresBeca] = useState({});
  const [accion, setAccion] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    return onSnapshot(
      doc(db, 'usuarios', id),
      (instantanea) =>
        setAlumno(instantanea.exists() ? { id: instantanea.id, ...instantanea.data() } : null),
      () => setAlumno(null)
    );
  }, [id]);

  function revisarFechasDeBeca() {
    const desde = parsearFecha(becaDesde);
    const hasta = parsearFecha(becaHasta);
    const fallos = {};

    if (!becaDesde.trim()) fallos.desde = 'Campo obligatorio.';
    else if (!desde) fallos.desde = 'Usá el formato dd/mm/aaaa.';

    if (!becaHasta.trim()) fallos.hasta = 'Campo obligatorio.';
    else if (!hasta) fallos.hasta = 'Usá el formato dd/mm/aaaa.';
    else if (desde && hasta <= desde) fallos.hasta = 'Tiene que ser posterior a la fecha de inicio.';

    return { desde, hasta, fallos };
  }

  async function registrarPago(concepto, cobro, cambiosEnUsuario) {
    setAccion(concepto.tipo);
    setAviso(null);

    try {
      await updateDoc(doc(db, 'usuarios', id), cambiosEnUsuario);

      // El pago es un registro de auditoría: se crea y no se modifica nunca
      // más. Se guarda el precio de lista del momento para que el historial
      // siga siendo legible aunque después cambien los precios.
      await addDoc(collection(db, 'pagos'), {
        institucionId,
        usuarioId: id,
        usuarioNombre: `${alumno.nombre} ${alumno.apellido}`,
        tipo: concepto.tipo,
        monto: cobro.monto,
        precioBase: cobro.precioBase,
        ticketsOtorgados: concepto.tickets,
        descuentoAplicado: cobro.descuentoAplicado,
        registradoPor: usuario.uid,
        fecha: serverTimestamp(),
      });

      setAviso({ tipo: 'exito', texto: `Cobro registrado: ${formatearMonto(cobro.monto)}.` });
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo registrar el pago. Revisá la conexión.' });
    } finally {
      setAccion(null);
    }
  }

  function confirmarCobro(concepto) {
    const cobro = cobroDe(institucion, alumno, concepto);

    const cambiosEnUsuario =
      concepto.tipo === 'mensualidad_internado'
        ? { internado: { activo: true, mensualidadHasta: Timestamp.fromDate(finDelMes()) } }
        : { tickets: increment(concepto.tickets) };

    const detalle =
      cobro.descuentoAplicado === 'media_beca'
        ? `${concepto.titulo} a ${alumno.nombre} ${alumno.apellido} por ${formatearMonto(cobro.monto)} (media beca sobre ${formatearMonto(cobro.precioBase)}).`
        : `${concepto.titulo} a ${alumno.nombre} ${alumno.apellido} por ${formatearMonto(cobro.monto)}.`;

    Alert.alert('Confirmar cobro', detalle, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Registrar', onPress: () => registrarPago(concepto, cobro, cambiosEnUsuario) },
    ]);
  }

  async function aplicarCambio(clave, cambios, mensaje) {
    setAccion(clave);
    setAviso(null);

    try {
      await updateDoc(doc(db, 'usuarios', id), cambios);
      setAviso({ tipo: 'exito', texto: mensaje });
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo guardar el cambio.' });
    } finally {
      setAccion(null);
    }
  }

  function confirmarBeca(tipo) {
    const { desde, hasta, fallos } = revisarFechasDeBeca();

    setErroresBeca(fallos);
    if (Object.keys(fallos).length) return;

    const nombre = tipo === 'completa' ? 'beca completa' : 'media beca';

    Alert.alert(
      'Confirmar beca',
      `Dar ${nombre} a ${alumno.nombre} ${alumno.apellido}, del ${fechaCorta(desde)} al ${fechaCorta(hasta)}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Asignar',
          onPress: () =>
            aplicarCambio(
              `beca_${tipo}`,
              { beca: { tipo, desde: Timestamp.fromDate(desde), hasta: Timestamp.fromDate(hasta) } },
              `${nombre.charAt(0).toUpperCase() + nombre.slice(1)} asignada.`
            ),
        },
      ]
    );
  }

  function confirmarQuitarBeca() {
    Alert.alert('Quitar la beca', `¿Quitarle la beca a ${alumno.nombre} ${alumno.apellido}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => aplicarCambio('quitar_beca', { beca: null }, 'Beca quitada.'),
      },
    ]);
  }

  function confirmarInternado(esInterno) {
    const detalle = esInterno
      ? `${alumno.nombre} ${alumno.apellido} deja de figurar en el internado y pierde la mensualidad cargada.`
      : `${alumno.nombre} ${alumno.apellido} pasa a figurar en el internado y podrá marcar las comidas habilitadas.`;

    Alert.alert(esInterno ? 'Sacar del internado' : 'Marcar como internado', detalle, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: esInterno ? 'Sacar' : 'Marcar',
        style: esInterno ? 'destructive' : 'default',
        onPress: () =>
          aplicarCambio(
            'internado',
            esInterno
              ? { subrol: null, internado: null }
              : { subrol: 'internado', internado: { activo: true, mensualidadHasta: null } },
            esInterno ? 'Ya no figura en el internado.' : 'Quedó marcado como alumno del internado.'
          ),
      },
    ]);
  }

  if (alumno === undefined) {
    return (
      <Pantalla scroll={false}>
        <Cargando />
      </Pantalla>
    );
  }

  if (!alumno) {
    return (
      <Pantalla>
        <Aviso tipo="error" titulo="Alumno no encontrado">
          Puede haber sido eliminado.
        </Aviso>
        <Boton titulo="Volver" variante="secundario" onPress={() => router.replace('/alumnos')} />
      </Pantalla>
    );
  }

  const acceso = evaluarAcceso(alumno);
  const esInterno = alumno.subrol === 'internado';
  const conceptosVisibles = CONCEPTOS.filter((concepto) => !concepto.soloInternado || esInterno);
  const puedeVerPagos = permisoDelAdmin(institucion, 'verRegistroDePagos');
  const puedeAjustarPrecios = permisoDelAdmin(institucion, 'ajustarPrecios');

  return (
    <Pantalla>
      <Pressable onPress={() => router.replace('/alumnos')} hitSlop={8}>
        <Text style={estilos.volver}>‹ Alumnos</Text>
      </Pressable>

      <Text style={estilos.nombre}>{`${alumno.nombre} ${alumno.apellido}`}</Text>

      <View style={estilos.tarjeta}>
        <Dato etiqueta="Cédula" valor={alumno.ci} />
        <Dato etiqueta="Nacimiento" valor={fechaCorta(alumno.fechaNacimiento)} />
        <Dato etiqueta="Correo" valor={alumno.email} />
        <Dato etiqueta="Teléfono" valor={alumno.telefono} />
        <Dato etiqueta="Tickets" valor={String(alumno.tickets ?? 0)} />
        <Dato
          etiqueta="Beca"
          valor={
            alumno.beca?.tipo
              ? `${alumno.beca.tipo} · hasta ${fechaCorta(alumno.beca.hasta)}`
              : 'sin beca'
          }
        />
        <Dato
          etiqueta="Internado"
          valor={
            esInterno
              ? `sí · mensualidad hasta ${fechaCorta(alumno.internado?.mensualidadHasta)}`
              : 'no'
          }
        />
      </View>

      <Aviso tipo={acceso.permitido ? 'exito' : 'advertencia'} titulo="Acceso al comedor">
        {resumenDeAcceso(alumno)}
      </Aviso>

      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

      <Text style={estilos.seccion}>Registrar un pago</Text>

      {conceptosVisibles.map((concepto) => {
        const cobro = cobroDe(institucion, alumno, concepto);
        const sinPrecio = cobro.monto === null;

        return (
          <View key={concepto.tipo} style={estilos.concepto}>
            <Boton
              titulo={
                sinPrecio
                  ? `${concepto.titulo} — sin precio`
                  : `${concepto.titulo} — ${formatearMonto(cobro.monto)}`
              }
              onPress={() => confirmarCobro(concepto)}
              cargando={accion === concepto.tipo}
              deshabilitado={sinPrecio || Boolean(accion)}
            />
            {cobro.descuentoAplicado === 'media_beca' ? (
              <Text style={estilos.notaConcepto}>
                {`Media beca: la mitad de ${formatearMonto(cobro.precioBase)}.`}
              </Text>
            ) : null}
          </View>
        );
      })}

      {conceptosVisibles.some((concepto) => cobroDe(institucion, alumno, concepto).monto === null) ? (
        <Aviso tipo="advertencia" titulo="Faltan precios">
          {puedeAjustarPrecios
            ? 'Cargalos desde Pagos → Ajustar precios para poder cobrar.'
            : 'Pedile al administrador del sistema que cargue los precios de tu institución.'}
        </Aviso>
      ) : null}

      {puedeVerPagos ? (
        <Boton
          titulo="Ver historial de pagos"
          variante="secundario"
          onPress={() =>
            router.push({
              pathname: '/pagos',
              params: { usuarioId: id, usuarioNombre: `${alumno.nombre} ${alumno.apellido}` },
            })
          }
        />
      ) : null}

      <Boton
        titulo="Ver historial de asistencias"
        variante="secundario"
        onPress={() =>
          router.push({
            pathname: `/alumnos/${id}/asistencias`,
            params: { nombre: `${alumno.nombre} ${alumno.apellido}` },
          })
        }
      />

      <Text style={estilos.seccion}>Beca del comedor</Text>

      <Campo
        etiqueta="Desde"
        value={becaDesde}
        onChangeText={(valor) => {
          setBecaDesde(valor);
          setErroresBeca((previos) => ({ ...previos, desde: null }));
        }}
        error={erroresBeca.desde}
        formato={formatoFecha}
        keyboardType="number-pad"
        placeholder="dd/mm/aaaa"
      />

      <Campo
        etiqueta="Hasta"
        value={becaHasta}
        onChangeText={(valor) => {
          setBecaHasta(valor);
          setErroresBeca((previos) => ({ ...previos, hasta: null }));
        }}
        error={erroresBeca.hasta}
        formato={formatoFecha}
        keyboardType="number-pad"
        placeholder="dd/mm/aaaa"
      />

      <Boton
        titulo="Dar beca completa"
        onPress={() => confirmarBeca('completa')}
        cargando={accion === 'beca_completa'}
        deshabilitado={Boolean(accion)}
      />

      <Boton
        titulo="Dar media beca"
        variante="secundario"
        onPress={() => confirmarBeca('media')}
        cargando={accion === 'beca_media'}
        deshabilitado={Boolean(accion)}
      />

      {alumno.beca?.tipo ? (
        <Boton
          titulo="Quitar la beca"
          variante="peligro"
          onPress={confirmarQuitarBeca}
          cargando={accion === 'quitar_beca'}
          deshabilitado={Boolean(accion)}
        />
      ) : null}

      <Text style={estilos.seccion}>Internado</Text>

      <Boton
        titulo={esInterno ? 'Sacar del internado' : 'Marcar como alumno del internado'}
        variante="secundario"
        onPress={() => confirmarInternado(esInterno)}
        cargando={accion === 'internado'}
        deshabilitado={Boolean(accion)}
      />
    </Pantalla>
  );
}

const crearEstilos = (colores) =>
  StyleSheet.create({
  volver: { fontSize: tipografia.cuerpo, color: colores.primario, fontWeight: '600' },
  nombre: { fontSize: tipografia.titulo - 4, fontWeight: '700', color: colores.texto },
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
  seccion: {
    fontSize: tipografia.subtitulo,
    fontWeight: '700',
    color: colores.texto,
    marginTop: espaciado.sm,
  },
  concepto: { gap: espaciado.xs },
  notaConcepto: { fontSize: tipografia.nota, color: colores.advertencia },
});
