import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { Aviso, Boton, Cargando, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';
import { colores, espaciado, radio, tipografia } from '../../src/theme';

export default function CatalogoInstituciones() {
  const [instituciones, setInstituciones] = useState(null);
  const [procesando, setProcesando] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, 'instituciones'),
      (instantanea) => {
        const lista = instantanea.docs.map((registro) => ({ id: registro.id, ...registro.data() }));
        lista.sort(
          (a, b) =>
            a.departamento.localeCompare(b.departamento) || a.nombre.localeCompare(b.nombre)
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

  async function cambiarEstado(institucion) {
    setProcesando(institucion.id);
    setError(null);

    try {
      await updateDoc(doc(db, 'instituciones', institucion.id), { activa: !institucion.activa });
    } catch {
      setError('No se pudo actualizar la institución. Revisá la conexión.');
    } finally {
      setProcesando(null);
    }
  }

  function confirmar(institucion) {
    const accion = institucion.activa ? 'Desactivar' : 'Activar';
    const detalle = institucion.activa
      ? 'Deja de aparecer en la lista de registro. Las cuentas ya aprobadas siguen funcionando.'
      : 'Pasa a aparecer en la lista de registro de su departamento.';

    Alert.alert(`${accion} ${institucion.nombre}`, detalle, [
      { text: 'Cancelar', style: 'cancel' },
      { text: accion, onPress: () => cambiarEstado(institucion) },
    ]);
  }

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
        renderItem={({ item }) => (
          <View style={estilos.tarjeta}>
            <View style={estilos.cabecera}>
              <View style={estilos.textos}>
                <Text style={estilos.nombre}>{item.nombre}</Text>
                <Text style={estilos.ubicacion}>{`${item.ciudad}, ${item.departamento}`}</Text>
                <Text style={estilos.ubicacion}>{`Apertura del comedor: ${item.horaApertura}`}</Text>
              </View>
              <Text style={[estilos.estado, item.activa ? estilos.estadoActiva : estilos.estadoInactiva]}>
                {item.activa ? 'Activa' : 'Inactiva'}
              </Text>
            </View>

            <Boton
              titulo={item.activa ? 'Desactivar' : 'Activar'}
              variante={item.activa ? 'secundario' : 'primario'}
              onPress={() => confirmar(item)}
              cargando={procesando === item.id}
            />
          </View>
        )}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  lista: { gap: espaciado.md, paddingBottom: espaciado.lg },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.md,
  },
  cabecera: { flexDirection: 'row', gap: espaciado.md, alignItems: 'flex-start' },
  textos: { flex: 1, gap: 2 },
  nombre: { fontSize: tipografia.subtitulo, fontWeight: '700', color: colores.texto },
  ubicacion: { fontSize: tipografia.nota, color: colores.textoSuave },
  estado: { fontSize: tipografia.nota, fontWeight: '700' },
  estadoActiva: { color: colores.exito },
  estadoInactiva: { color: colores.textoSuave },
});
