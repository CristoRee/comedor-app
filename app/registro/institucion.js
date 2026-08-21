import { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { Aviso, Cargando, Opcion, Pantalla, Subtitulo, Titulo } from '../../src/components/ui';
import { espaciado } from '../../src/theme';

export default function ElegirInstitucion() {
  const { departamento } = useLocalSearchParams();
  const router = useRouter();
  const [instituciones, setInstituciones] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;

    async function cargar() {
      try {
        const resultado = await getDocs(
          query(collection(db, 'instituciones'), where('departamento', '==', departamento))
        );

        if (!vigente) return;

        const lista = resultado.docs
          .map((registro) => ({ id: registro.id, ...registro.data() }))
          .filter((institucion) => institucion.activa)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        setInstituciones(lista);
      } catch {
        if (!vigente) return;
        setInstituciones([]);
        setError('No se pudo cargar la lista de instituciones. Revisá la conexión.');
      }
    }

    cargar();
    return () => {
      vigente = false;
    };
  }, [departamento]);

  if (!instituciones) {
    return (
      <Pantalla scroll={false} bordes={['bottom']}>
        <Cargando texto="Buscando instituciones" />
      </Pantalla>
    );
  }

  return (
    <Pantalla scroll={false} bordes={['bottom']}>
      <Titulo>{departamento}</Titulo>
      <Subtitulo>Elegí la institución a la que pertenecés.</Subtitulo>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <FlatList
        data={instituciones}
        keyExtractor={(institucion) => institucion.id}
        style={estilos.flex}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          error ? null : (
            <Aviso tipo="info" titulo="Sin instituciones disponibles">
              Todavía no hay ninguna institución de tu departamento usando Mi Bandeja.
            </Aviso>
          )
        }
        renderItem={({ item }) => (
          <Opcion
            titulo={item.nombre}
            detalle={item.ciudad}
            onPress={() =>
              router.push({
                pathname: '/registro/datos',
                params: { institucionId: item.id, institucionNombre: item.nombre },
              })
            }
          />
        )}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  lista: { gap: espaciado.sm, paddingBottom: espaciado.lg },
});
