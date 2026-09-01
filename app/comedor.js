import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../src/firebase';
import { useAuth } from '../src/contexts/AuthContext';
import { Aviso, Cargando, Pantalla } from '../src/components/ui';
import { Navegacion } from '../src/components/Navegacion';
import { claveDeFecha, edadEnAnios } from '../src/fechas';
import { NOMBRE_COMIDA, comidaCentral, desayunoVisible } from '../src/comedor';
import { colores, espaciado, radio, tipografia } from '../src/theme';

const OPCIONES_POR_ROL = {
  cocinero: [
    { titulo: 'Menú', ruta: '/cocinero' },
    { titulo: 'Comedor', ruta: '/comedor' },
  ],
  encargado: [
    { titulo: 'Escáner', ruta: '/encargado' },
    { titulo: 'Por cédula', ruta: '/encargado/manual' },
    { titulo: 'Comedor', ruta: '/comedor' },
  ],
  admin: [
    { titulo: 'Registros', ruta: '/admin' },
    { titulo: 'Alumnos', ruta: '/alumnos' },
    { titulo: 'Comedor', ruta: '/comedor' },
  ],
};

function Contador({ titulo, valor, tamanio = 'grande', color }) {
  return (
    <View style={[estilos.contador, tamanio === 'chico' && estilos.contadorChico]}>
      <Text style={[estilos.contadorTitulo, tamanio === 'chico' && estilos.contadorTituloChico]}>
        {titulo}
      </Text>
      <Text
        style={[
          estilos.contadorValor,
          tamanio === 'chico' && estilos.contadorValorChico,
          color ? { color } : null,
        ]}
      >
        {valor}
      </Text>
    </View>
  );
}

export default function PantallaDelComedor() {
  const { rol, institucionId, institucion } = useAuth();
  const [asistencias, setAsistencias] = useState(null);
  const [ahora, setAhora] = useState(() => new Date());
  const [error, setError] = useState(null);

  useEffect(() => {
    // Los horarios de corte se evalúan contra el reloj, así que el nombre del
    // contador central tiene que revisarse aunque no lleguen datos nuevos.
    const reloj = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(reloj);
  }, []);

  useEffect(() => {
    if (!institucionId) return undefined;

    const consulta = query(
      collection(db, 'asistencias'),
      where('institucionId', '==', institucionId),
      where('fecha', '==', claveDeFecha())
    );

    return onSnapshot(
      consulta,
      (instantanea) => {
        setAsistencias(instantanea.docs.map((registro) => registro.data()));
        setError(null);
      },
      () => {
        setAsistencias([]);
        setError('No se pudo cargar la asistencia de hoy.');
      }
    );
  }, [institucionId]);

  const comida = comidaCentral(institucion?.horarios, ahora);
  const mostrarDesayuno = desayunoVisible(institucion, ahora);
  const mostrarChicoGrande = institucion?.contadores?.mostrarChicoGrande !== false;
  const corte = institucion?.edadCorteChicoGrande ?? 15;

  const cuentas = useMemo(() => {
    const vacio = { confirmados: 0, presentes: 0, faltan: 0, chicos: 0, grandes: 0, desayuno: 0 };
    if (!asistencias) return vacio;

    return asistencias.reduce((total, asistencia) => {
      if (asistencia.estado === 'cancelado') return total;

      const comidas = asistencia.comidas ?? ['almuerzo'];

      if (comidas.includes('desayuno')) total.desayuno += 1;
      if (!comidas.includes(comida)) return total;

      total.confirmados += 1;

      if (asistencia.estado === 'presente') {
        total.presentes += 1;
        return total;
      }

      total.faltan += 1;

      const edad = edadEnAnios(asistencia.fechaNacimiento, ahora);
      if (edad === null) return total;
      if (edad < corte) total.chicos += 1;
      else total.grandes += 1;

      return total;
    }, { ...vacio });
  }, [asistencias, comida, corte, ahora]);

  if (!asistencias) {
    return (
      <Pantalla scroll={false}>
        <Cargando texto="Cargando la asistencia de hoy" />
      </Pantalla>
    );
  }

  return (
    <Pantalla scroll={false}>
      <Navegacion opciones={OPCIONES_POR_ROL[rol] ?? []} />

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <View style={estilos.tablero}>
        {mostrarChicoGrande ? (
          <View style={estilos.fila}>
            <Contador titulo="Alumnos chicos" valor={cuentas.chicos} tamanio="chico" />
            <Contador titulo="Alumnos grandes" valor={cuentas.grandes} tamanio="chico" />
          </View>
        ) : null}

        {mostrarDesayuno ? (
          <Contador titulo="Van a desayunar" valor={cuentas.desayuno} tamanio="chico" />
        ) : null}

        <View style={estilos.central}>
          <Text style={estilos.centralTitulo}>{`Van a ${NOMBRE_COMIDA[comida]}`}</Text>
          <Text style={estilos.centralValor}>{cuentas.confirmados}</Text>
        </View>

        <View style={estilos.fila}>
          <Contador titulo="Ya subieron" valor={cuentas.presentes} color={colores.exito} />
          <Contador titulo="Faltan subir" valor={cuentas.faltan} color={colores.advertencia} />
        </View>
      </View>

      <Text style={estilos.pie}>{institucion?.nombre}</Text>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  tablero: { flex: 1, gap: espaciado.md, justifyContent: 'center' },
  fila: { flexDirection: 'row', gap: espaciado.md },
  contador: {
    flex: 1,
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    paddingVertical: espaciado.md,
    alignItems: 'center',
    gap: espaciado.xs,
  },
  contadorChico: { paddingVertical: espaciado.sm },
  contadorTitulo: { fontSize: tipografia.cuerpo, color: colores.textoSuave, fontWeight: '600' },
  contadorTituloChico: { fontSize: tipografia.nota + 1 },
  contadorValor: { fontSize: 56, fontWeight: '800', color: colores.texto },
  contadorValorChico: { fontSize: 34 },
  central: {
    backgroundColor: colores.texto,
    borderRadius: radio.lg,
    paddingVertical: espaciado.lg,
    alignItems: 'center',
    gap: espaciado.xs,
  },
  centralTitulo: { fontSize: tipografia.subtitulo, color: '#ffffff', fontWeight: '600' },
  centralValor: { fontSize: 104, lineHeight: 116, fontWeight: '800', color: '#ffffff' },
  pie: { fontSize: tipografia.nota, color: colores.textoSuave, textAlign: 'center' },
});
