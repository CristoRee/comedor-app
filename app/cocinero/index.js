import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';

export default function InicioCocinero() {
  const { perfil } = useAuth();

  return (
    <Pantalla>
      <Encabezado titulo="Cocina" subtitulo={`${perfil.nombre} ${perfil.apellido}`} />

      <Aviso tipo="info" titulo="Carga del menú">
        La carga del menú del día se habilita en la etapa 2.
      </Aviso>
    </Pantalla>
  );
}
