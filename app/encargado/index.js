import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';

export default function InicioEncargado() {
  const { perfil } = useAuth();

  return (
    <Pantalla>
      <Encabezado titulo="Control de acceso" subtitulo={`${perfil.nombre} ${perfil.apellido}`} />

      <Aviso tipo="info" titulo="Escáner de códigos QR">
        El escaneo de asistencias se habilita en la etapa 4.
      </Aviso>
    </Pantalla>
  );
}
