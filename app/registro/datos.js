import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Timestamp, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../src/firebase';
import { Aviso, Boton, Campo, Pantalla, Subtitulo, Titulo } from '../../src/components/ui';
import {
  limpiarNumeros,
  mensajeDeError,
  parsearFecha,
  validarCedula,
  validarContrasenia,
  validarCorreo,
  validarFechaNacimiento,
  validarNombre,
  validarTelefono,
} from '../../src/validaciones';
import { colores, espaciado, tipografia } from '../../src/theme';

const CAMPOS_VACIOS = {
  nombre: '',
  apellido: '',
  ci: '',
  correo: '',
  telefono: '',
  fechaNacimiento: '',
  contrasenia: '',
  repetir: '',
};

export default function DatosDelRegistro() {
  const { institucionId, institucionNombre } = useLocalSearchParams();
  const [datos, setDatos] = useState(CAMPOS_VACIOS);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const actualizar = (campo) => (valor) => setDatos((previo) => ({ ...previo, [campo]: valor }));

  function revisarCampos() {
    return {
      nombre: validarNombre(datos.nombre),
      apellido: validarNombre(datos.apellido),
      ci: validarCedula(datos.ci),
      correo: validarCorreo(datos.correo),
      telefono: validarTelefono(datos.telefono),
      fechaNacimiento: validarFechaNacimiento(datos.fechaNacimiento),
      contrasenia: validarContrasenia(datos.contrasenia),
      repetir: datos.repetir === datos.contrasenia ? null : 'Las contraseñas no coinciden.',
    };
  }

  async function registrar() {
    const revision = revisarCampos();
    setErrores(revision);
    if (Object.values(revision).some(Boolean)) return;

    setEnviando(true);
    setErrorGeneral(null);

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        datos.correo.trim(),
        datos.contrasenia
      );

      await setDoc(doc(db, 'usuarios', user.uid), {
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        ci: limpiarNumeros(datos.ci),
        email: datos.correo.trim().toLowerCase(),
        telefono: limpiarNumeros(datos.telefono),
        fechaNacimiento: Timestamp.fromDate(parsearFecha(datos.fechaNacimiento)),
        institucionId,
        rol: 'alumno',
        estado: 'pendiente',
        tickets: 0,
        creadoEn: serverTimestamp(),
      });
    } catch (error) {
      setErrorGeneral(mensajeDeError(error));
      setEnviando(false);
    }
  }

  if (!institucionId) {
    return (
      <Pantalla bordes={['bottom']}>
        <Aviso tipo="error" titulo="Falta la institución">
          Volvé atrás y elegí tu departamento e institución antes de completar el registro.
        </Aviso>
      </Pantalla>
    );
  }

  return (
    <Pantalla bordes={['bottom']}>
      <View style={estilos.encabezado}>
        <Titulo>Crear cuenta</Titulo>
        <Subtitulo>{institucionNombre}</Subtitulo>
      </View>

      <Aviso tipo="info">
        El encargado de tu institución revisa cada registro antes de habilitarlo.
      </Aviso>

      {errorGeneral ? <Aviso tipo="error">{errorGeneral}</Aviso> : null}

      <Campo
        etiqueta="Nombres"
        value={datos.nombre}
        onChangeText={actualizar('nombre')}
        error={errores.nombre}
        autoCapitalize="words"
        placeholder="Juan"
      />

      <Campo
        etiqueta="Apellidos"
        value={datos.apellido}
        onChangeText={actualizar('apellido')}
        error={errores.apellido}
        autoCapitalize="words"
        placeholder="Salinas"
      />

      <Campo
        etiqueta="Cédula de identidad"
        value={datos.ci}
        onChangeText={actualizar('ci')}
        error={errores.ci}
        keyboardType="number-pad"
        maxLength={8}
        ayuda="Sin puntos ni guiones."
        placeholder="11223344"
      />

      <Campo
        etiqueta="Fecha de nacimiento"
        value={datos.fechaNacimiento}
        onChangeText={actualizar('fechaNacimiento')}
        error={errores.fechaNacimiento}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        placeholder="dd/mm/aaaa"
      />

      <Campo
        etiqueta="Correo electrónico"
        value={datos.correo}
        onChangeText={actualizar('correo')}
        error={errores.correo}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="nombre@ejemplo.com"
      />

      <Campo
        etiqueta="Teléfono"
        value={datos.telefono}
        onChangeText={actualizar('telefono')}
        error={errores.telefono}
        keyboardType="phone-pad"
        maxLength={9}
        placeholder="099123456"
      />

      <Campo
        etiqueta="Contraseña"
        value={datos.contrasenia}
        onChangeText={actualizar('contrasenia')}
        error={errores.contrasenia}
        autoCapitalize="none"
        secureTextEntry
        ayuda="Mínimo 6 caracteres."
      />

      <Campo
        etiqueta="Repetir contraseña"
        value={datos.repetir}
        onChangeText={actualizar('repetir')}
        error={errores.repetir}
        autoCapitalize="none"
        secureTextEntry
      />

      <Boton titulo="Enviar registro" onPress={registrar} cargando={enviando} />

      <View style={estilos.pie}>
        <Text style={estilos.pieTexto}>¿Ya tenés cuenta?</Text>
        <Link href="/login" asChild>
          <Pressable>
            <Text style={estilos.enlace}>Ingresar</Text>
          </Pressable>
        </Link>
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  encabezado: { gap: espaciado.sm, marginBottom: espaciado.xs },
  pie: { flexDirection: 'row', justifyContent: 'center', gap: espaciado.xs, marginTop: espaciado.sm },
  pieTexto: { fontSize: tipografia.nota + 1, color: colores.textoSuave },
  enlace: { fontSize: tipografia.nota + 1, color: colores.primario, fontWeight: '600' },
});
