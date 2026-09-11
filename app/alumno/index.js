import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { randomUUID } from 'expo-crypto';
import QRCode from 'react-native-qrcode-svg';
import { db } from '../../src/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Boton, Cargando, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';
import { claveDeFecha, fechaLegible, horaCorta } from '../../src/fechas';
import { comidasDelSubrol, idAsistencia, idMenu } from '../../src/comedor';
import { evaluarAcceso, resumenDeAcceso } from '../../src/acceso';
import { FIJOS, espaciado, radio, tipografia } from '../../src/theme';
import { useEstilos } from '../../src/contexts/TemaContext';

const ETIQUETA_COMIDA = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
};

function Plato({ titulo, nombre, ingredientes }) {
  const estilos = useEstilos(crearEstilos);
  const [abierto, setAbierto] = useState(false);

  if (!nombre) return null;

  return (
    <View style={estilos.plato}>
      <Text style={estilos.platoTitulo}>{titulo}</Text>
      <Text style={estilos.platoNombre}>{nombre}</Text>

      {ingredientes?.length ? (
        <>
          <Pressable onPress={() => setAbierto((previo) => !previo)} hitSlop={8}>
            <Text style={estilos.verIngredientes}>
              {abierto ? 'Ocultar ingredientes' : 'Ver ingredientes'}
            </Text>
          </Pressable>
          {abierto ? <Text style={estilos.ingredientes}>{ingredientes.join(', ')}</Text> : null}
        </>
      ) : null}
    </View>
  );
}

