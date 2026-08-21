import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../src/firebase';
import { Aviso, Boton, Campo, Pantalla, Subtitulo, Titulo } from '../src/components/ui';
import { mensajeDeError, validarCorreo } from '../src/validaciones';
import { colores, espaciado, tipografia } from '../src/theme';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function ingresar() {
    const revision = {
      correo: validarCorreo(correo),
      contrasenia: contrasenia ? null : 'Campo obligatorio.',
    };

    setErrores(revision);
    if (Object.values(revision).some(Boolean)) return;

    setEnviando(true);
    setErrorGeneral(null);

    try {
      await signInWithEmailAndPassword(auth, correo.trim(), contrasenia);
    } catch (error) {
      setErrorGeneral(mensajeDeError(error));
      setEnviando(false);
    }
  }

  return (
    <Pantalla contentContainerStyle={estilos.contenido}>
      <View style={estilos.encabezado}>
        <Titulo>Mi Bandeja</Titulo>
        <Subtitulo>Comedor del Polo Educativo Tecnológico</Subtitulo>
      </View>

      {errorGeneral ? <Aviso tipo="error">{errorGeneral}</Aviso> : null}

      <Campo
        etiqueta="Correo electrónico"
        value={correo}
        onChangeText={setCorreo}
        error={errores.correo}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="nombre@ejemplo.com"
      />

      <Campo
        etiqueta="Contraseña"
        value={contrasenia}
        onChangeText={setContrasenia}
        error={errores.contrasenia}
        autoCapitalize="none"
        secureTextEntry
        placeholder="Tu contraseña"
      />

      <Boton titulo="Ingresar" onPress={ingresar} cargando={enviando} />

      <View style={estilos.pie}>
        <Text style={estilos.pieTexto}>¿Todavía no tenés cuenta?</Text>
        <Link href="/registro" asChild>
          <Pressable>
            <Text style={estilos.enlace}>Registrarme</Text>
          </Pressable>
        </Link>
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  contenido: { justifyContent: 'center' },
  encabezado: { marginBottom: espaciado.md, gap: espaciado.sm },
  pie: { flexDirection: 'row', justifyContent: 'center', gap: espaciado.xs, marginTop: espaciado.sm },
  pieTexto: { fontSize: tipografia.nota + 1, color: colores.textoSuave },
  enlace: { fontSize: tipografia.nota + 1, color: colores.primario, fontWeight: '600' },
});
