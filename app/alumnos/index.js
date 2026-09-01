import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Campo, Cargando, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';
import { Navegacion } from '../../src/components/Navegacion';
import { evaluarAcceso, resumenDeAcceso } from '../../src/acceso';
import { limpiarNumeros } from '../../src/validaciones';
import { colores, espaciado, radio, tipografia } from '../../src/theme';

const FILTROS = [
  { clave: 'todos', titulo: 'Todos' },
  { clave: 'habilitados', titulo: 'Habilitados' },
  { clave: 'sinAcceso', titulo: 'Sin acceso' },
  { clave: 'becarios', titulo: 'Becarios' },
  { clave: 'internado', titulo: 'Internado' },
];

function aplicarFiltro(alumno, filtro) {
  const acceso = evaluarAcceso(alumno);

  if (filtro === 'habilitados') return acceso.permitido;
  if (filtro === 'sinAcceso') return !acceso.permitido;
  if (filtro === 'becarios') return Boolean(alumno.beca?.tipo);
  if (filtro === 'internado') return alumno.subrol === 'internado';

  return true;
}

export default function ListadoDeAlumnos() {
  const router = useRouter();
  const { institucionId, institucion } = useAuth();
  const [alumnos, setAlumnos] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!institucionId) return undefined;

    const consulta = query(
      collection(db, 'usuarios'),
      where('institucionId', '==', institucionId),
      where('estado', '==', 'activo')
    );

    return onSnapshot(
      consulta,
      (instantanea) => {
        const lista = instantanea.docs.map((registro) => ({ id: registro.id, ...registro.data() }));
        lista.sort((a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre));
        setAlumnos(lista);
        setError(null);
      },
      () => {
        setAlumnos([]);
        setError('No se pudo cargar el listado de alumnos.');
      }
    );
  }, [institucionId]);

  const visibles = useMemo(() => {
    if (!alumnos) return [];

    const texto = busqueda.trim().toLowerCase();
    const digitos = limpiarNumeros(busqueda);

    return alumnos.filter((alumno) => {
      if (!aplicarFiltro(alumno, filtro)) return false;
      if (!texto) return true;

      const nombre = `${alumno.nombre} ${alumno.apellido}`.toLowerCase();
      return nombre.includes(texto) || (digitos && alumno.ci.includes(digitos));
    });
  }, [alumnos, busqueda, filtro]);

  if (!alumnos) {
    return (
      <Pantalla scroll={false}>
        <Cargando texto="Cargando alumnos" />
      </Pantalla>
    );
  }

  return (
    <Pantalla scroll={false}>
      <Encabezado
        titulo="Alumnos"
        subtitulo={institucion?.nombre}
        nota={`${visibles.length} de ${alumnos.length}`}
      />

      <Navegacion
        opciones={[
          { titulo: 'Registros', ruta: '/admin' },
          { titulo: 'Alumnos', ruta: '/alumnos' },
          { titulo: 'Comedor', ruta: '/comedor' },
        ]}
      />

      <Campo
        etiqueta="Buscar"
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Nombre o cédula"
        autoCapitalize="none"
      />

      <View style={estilos.filtros}>
        {FILTROS.map((opcion) => (
          <Pressable
            key={opcion.clave}
            onPress={() => setFiltro(opcion.clave)}
            style={[estilos.filtro, filtro === opcion.clave && estilos.filtroActivo]}
          >
            <Text style={[estilos.filtroTexto, filtro === opcion.clave && estilos.filtroTextoActivo]}>
              {opcion.titulo}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <FlatList
        data={visibles}
        keyExtractor={(alumno) => alumno.id}
        style={estilos.flex}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Aviso tipo="info" titulo="Sin resultados">
            Ningún alumno coincide con la búsqueda.
          </Aviso>
        }
        renderItem={({ item }) => {
          const acceso = evaluarAcceso(item);

          return (
            <Pressable
              onPress={() => router.push(`/alumnos/${item.id}`)}
              style={({ pressed }) => [estilos.fila, pressed && estilos.filaPresionada]}
            >
              <View style={estilos.filaTextos}>
                <Text style={estilos.nombre}>{`${item.apellido}, ${item.nombre}`}</Text>
                <Text style={estilos.ci}>{`C.I. ${item.ci}`}</Text>
                <Text style={[estilos.acceso, acceso.permitido ? estilos.ok : estilos.mal]}>
                  {resumenDeAcceso(item)}
                </Text>
              </View>
              <Text style={estilos.flecha}>›</Text>
            </Pressable>
          );
        }}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  lista: { gap: espaciado.sm, paddingBottom: espaciado.lg },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
  filtro: {
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.xs + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  filtroActivo: { backgroundColor: colores.texto, borderColor: colores.texto },
  filtroTexto: { fontSize: tipografia.nota, color: colores.texto, fontWeight: '600' },
  filtroTextoActivo: { color: '#ffffff' },
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
  filaPresionada: { backgroundColor: '#eef2f7' },
  filaTextos: { flex: 1, gap: 2 },
  nombre: { fontSize: tipografia.cuerpo, fontWeight: '600', color: colores.texto },
  ci: { fontSize: tipografia.nota, color: colores.textoSuave },
  acceso: { fontSize: tipografia.nota, fontWeight: '600' },
  ok: { color: colores.exito },
  mal: { color: colores.error },
  flecha: { fontSize: 22, color: colores.textoSuave },
});
