import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { Timestamp, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../src/firebase';
import { Aviso, Boton, Campo, Pantalla, Subtitulo, Titulo } from '../../src/components/ui';
import {
  formatoCedula,
  formatoCorreo,
  formatoFecha,
  formatoTelefono,
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
  fechaNacimiento: '',
  correo: '',
  telefono: '',
  contrasenia: '',
  repetir: '',
};

export default function DatosDelRegistro() {
  const { institucionId, institucionNombre } = useLocalSearchParams();
  const [datos, setDatos] = useState(CAMPOS_VACIOS);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const apellido = useRef(null);
  const cedula = useRef(null);
  const nacimiento = useRef(null);
  const correo = useRef(null);
  const telefono = useRef(null);
  const contrasenia = useRef(null);
  const repetir = useRef(null);

  function revisar(campo, valores = datos) {
    if (campo === 'nombre') return validarNombre(valores.nombre);
    if (campo === 'apellido') return validarNombre(valores.apellido);
    if (campo === 'ci') return validarCedula(valores.ci);
    if (campo === 'fechaNacimiento') return validarFechaNacimiento(valores.fechaNacimiento);
    if (campo === 'correo') return validarCorreo(valores.correo);
    if (campo === 'telefono') return validarTelefono(valores.telefono);
    if (campo === 'contrasenia') return validarContrasenia(valores.contrasenia);
    if (campo === 'repetir') {
      if (!valores.repetir) return 'Campo obligatorio.';
      return valores.repetir === valores.contrasenia ? null : 'Las contraseñas no coinciden.';
    }

    return null;
  }

  // Mientras corrige un campo se le saca el error de encima; se vuelve a
  // revisar cuando lo deja.
  const actualizar = (campo) => (valor) => {
    setDatos((previo) => ({ ...previo, [campo]: valor }));
    setErrores((previos) => ({ ...previos, [campo]: null }));
  };

  const alSalir = (campo) => () => {
    setErrores((previos) => ({ ...previos, [campo]: revisar(campo) }));
  };

  async function registrar() {
    const revision = Object.keys(CAMPOS_VACIOS).reduce(
      (total, campo) => ({ ...total, [campo]: revisar(campo) }),
      {}
    );

    setErrores(revision);
    if (Object.values(revision).some(Boolean)) return;

    setEnviando(true);
    setErrorGeneral(null);

    let cuenta;

    try {
      const credencial = await createUserWithEmailAndPassword(
        auth,
        datos.correo.trim(),
        datos.contrasenia
      );
      cuenta = credencial.user;
    } catch (error) {
      setErrorGeneral(mensajeDeError(error));
      setEnviando(false);
      return;
    }

    try {
      await setDoc(doc(db, 'usuarios', cuenta.uid), {
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        ci: limpiarNumeros(datos.ci),
        email: datos.correo.trim().toLowerCase(),
        telefono: limpiarNumeros(datos.telefono),
        fechaNacimiento: Timestamp.fromDate(parsearFecha(datos.fechaNacimiento)),
        institucionId,
        rol: 'alumno',
        subrol: null,
        estado: 'pendiente',
        tickets: 0,
        creadoEn: serverTimestamp(),
      });
    } catch (error) {
      // Sin su documento la cuenta no le sirve a nadie: no aparece en la lista
      // del encargado y bloquea el correo para un segundo intento. Se borra
      // para que pueda registrarse de nuevo con los mismos datos.
      await deleteUser(cuenta).catch(() => {});

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

  const contraseniasCoinciden =
    datos.contrasenia.length > 0 && datos.contrasenia === datos.repetir;

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
        onBlur={alSalir('nombre')}
        error={errores.nombre}
        autoCapitalize="words"
        autoComplete="given-name"
        placeholder="Juan"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => apellido.current?.focus()}
      />

      <Campo
        ref={apellido}
        etiqueta="Apellidos"
        value={datos.apellido}
        onChangeText={actualizar('apellido')}
        onBlur={alSalir('apellido')}
        error={errores.apellido}
        autoCapitalize="words"
        autoComplete="family-name"
        placeholder="Salinas"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => cedula.current?.focus()}
      />

      <Campo
        ref={cedula}
        etiqueta="Cédula de identidad"
        value={datos.ci}
        onChangeText={actualizar('ci')}
        onBlur={alSalir('ci')}
        error={errores.ci}
        formato={formatoCedula}
        keyboardType="number-pad"
        ayuda="Solo números, sin puntos ni guiones."
        placeholder="11223344"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => nacimiento.current?.focus()}
      />

      <Campo
        ref={nacimiento}
        etiqueta="Fecha de nacimiento"
        value={datos.fechaNacimiento}
        onChangeText={actualizar('fechaNacimiento')}
        onBlur={alSalir('fechaNacimiento')}
        error={errores.fechaNacimiento}
        formato={formatoFecha}
        keyboardType="number-pad"
        ayuda="Escribí solo los números: las barras se ponen solas."
        placeholder="dd/mm/aaaa"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => correo.current?.focus()}
      />

      <Campo
        ref={correo}
        etiqueta="Correo electrónico"
        value={datos.correo}
        onChangeText={actualizar('correo')}
        onBlur={alSalir('correo')}
        error={errores.correo}
        formato={formatoCorreo}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        placeholder="nombre@ejemplo.com"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => telefono.current?.focus()}
      />

      <Campo
        ref={telefono}
        etiqueta="Teléfono"
        value={datos.telefono}
        onChangeText={actualizar('telefono')}
        onBlur={alSalir('telefono')}
        error={errores.telefono}
        formato={formatoTelefono}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="099123456"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => contrasenia.current?.focus()}
      />

      <Campo
        ref={contrasenia}
        etiqueta="Contraseña"
        value={datos.contrasenia}
        onChangeText={actualizar('contrasenia')}
        onBlur={alSalir('contrasenia')}
        error={errores.contrasenia}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        ayuda="Mínimo 6 caracteres."
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => repetir.current?.focus()}
      />

      <Campo
        ref={repetir}
        etiqueta="Repetir contraseña"
        value={datos.repetir}
        onChangeText={actualizar('repetir')}
        onBlur={alSalir('repetir')}
        error={errores.repetir}
        exito={contraseniasCoinciden ? 'Las contraseñas coinciden.' : null}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={registrar}
      />

      <Boton titulo="Enviar registro" onPress={registrar} cargando={enviando} />

      <View style={estilos.pie}>
        <Text style={estilos.pieTexto}>¿Ya tenés cuenta?</Text>
        <Link href="/login" asChild>
          <Pressable accessibilityRole="link">
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
