import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../src/firebase';
import { Aviso, Boton, Campo, Pantalla, Subtitulo, Titulo } from '../src/components/ui';
import { formatoCorreo, mensajeDeError, validarCorreo } from '../src/validaciones';
import { espaciado, tipografia } from '../src/theme';
import { useEstilos } from '../src/contexts/TemaContext';

export default function Login() {
  const estilos = useEstilos(crearEstilos);
  const [correo, setCorreo] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const campoContrasenia = useRef(null);

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
        <Subtitulo>Comedor institucional</Subtitulo>
      </View>

      {errorGeneral ? <Aviso tipo="error">{errorGeneral}</Aviso> : null}

      <Campo
        etiqueta="Correo electrónico"
        value={correo}
        onChangeText={(valor) => {
          setCorreo(valor);
          setErrores((previos) => ({ ...previos, correo: null }));
        }}
        onBlur={() => setErrores((previos) => ({ ...previos, correo: validarCorreo(correo) }))}
        error={errores.correo}
        formato={formatoCorreo}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        placeholder="nombre@ejemplo.com"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoContrasenia.current?.focus()}
      />

      <Campo
        ref={campoContrasenia}
        etiqueta="Contraseña"
        value={contrasenia}
        onChangeText={(valor) => {
          setContrasenia(valor);
          setErrores((previos) => ({ ...previos, contrasenia: null }));
        }}
        error={errores.contrasenia}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        placeholder="Tu contraseña"
        returnKeyType="done"
        onSubmitEditing={ingresar}
      />

      <Boton titulo="Ingresar" onPress={ingresar} cargando={enviando} />

      <View style={estilos.pie}>
        <Text style={estilos.pieTexto}>¿Todavía no tenés cuenta?</Text>
        <Link href="/registro" asChild>
          <Pressable accessibilityRole="link">
            <Text style={estilos.enlace}>Registrarme</Text>
          </Pressable>
        </Link>
      </View>
    </Pantalla>
  );
}

const crearEstilos = (colores) =>
  StyleSheet.create({
  contenido: { justifyContent: 'center' },
  encabezado: { marginBottom: espaciado.md, gap: espaciado.sm },
  pie: { flexDirection: 'row', justifyContent: 'center', gap: espaciado.xs, marginTop: espaciado.sm },
  pieTexto: { fontSize: tipografia.nota + 1, color: colores.textoSuave },
  enlace: { fontSize: tipografia.nota + 1, color: colores.primario, fontWeight: '600' },
});
