import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../../src/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Boton, Campo, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';
import { Navegacion } from '../../src/components/Navegacion';
import { navegacionDe } from '../../src/permisos';
import { claveDeFecha, horaCorta } from '../../src/fechas';
import { comidasDelSubrol, idAsistencia } from '../../src/comedor';
import { evaluarAcceso, resumenDeAcceso } from '../../src/acceso';
import { formatoCedula, limpiarNumeros } from '../../src/validaciones';
import { espaciado, radio, tipografia } from '../../src/theme';
import { useEstilos } from '../../src/contexts/TemaContext';

export default function BusquedaManual() {
  const estilos = useEstilos(crearEstilos);
  const { usuario, rol, institucion, institucionId } = useAuth();
  const [cedula, setCedula] = useState('');
  const [alumno, setAlumno] = useState(undefined);
  const [buscando, setBuscando] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function buscar() {
    const digitos = limpiarNumeros(cedula);

    if (digitos.length < 7) {
      setAviso({ tipo: 'error', texto: 'Escribí la cédula completa, sin puntos ni guiones.' });
      return;
    }

    setBuscando(true);
    setAviso(null);
    setAlumno(undefined);

    try {
      const resultado = await getDocs(
        query(
          collection(db, 'usuarios'),
          where('institucionId', '==', institucionId),
          where('ci', '==', digitos)
        )
      );

      const encontrado = resultado.docs.find((registro) => registro.data().estado === 'activo');
      setAlumno(encontrado ? { id: encontrado.id, ...encontrado.data() } : null);
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo buscar. Revisá la conexión.' });
    } finally {
      setBuscando(false);
    }
  }

  async function marcarPresente() {
    setMarcando(true);
    setAviso(null);

    const hoy = claveDeFecha();

    try {
      await runTransaction(db, async (transaccion) => {
        const referenciaAsistencia = doc(db, 'asistencias', idAsistencia(institucionId, hoy, alumno.id));
        const asistencia = await transaccion.get(referenciaAsistencia);

        if (asistencia.exists() && asistencia.data().estado === 'presente') {
          throw new Error(`Ya subió hoy a las ${horaCorta(asistencia.data().presenteEn)}.`);
        }

        const referenciaUsuario = doc(db, 'usuarios', alumno.id);
        const actual = await transaccion.get(referenciaUsuario);
        const acceso = evaluarAcceso(actual.data());

        if (!acceso.permitido) throw new Error(acceso.motivo);

        const marcaDeEntrada = {
          estado: 'presente',
          presenteEn: serverTimestamp(),
          escaneadoPor: usuario.uid,
          medioAcceso: acceso.medio,
        };

        // Sobre una asistencia ya confirmada solo se tocan los campos de la
        // entrada; reescribir el documento entero lo rechazan las reglas.
        if (asistencia.exists()) {
          transaccion.update(referenciaAsistencia, marcaDeEntrada);
        } else {
          transaccion.set(referenciaAsistencia, {
            institucionId,
            usuarioId: alumno.id,
            usuarioNombre: `${alumno.nombre} ${alumno.apellido}`,
            ci: alumno.ci,
            fechaNacimiento: alumno.fechaNacimiento,
            fecha: hoy,
            comidas: comidasDelSubrol(institucion, alumno),
            qrToken: null,
            confirmadoEn: serverTimestamp(),
            ...marcaDeEntrada,
          });
        }

        if (acceso.medio === 'ticket') {
          transaccion.update(referenciaUsuario, { tickets: actual.data().tickets - 1 });
        }
      });

      setAviso({ tipo: 'exito', texto: `${alumno.nombre} ${alumno.apellido} quedó marcado presente.` });
      setAlumno(undefined);
      setCedula('');
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message ?? 'No se pudo marcar la entrada.' });
    } finally {
      setMarcando(false);
    }
  }

  const acceso = alumno ? evaluarAcceso(alumno) : null;

  return (
    <Pantalla>
      <Encabezado titulo="Buscar por cédula" nota={institucion?.nombre} />

      <Navegacion opciones={navegacionDe(rol, institucion)} />

      <Aviso tipo="info">
        Para el alumno que se quedó sin batería o sin celular. Marca la entrada igual que el
        escaneo y descuenta el ticket de la misma forma.
      </Aviso>

      <Campo
        etiqueta="Cédula de identidad"
        value={cedula}
        onChangeText={setCedula}
        formato={formatoCedula}
        keyboardType="number-pad"
        placeholder="11223344"
        returnKeyType="search"
        onSubmitEditing={buscar}
      />

      <Boton titulo="Buscar" onPress={buscar} cargando={buscando} />

      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

      {alumno === null ? (
        <Aviso tipo="advertencia" titulo="Sin resultados">
          No hay ningún alumno activo con esa cédula en esta institución.
        </Aviso>
      ) : null}

      {alumno ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.nombre}>{`${alumno.nombre} ${alumno.apellido}`}</Text>
          <Text style={estilos.dato}>{`Cédula ${alumno.ci}`}</Text>
          <Text style={[estilos.dato, acceso.permitido ? estilos.ok : estilos.mal]}>
            {resumenDeAcceso(alumno)}
          </Text>

          <Boton
            titulo="Marcar entrada"
            onPress={marcarPresente}
            cargando={marcando}
            deshabilitado={!acceso.permitido}
          />
        </View>
      ) : null}
    </Pantalla>
  );
}

const crearEstilos = (colores) =>
  StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.sm,
  },
  nombre: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto },
  dato: { fontSize: tipografia.nota + 1, color: colores.textoSuave },
  ok: { color: colores.exito, fontWeight: '600' },
  mal: { color: colores.error, fontWeight: '600' },
});