export default function InicioAlumno() {
  const estilos = useEstilos(crearEstilos);
  const { usuario, perfil, institucionId, institucion } = useAuth();
  const [menu, setMenu] = useState(undefined);
  const [asistencia, setAsistencia] = useState(undefined);
  const [comidas, setComidas] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  const hoy = claveDeFecha();
  const acceso = evaluarAcceso(perfil);
  const habilitadas = comidasDelSubrol(institucion, perfil);
  const esInternado = habilitadas.length > 1;

  useEffect(() => {
    setComidas(habilitadas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitadas.join(',')]);

  useEffect(() => {
    if (!institucionId) return undefined;

    return onSnapshot(
      doc(db, 'menus', idMenu(institucionId, hoy)),
      (instantanea) => setMenu(instantanea.exists() ? instantanea.data() : null),
      () => setMenu(null)
    );
  }, [institucionId, hoy]);

  useEffect(() => {
    if (!institucionId) return undefined;

    return onSnapshot(
      doc(db, 'asistencias', idAsistencia(institucionId, hoy, usuario.uid)),
      (instantanea) => setAsistencia(instantanea.exists() ? instantanea.data() : null),
      () => setAsistencia(null)
    );
  }, [institucionId, hoy, usuario.uid]);

  async function confirmar() {
    setProcesando(true);
    setError(null);

    try {
      await setDoc(doc(db, 'asistencias', idAsistencia(institucionId, hoy, usuario.uid)), {
        institucionId,
        usuarioId: usuario.uid,
        usuarioNombre: `${perfil.nombre} ${perfil.apellido}`,
        ci: perfil.ci,
        fechaNacimiento: perfil.fechaNacimiento,
        fecha: hoy,
        comidas,
        estado: 'confirmado',
        // Se regenera en cada confirmación: una captura de pantalla vieja no sirve.
        qrToken: randomUUID(),
        confirmadoEn: serverTimestamp(),
      });
    } catch {
      setError('No se pudo confirmar. Revisá la conexión e intentá de nuevo.');
    } finally {
      setProcesando(false);
    }
  }

  async function cancelar() {
    setProcesando(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'asistencias', idAsistencia(institucionId, hoy, usuario.uid)), {
        estado: 'cancelado',
        qrToken: null,
      });
    } catch {
      setError('No se pudo cancelar. Revisá la conexión e intentá de nuevo.');
    } finally {
      setProcesando(false);
    }
  }

  function preguntarConfirmacion() {
    const plato = menu?.principal?.nombre ?? 'la comida de hoy,';

    Alert.alert('Confirmar asistencia', `¿Subís al comedor a comer ${plato} hoy?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, voy a comer', onPress: confirmar },
    ]);
  }

  function preguntarCancelacion() {
    Alert.alert('Cancelar asistencia', '¿Confirmás que hoy no vas a subir al comedor?', [
      { text: 'No' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: cancelar },
    ]);
  }

  function alternarComida(comida) {
    setComidas((previas) =>
      previas.includes(comida)
        ? previas.filter((otra) => otra !== comida)
        : habilitadas.filter((otra) => previas.includes(otra) || otra === comida)
    );
  }

  if (menu === undefined || asistencia === undefined) {
    return (
      <Pantalla scroll={false}>
        <Cargando />
      </Pantalla>
    );
  }

  const confirmado = asistencia?.estado === 'confirmado';
  const presente = asistencia?.estado === 'presente';

  const contenidoQr = confirmado
    ? JSON.stringify({
        v: 1,
        i: institucionId,
        u: usuario.uid,
        f: hoy,
        t: asistencia.qrToken,
      })
    : null;

  return (
    <Pantalla>
      <Encabezado
        titulo="Mi Bandeja"
        subtitulo={`${perfil.nombre} ${perfil.apellido}`}
        nota={institucion?.nombre}
      />

      <View style={estilos.tarjeta}>
        <Text style={estilos.fecha}>{fechaLegible()}</Text>

        {menu?.publicado ? (
          <>
            <Plato
              titulo="Plato principal"
              nombre={menu.principal?.nombre}
              ingredientes={menu.principal?.ingredientes}
            />
            {(menu.complementos ?? []).map((complemento, indice) => (
              <Plato
                key={indice}
                titulo="Complemento"
                nombre={complemento.nombre}
                ingredientes={complemento.ingredientes}
              />
            ))}
            <Plato
              titulo="Postre"
              nombre={menu.postre?.nombre}
              ingredientes={menu.postre?.ingredientes}
            />
          </>
        ) : (
          <Text style={estilos.sinMenu}>Todavía no se publicó el menú de hoy.</Text>
        )}
      </View>

      {institucion?.horarios?.horaLimiteMenu ? (
        <Text style={estilos.advertencia}>
          {`El menú puede cambiar hasta las ${institucion.horarios.horaLimiteMenu}. Revisalo pasada esa hora.`}
        </Text>
      ) : null}

      <Aviso tipo={acceso.permitido ? 'exito' : 'advertencia'} titulo="Tu acceso al comedor">
        {resumenDeAcceso(perfil)}
      </Aviso>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      {presente ? (
        <Aviso tipo="exito" titulo="Ya subiste hoy">
          {`Marcaste tu entrada a las ${horaCorta(asistencia.presenteEn)}.`}
        </Aviso>
      ) : confirmado ? (
        <>
          <View style={estilos.tarjetaQr}>
            <Text style={estilos.qrTitulo}>Mostrá este código al subir</Text>
            <View style={estilos.qr}>
              <QRCode
                value={contenidoQr}
                size={220}
                color={FIJOS.qrTinta}
                backgroundColor={FIJOS.qrFondo}
              />
            </View>
            <Text style={estilos.qrPie}>
              {`Te esperamos a las ${institucion?.horarios?.horaAperturaComedor ?? '11:30'}.`}
            </Text>
          </View>

          <Boton
            titulo="Cancelar mi asistencia"
            variante="peligro"
            onPress={preguntarCancelacion}
            cargando={procesando}
          />
        </>
      ) : (
        <>
          {esInternado ? (
            <View style={estilos.comidas}>
              <Text style={estilos.comidasTitulo}>¿A qué comidas vas a subir?</Text>
              {habilitadas.map((comida) => {
                const marcada = comidas.includes(comida);

                return (
                  <Pressable
                    key={comida}
                    onPress={() => alternarComida(comida)}
                    style={estilos.comida}
                  >
                    <View style={[estilos.casilla, marcada && estilos.casillaMarcada]}>
                      {marcada ? <Text style={estilos.tilde}>✓</Text> : null}
                    </View>
                    <Text style={estilos.comidaTexto}>{ETIQUETA_COMIDA[comida] ?? comida}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Boton
            titulo="¡Voy a comer!"
            onPress={preguntarConfirmacion}
            cargando={procesando}
            deshabilitado={!acceso.permitido || comidas.length === 0}
          />

          {!acceso.permitido ? (
            <Text style={estilos.nota}>
              Pasá por administración para habilitar tu acceso antes de marcar.
            </Text>
          ) : null}
        </>
      )}
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
    gap: espaciado.md,
  },
  fecha: {
    fontSize: tipografia.nota,
    color: colores.textoSuave,
    textTransform: 'capitalize',
  },
  plato: { gap: 2 },
  platoTitulo: { fontSize: tipografia.nota, color: colores.textoSuave },
  platoNombre: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto },
  verIngredientes: {
    fontSize: tipografia.nota,
    color: colores.primario,
    fontWeight: '600',
    marginTop: espaciado.xs,
  },
  ingredientes: { fontSize: tipografia.nota, color: colores.textoSuave, marginTop: 2 },
  sinMenu: { fontSize: tipografia.cuerpo, color: colores.textoSuave },
  advertencia: { fontSize: tipografia.nota, color: colores.textoSuave },

  comidas: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.sm,
  },
  comidasTitulo: { fontSize: tipografia.nota + 1, fontWeight: '600', color: colores.texto },
  comida: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  casilla: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaMarcada: { backgroundColor: colores.primario, borderColor: colores.primario },
  tilde: { color: colores.destacadoTexto, fontSize: 15, fontWeight: '700' },
  comidaTexto: { fontSize: tipografia.cuerpo, color: colores.texto },

  tarjetaQr: {
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.lg,
    alignItems: 'center',
    gap: espaciado.md,
  },
  qrTitulo: { fontSize: tipografia.cuerpo, fontWeight: '700', color: colores.texto },
  qr: { padding: espaciado.md, backgroundColor: FIJOS.qrFondo, borderRadius: radio.md },
  qrPie: { fontSize: tipografia.nota, color: colores.textoSuave },
  nota: { fontSize: tipografia.nota, color: colores.textoSuave, textAlign: 'center' },
});
