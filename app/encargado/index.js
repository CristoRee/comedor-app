import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Boton, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';
import { Navegacion } from '../../src/components/Navegacion';
import { navegacionDe } from '../../src/permisos';
import { claveDeFecha, horaCorta } from '../../src/fechas';
import { idAsistencia } from '../../src/comedor';
import { evaluarAcceso } from '../../src/acceso';
import { colores, espaciado, radio, tipografia } from '../../src/theme';

const NOMBRE_MEDIO = {
  ticket: 'Descontado 1 ticket',
  beca: 'Beca del comedor',
  internado: 'Internado',
};

class RechazoDeAcceso extends Error {}

export default function Escaner() {
  const { usuario, perfil, rol, institucionId, institucion } = useAuth();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [resultado, setResultado] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const registrarEntrada = useCallback(
    async (contenido) => {
      let codigo;

      try {
        codigo = JSON.parse(contenido);
      } catch {
        throw new RechazoDeAcceso('Este código no es de Mi Bandeja.');
      }

      if (codigo.v !== 1 || !codigo.u || !codigo.f || !codigo.t) {
        throw new RechazoDeAcceso('Este código no es de Mi Bandeja.');
      }

      if (codigo.i !== institucionId) {
        throw new RechazoDeAcceso('El código es de otra institución.');
      }

      if (codigo.f !== claveDeFecha()) {
        throw new RechazoDeAcceso('Código vencido: es de otro día.');
      }

      return runTransaction(db, async (transaccion) => {
        const referenciaAsistencia = doc(
          db,
          'asistencias',
          idAsistencia(institucionId, codigo.f, codigo.u)
        );
        const asistencia = await transaccion.get(referenciaAsistencia);

        if (!asistencia.exists()) {
          throw new RechazoDeAcceso('El alumno no marcó para comer hoy.');
        }

        const datos = asistencia.data();

        if (datos.estado === 'presente') {
          throw new RechazoDeAcceso(`Ya subió hoy a las ${horaCorta(datos.presenteEn)}.`);
        }

        if (datos.estado !== 'confirmado') {
          throw new RechazoDeAcceso('El alumno canceló su asistencia de hoy.');
        }

        if (datos.qrToken !== codigo.t) {
          throw new RechazoDeAcceso('Código vencido: el alumno generó uno nuevo.');
        }

        const referenciaUsuario = doc(db, 'usuarios', datos.usuarioId);
        const alumno = await transaccion.get(referenciaUsuario);
        const acceso = evaluarAcceso(alumno.data());

        if (!acceso.permitido) {
          throw new RechazoDeAcceso(acceso.motivo, { cause: datos.usuarioNombre });
        }

        transaccion.update(referenciaAsistencia, {
          estado: 'presente',
          presenteEn: serverTimestamp(),
          escaneadoPor: usuario.uid,
          medioAcceso: acceso.medio,
        });

        if (acceso.medio === 'ticket') {
          transaccion.update(referenciaUsuario, { tickets: alumno.data().tickets - 1 });
        }

        return { nombre: datos.usuarioNombre, medio: acceso.medio };
      });
    },
    [institucionId, usuario.uid]
  );

  async function alEscanear({ data }) {
    if (ocupado || resultado) return;

    setOcupado(true);

    try {
      const entrada = await registrarEntrada(data);
      setResultado({
        ok: true,
        titulo: entrada.nombre,
        detalle: NOMBRE_MEDIO[entrada.medio] ?? 'Acceso habilitado',
      });
    } catch (error) {
      setResultado({
        ok: false,
        titulo: error instanceof RechazoDeAcceso ? 'No puede subir' : 'Error de conexión',
        detalle:
          error instanceof RechazoDeAcceso
            ? error.message
            : 'No se pudo registrar la entrada. Probá de nuevo.',
      });
    } finally {
      setOcupado(false);
    }
  }

  if (!permiso) {
    return (
      <Pantalla scroll={false}>
        <Encabezado titulo="Control de acceso" nota={institucion?.nombre} />
      </Pantalla>
    );
  }

  if (!permiso.granted) {
    return (
      <Pantalla>
        <Encabezado
          titulo="Control de acceso"
          subtitulo={`${perfil.nombre} ${perfil.apellido}`}
          nota={institucion?.nombre}
        />
        <Aviso tipo="info" titulo="Falta el permiso de cámara">
          La app necesita la cámara para leer los códigos de los alumnos.
        </Aviso>
        <Boton titulo="Permitir el uso de la cámara" onPress={pedirPermiso} />
      </Pantalla>
    );
  }

  return (
    <Pantalla scroll={false}>
      <Encabezado
        titulo="Control de acceso"
        subtitulo={`${perfil.nombre} ${perfil.apellido}`}
        nota={institucion?.nombre}
      />

      <Navegacion opciones={navegacionDe(rol, institucion)} />

      <View style={estilos.visor}>
        <CameraView
          style={estilos.camara}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={resultado ? undefined : alEscanear}
        />

        {resultado ? (
          // El resultado tapa la cámara hasta que lo tocan: da tiempo a leerlo
          // sin que el siguiente alumno dispare un escaneo encima.
          <Pressable
            style={[estilos.resultado, resultado.ok ? estilos.resultadoOk : estilos.resultadoMal]}
            onPress={() => setResultado(null)}
          >
            <Text style={estilos.simbolo}>{resultado.ok ? '✓' : '✕'}</Text>
            <Text style={estilos.resultadoTitulo}>{resultado.titulo}</Text>
            <Text style={estilos.resultadoDetalle}>{resultado.detalle}</Text>
            <Text style={estilos.tocar}>Tocá la pantalla para escanear al siguiente</Text>
          </Pressable>
        ) : null}
      </View>

      {!resultado ? (
        <Text style={estilos.instruccion}>
          Apuntá al código que el alumno muestra en su celular.
        </Text>
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  visor: {
    flex: 1,
    borderRadius: radio.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  camara: { flex: 1 },
  resultado: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.lg,
    gap: espaciado.sm,
  },
  resultadoOk: { backgroundColor: colores.exito },
  resultadoMal: { backgroundColor: colores.error },
  simbolo: { fontSize: 96, color: '#ffffff', fontWeight: '700' },
  resultadoTitulo: {
    fontSize: 26,
    color: '#ffffff',
    fontWeight: '700',
    textAlign: 'center',
  },
  resultadoDetalle: {
    fontSize: tipografia.subtitulo,
    color: '#ffffff',
    textAlign: 'center',
  },
  tocar: {
    fontSize: tipografia.nota,
    color: '#ffffff',
    opacity: 0.85,
    marginTop: espaciado.md,
  },
  instruccion: {
    fontSize: tipografia.nota + 1,
    color: colores.textoSuave,
    textAlign: 'center',
  },
});
