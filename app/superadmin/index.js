import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { Aviso, Boton, Cargando, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';
import { PERMISOS_DEL_ADMIN, permisoDelAdmin } from '../../src/permisos';
import { espaciado, radio, tipografia } from '../../src/theme';
import { useEstilos } from '../../src/contexts/TemaContext';

export default function CatalogoInstituciones() {
  const estilos = useEstilos(crearEstilos);
  const router = useRouter();
  const [instituciones, setInstituciones] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, 'instituciones'),
      (instantanea) => {
        const lista = instantanea.docs.map((registro) => ({ id: registro.id, ...registro.data() }));
        lista.sort(
          (a, b) => a.departamento.localeCompare(b.departamento) || a.nombre.localeCompare(b.nombre)
        );
        setInstituciones(lista);
        setError(null);
      },
      () => {
        setInstituciones([]);
        setError('No se pudo cargar el catálogo de instituciones.');
      }
    );
  }, []);

  if (!instituciones) {
    return (
      <Pantalla scroll={false}>
        <Cargando texto="Cargando instituciones" />
      </Pantalla>
    );
  }

  const activas = instituciones.filter((institucion) => institucion.activa).length;

  return (
    <Pantalla scroll={false}>
      <Encabezado
        titulo="Instituciones"
        subtitulo="Catálogo nacional"
        nota={`${activas} activas de ${instituciones.length}`}
      />

      <Boton titulo="Registrar institución" onPress={() => router.push('/superadmin/nueva')} />

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <FlatList
        data={instituciones}
        keyExtractor={(institucion) => institucion.id}
        style={estilos.flex}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Aviso tipo="info" titulo="Catálogo vacío">
            Todavía no hay instituciones dadas de alta. Se agregan con el script
            crear-institucion.js.
          </Aviso>
        }
        renderItem={({ item }) => {
          const desactivados = PERMISOS_DEL_ADMIN.filter(
            (permiso) => !permisoDelAdmin(item, permiso.clave)
          ).length;

          return (
            <Pressable
              onPress={() => router.push(`/superadmin/${item.id}`)}
              style={({ pressed }) => [estilos.fila, pressed && estilos.filaPresionada]}
            >
              <View style={estilos.filaTextos}>
                <Text style={estilos.nombre}>{item.nombre}</Text>
                <Text style={estilos.detalle}>{`${item.ciudad}, ${item.departamento}`}</Text>
                <Text style={estilos.detalle}>
                  {desactivados === 0
                    ? 'Todos los permisos del admin activos'
                    : `${desactivados} ${desactivados === 1 ? 'permiso restringido' : 'permisos restringidos'}`}
                </Text>
              </View>

              <View style={estilos.derecha}>
                <Text
                  style={[estilos.estado, item.activa ? estilos.estadoActiva : estilos.estadoInactiva]}
                >
                  {item.activa ? 'Activa' : 'Inactiva'}
                </Text>
                <Text style={estilos.flecha}>›</Text>
              </View>
            </Pressable>
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
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
  },
  filaPresionada: { backgroundColor: colores.presionado },
  filaTextos: { flex: 1, gap: 2 },
  nombre: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto },
  detalle: { fontSize: tipografia.nota, color: colores.textoSuave },
  derecha: { alignItems: 'flex-end', gap: espaciado.xs },
  estado: { fontSize: tipografia.nota, fontWeight: '700' },
  estadoActiva: { color: colores.exito },
  estadoInactiva: { color: colores.textoSuave },
  flecha: { fontSize: 22, color: colores.textoSuave },
});
