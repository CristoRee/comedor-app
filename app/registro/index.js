import { FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import departamentos from '../../src/departamentos.json';
import { Opcion, Pantalla, Subtitulo, Titulo } from '../../src/components/ui';
import { espaciado } from '../../src/theme';

export default function ElegirDepartamento() {
  const router = useRouter();

  return (
    <Pantalla scroll={false} bordes={['bottom']}>
      <Titulo>¿Dónde estudiás?</Titulo>
      <Subtitulo>Elegí tu departamento para ver las instituciones disponibles.</Subtitulo>

      <FlatList
        data={departamentos}
        keyExtractor={(departamento) => departamento}
        style={estilos.flex}
        contentContainerStyle={estilos.lista}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Opcion
            titulo={item}
            onPress={() =>
              router.push({ pathname: '/registro/institucion', params: { departamento: item } })
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
