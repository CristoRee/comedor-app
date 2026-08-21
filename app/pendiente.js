import { View } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { Aviso, Boton, Pantalla, Subtitulo, Titulo } from '../src/components/ui';

const MENSAJES = {
  pendiente: {
    tipo: 'info',
    titulo: 'Registro enviado',
    texto:
      'Tu registro fue enviado correctamente. Un administrador lo va a revisar y, una vez aprobado, esta pantalla se actualiza sola.',
  },
  rechazado: {
    tipo: 'error',
    titulo: 'Registro rechazado',
    texto: 'Tu registro no fue aprobado. Acercate a administración para regularizar la situación.',
  },
  suspendido: {
    tipo: 'advertencia',
    titulo: 'Cuenta suspendida',
    texto: 'Tu cuenta está suspendida. Acercate a administración para más información.',
  },
};

export default function Pendiente() {
  const { perfil, estado, cerrarSesion } = useAuth();
  const mensaje = MENSAJES[estado] ?? MENSAJES.pendiente;

  return (
    <Pantalla contentContainerStyle={{ justifyContent: 'center' }}>
      <View style={{ gap: 8 }}>
        <Titulo>Mi Bandeja</Titulo>
        {perfil ? <Subtitulo>{`${perfil.nombre} ${perfil.apellido}`}</Subtitulo> : null}
      </View>

      <Aviso tipo={mensaje.tipo} titulo={mensaje.titulo}>
        {mensaje.texto}
      </Aviso>

      <Boton titulo="Cerrar sesión" variante="secundario" onPress={cerrarSesion} />
    </Pantalla>
  );
}
