import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';

export default function InicioAlumno() {
  const { perfil, institucion } = useAuth();

  return (
    <Pantalla>
      <Encabezado
        titulo="Mi Bandeja"
        subtitulo={`${perfil.nombre} ${perfil.apellido}`}
        nota={institucion?.nombre}
      />

      <Aviso tipo="exito" titulo="Cuenta habilitada">
        Tu cuenta está aprobada. El menú del día y la confirmación de asistencia se habilitan en
        las próximas etapas.
      </Aviso>
    </Pantalla>
  );
}
