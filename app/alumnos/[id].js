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
import { db } from '../../src/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Boton, Campo, Cargando, Pantalla } from '../../src/components/ui';
import { fechaCorta } from '../../src/fechas';
import { formatoFecha, parsearFecha } from '../../src/validaciones';
import { evaluarAcceso, resumenDeAcceso } from '../../src/acceso';
import { colores, espaciado, radio, tipografia } from '../../src/theme';

const TICKETS_POR_CUPONERA = 20;

function finDelMes(referencia = new Date()) {
  return new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0, 23, 59, 59);
}

function Dato({ etiqueta, valor }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.datoEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.datoValor}>{valor}</Text>
    </View>
  );
}

export default function FichaDelAlumno() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { usuario, institucionId } = useAuth();
  const [alumno, setAlumno] = useState(undefined);
  const [monto, setMonto] = useState('');
  const [becaDesde, setBecaDesde] = useState('');
  const [becaHasta, setBecaHasta] = useState('');
  const [accion, setAccion] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    return onSnapshot(
      doc(db, 'usuarios', id),
      (instantanea) => setAlumno(instantanea.exists() ? { id: instantanea.id, ...instantanea.data() } : null),
      () => setAlumno(null)
    );
  }, [id]);

  function pedirConfirmacionDePago(tipo, etiqueta, ticketsOtorgados, cambiosEnUsuario) {
    const valor = Number(monto.replace(',', '.'));

    if (!monto.trim() || !Number.isFinite(valor) || valor < 0) {
      setAviso({ tipo: 'error', texto: 'Escribí el monto cobrado antes de registrar.' });
      return;
    }

    // El pago no se puede editar ni borrar después, así que se confirma antes.
    Alert.alert(
      'Confirmar cobro',
      `${etiqueta} a ${alumno.nombre} ${alumno.apellido} por $ ${valor}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Registrar', onPress: () => registrarPago(tipo, valor, ticketsOtorgados, cambiosEnUsuario) },
      ]
    );
  }

  async function registrarPago(tipo, valor, ticketsOtorgados, cambiosEnUsuario) {
    setAccion(tipo);
    setAviso(null);

    try {
      await updateDoc(doc(db, 'usuarios', id), cambiosEnUsuario);

      // El pago es un registro de auditoría: se crea y no se modifica nunca más.
      await addDoc(collection(db, 'pagos'), {
        institucionId,
        usuarioId: id,
        tipo,
        monto: valor,
        ticketsOtorgados,
        descuentoAplicado: alumno.beca?.tipo === 'media' ? 'media_beca' : null,
        registradoPor: usuario.uid,
        fecha: serverTimestamp(),
      });

      setMonto('');
      setAviso({ tipo: 'exito', texto: 'Pago registrado.' });
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo registrar el pago. Revisá la conexión.' });
    } finally {
      setAccion(null);
    }
  }

  async function asignarBeca(tipo) {
    const desde = parsearFecha(becaDesde);
    const hasta = parsearFecha(becaHasta);

    if (!desde || !hasta) {
      setAviso({ tipo: 'error', texto: 'Las fechas de la beca van en formato dd/mm/aaaa.' });
      return;
    }

    if (hasta <= desde) {
      setAviso({ tipo: 'error', texto: 'La fecha de fin tiene que ser posterior a la de inicio.' });
      return;
    }

    setAccion(`beca_${tipo}`);
    setAviso(null);

    try {
      await updateDoc(doc(db, 'usuarios', id), {
        beca: { tipo, desde: Timestamp.fromDate(desde), hasta: Timestamp.fromDate(hasta) },
      });
      setAviso({ tipo: 'exito', texto: 'Beca asignada.' });
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo asignar la beca.' });
    } finally {
      setAccion(null);
    }
  }

  async function cambiar(clave, cambios, mensaje) {
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

      <Campo
        etiqueta="Monto cobrado"
        value={monto}
        onChangeText={setMonto}
        keyboardType="decimal-pad"
        placeholder="0"
        ayuda={
          alumno.beca?.tipo === 'media'
            ? 'Tiene media beca: cobrale la mitad. Queda registrado como descuento.'
            : 'Queda guardado en el historial de pagos, que no se puede editar ni borrar.'
        }
      />

      <Boton
        titulo="Cobrar 1 ticket"
        onPress={() =>
          pedirConfirmacionDePago('ticket', 'Cobrar 1 ticket', 1, { tickets: increment(1) })
        }
        cargando={accion === 'ticket'}
        deshabilitado={Boolean(accion)}
      />

      <Boton
        titulo={`Cobrar cuponera (${TICKETS_POR_CUPONERA} tickets)`}
        onPress={() =>
          pedirConfirmacionDePago(
            'cuponera',
            `Cobrar una cuponera de ${TICKETS_POR_CUPONERA} tickets`,
            TICKETS_POR_CUPONERA,
            { tickets: increment(TICKETS_POR_CUPONERA) }
          )
        }
        cargando={accion === 'cuponera'}
        deshabilitado={Boolean(accion)}
      />

      {esInterno ? (
        <Boton
          titulo="Cobrar mensualidad del internado"
          onPress={() =>
            pedirConfirmacionDePago(
              'mensualidad_internado',
              `Cobrar la mensualidad hasta el ${fechaCorta(finDelMes())}`,
              0,
              { internado: { activo: true, mensualidadHasta: Timestamp.fromDate(finDelMes()) } }
            )
          }
          cargando={accion === 'mensualidad_internado'}
          deshabilitado={Boolean(accion)}
        />
      ) : null}

      <Text style={estilos.seccion}>Beca del comedor</Text>

      <Campo
        etiqueta="Desde"
        value={becaDesde}
        onChangeText={setBecaDesde}
        formato={formatoFecha}
        keyboardType="number-pad"
        placeholder="dd/mm/aaaa"
        maxLength={10}
      />
      <Campo
        etiqueta="Hasta"
        value={becaHasta}
        onChangeText={setBecaHasta}
        formato={formatoFecha}
        keyboardType="number-pad"
        placeholder="dd/mm/aaaa"
        maxLength={10}
      />

      <Boton
        titulo="Dar beca completa"
        onPress={() => asignarBeca('completa')}
        cargando={accion === 'beca_completa'}
        deshabilitado={Boolean(accion)}
      />
      <Boton
        titulo="Dar media beca"
        variante="secundario"
        onPress={() => asignarBeca('media')}
        cargando={accion === 'beca_media'}
        deshabilitado={Boolean(accion)}
      />

      {alumno.beca?.tipo ? (
        <Boton
          titulo="Quitar la beca"
          variante="peligro"
          cargando={accion === 'quitar_beca'}
          deshabilitado={Boolean(accion)}
          onPress={() =>
            Alert.alert('Quitar la beca', `¿Quitarle la beca a ${alumno.nombre}?`, [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Quitar',
                style: 'destructive',
                onPress: () => cambiar('quitar_beca', { beca: null }, 'Beca quitada.'),
              },
            ])
          }
        />
      ) : null}

      <Text style={estilos.seccion}>Internado</Text>

      <Boton
        titulo={esInterno ? 'Sacar del internado' : 'Marcar como alumno del internado'}
        variante="secundario"
        cargando={accion === 'internado'}
        deshabilitado={Boolean(accion)}
        onPress={() =>
          cambiar(
            'internado',
            esInterno
              ? { subrol: null, internado: null }
              : { subrol: 'internado', internado: { activo: true, mensualidadHasta: null } },
            esInterno ? 'Ya no figura en el internado.' : 'Quedó marcado como alumno del internado.'
          )
        }
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
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
});
