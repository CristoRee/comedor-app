import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../src/firebase';
import { Aviso, Boton, Campo, Cargando, Pantalla } from '../../../src/components/ui';
import { ROLES } from '../../../src/contexts/AuthContext';
import { limpiarNumeros } from '../../../src/validaciones';
import { espaciado, radio, tipografia } from '../../../src/theme';
import { useEstilos } from '../../../src/contexts/TemaContext';

const FILTROS = [{ clave: 'todos', titulo: 'Todos' }, ...ROLES.filter((rol) => rol !== 'superadmin').map((rol) => ({ clave: rol, titulo: rol }))];

const ETIQUETA_ESTADO = {
  activo: 'Activo',
  pendiente: 'Pendiente',
  rechazado: 'Rechazado',
  suspendido: 'Suspendido',
};

export default function UsuariosDeLaInstitucion() {
  const estilos = useEstilos(crearEstilos);
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    const consulta = query(collection(db, 'usuarios'), where('institucionId', '==', id));

    return onSnapshot(
      consulta,
      (instantanea) => {
        const lista = instantanea.docs.map((registro) => ({ id: registro.id, ...registro.data() }));
        lista.sort(
          (a, b) =>
            (a.apellido ?? '').localeCompare(b.apellido ?? '') ||
            (a.nombre ?? '').localeCompare(b.nombre ?? '')
        );
        setUsuarios(lista);
      },
      () => {
        setUsuarios([]);
        setAviso({ tipo: 'error', texto: 'No se pudo cargar la lista de usuarios.' });
      }
    );
  }, [id]);

  const visibles = useMemo(() => {
    if (!usuarios) return [];

    const texto = busqueda.trim().toLowerCase();
    const digitos = limpiarNumeros(busqueda);

    return usuarios.filter((usuario) => {
      const rol = usuario.rol ?? 'alumno';
      if (filtro !== 'todos' && rol !== filtro) return false;
      if (!texto) return true;

      const nombre = `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.toLowerCase();
      return (
        nombre.includes(texto) ||
        (usuario.email ?? '').toLowerCase().includes(texto) ||
        (digitos && (usuario.ci ?? '').includes(digitos))
      );
    });
  }, [usuarios, busqueda, filtro]);

  function confirmarBaja(usuario) {
    Alert.alert(
      'Eliminar usuario',
      `Se borra la ficha de ${usuario.nombre} ${usuario.apellido} y pierde el acceso a la app.\n\nLa cuenta de correo queda registrada en Firebase: para liberar el correo hay que borrarla con el script limpiar-cuentas.js.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'usuarios', usuario.id));
              setAviso({ tipo: 'exito', texto: 'Usuario eliminado.' });
            } catch {
              setAviso({ tipo: 'error', texto: 'No se pudo eliminar el usuario.' });
            }
          },
        },
      ]
    );
  }

  if (!usuarios) {
    return (
      <Pantalla scroll={false}>
        <Cargando texto="Cargando usuarios" />
      </Pantalla>
    );
  }

  return (
    <Pantalla scroll={false}>
      <Pressable onPress={() => router.replace(`/superadmin/${id}`)} hitSlop={8}>
        <Text style={estilos.volver}>‹ Institución</Text>
      </Pressable>

      <Text style={estilos.titulo}>Usuarios</Text>
      <Text style={estilos.subtitulo}>{`${visibles.length} de ${usuarios.length} en ${id}`}</Text>

      <Boton
        titulo="Crear usuario"
        onPress={() => router.push(`/superadmin/${id}/usuario`)}
      />

      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

      <Campo
        etiqueta="Buscar"
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Nombre, correo o cédula"
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

      <FlatList
        data={visibles}
        keyExtractor={(usuario) => usuario.id}
        style={estilos.flex}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Aviso tipo="info" titulo="Sin resultados">
            Ningún usuario coincide con la búsqueda.
          </Aviso>
        }
        renderItem={({ item }) => (
          <View style={estilos.fila}>
            <View style={estilos.filaTextos}>
              <Text style={estilos.nombre}>{`${item.apellido ?? ''}, ${item.nombre ?? ''}`}</Text>
              <Text style={estilos.detalle}>{item.email}</Text>
              <Text style={estilos.detalle}>
                {`${item.rol ?? 'alumno'} · ${ETIQUETA_ESTADO[item.estado] ?? item.estado ?? '—'}`}
              </Text>
            </View>

            <View style={estilos.acciones}>
              <Pressable
                onPress={() => router.push(`/superadmin/${id}/usuario?uid=${item.id}`)}
                hitSlop={8}
              >
                <Text style={estilos.editar}>Editar</Text>
              </Pressable>
              <Pressable onPress={() => confirmarBaja(item)} hitSlop={8}>
                <Text style={estilos.borrar}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        )}
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
    filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
    filtro: {
      paddingHorizontal: espaciado.md,
      paddingVertical: espaciado.xs + 2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colores.borde,
      backgroundColor: colores.superficie,
    },
    filtroActivo: { backgroundColor: colores.destacado, borderColor: colores.destacado },
    filtroTexto: { fontSize: tipografia.nota, color: colores.texto, fontWeight: '600' },
    filtroTextoActivo: { color: colores.destacadoTexto },
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
    nombre: { fontSize: tipografia.cuerpo, fontWeight: '600', color: colores.texto },
    detalle: { fontSize: tipografia.nota, color: colores.textoSuave },
    acciones: { alignItems: 'flex-end', gap: espaciado.sm },
    editar: { fontSize: tipografia.nota + 1, color: colores.primario, fontWeight: '600' },
    borrar: { fontSize: tipografia.nota + 1, color: colores.error, fontWeight: '600' },
  });
