import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Timestamp, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { crearCuentaSinIniciarSesion, db } from '../../../src/firebase';
import { Aviso, Boton, Campo, Cargando, Pantalla } from '../../../src/components/ui';
import { ROLES } from '../../../src/contexts/AuthContext';
import { fechaCorta } from '../../../src/fechas';
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
} from '../../../src/validaciones';
import { espaciado, radio, tipografia } from '../../../src/theme';
import { useEstilos } from '../../../src/contexts/TemaContext';

// El superadmin no se asigna a sí mismo desde acá: ese rol solo lo da el
// script con el Admin SDK, y es lo que impide que alguien se lo autoconceda.
const ROLES_ASIGNABLES = ROLES.filter((rol) => rol !== 'superadmin');

const ESTADOS = ['activo', 'pendiente', 'suspendido', 'rechazado'];

export default function FichaDeUsuario() {
  const estilos = useEstilos(crearEstilos);
  const { id, uid } = useLocalSearchParams();
  const router = useRouter();

  const editando = Boolean(uid);
  const [cargado, setCargado] = useState(!editando);
  const [datos, setDatos] = useState({
    nombre: '',
    apellido: '',
    ci: '',
    fechaNacimiento: '',
    correo: '',
    telefono: '',
    contrasenia: '',
  });
  const [rol, setRol] = useState('alumno');
  const [estado, setEstado] = useState('activo');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    if (!editando) return;

    getDoc(doc(db, 'usuarios', uid))
      .then((instantanea) => {
        if (!instantanea.exists()) {
          setErrorGeneral('No se encontró el usuario.');
          setCargado(true);
          return;
        }

        const perfil = instantanea.data();
        setDatos({
          nombre: perfil.nombre ?? '',
          apellido: perfil.apellido ?? '',
          ci: perfil.ci ?? '',
          fechaNacimiento: perfil.fechaNacimiento?.toDate
            ? fechaCorta(perfil.fechaNacimiento)
            : '',
          correo: perfil.email ?? '',
          telefono: perfil.telefono ?? '',
          contrasenia: '',
        });
        setRol(perfil.rol ?? 'alumno');
        setEstado(perfil.estado ?? 'activo');
        setCargado(true);
      })
      .catch(() => {
        setErrorGeneral('No se pudo cargar el usuario.');
        setCargado(true);
      });
  }, [editando, uid]);

  const actualizar = (campo) => (valor) => {
    setDatos((previo) => ({ ...previo, [campo]: valor }));
    setErrores((previos) => ({ ...previos, [campo]: null }));
  };

  function revisar() {
    return {
      nombre: validarNombre(datos.nombre),
      apellido: validarNombre(datos.apellido),
      ci: validarCedula(datos.ci),
      fechaNacimiento: validarFechaNacimiento(datos.fechaNacimiento),
      correo: validarCorreo(datos.correo),
      telefono: validarTelefono(datos.telefono),
      // Al editar no se toca la contraseña: el SDK cliente no puede cambiarle
      // la contraseña a otra persona.
      contrasenia: editando ? null : validarContrasenia(datos.contrasenia),
    };
  }

  async function guardar() {
    const revision = revisar();
    setErrores(revision);
    if (Object.values(revision).some(Boolean)) return;

    setGuardando(true);
    setErrorGeneral(null);

    const comunes = {
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      ci: limpiarNumeros(datos.ci),
      email: datos.correo.trim().toLowerCase(),
      telefono: limpiarNumeros(datos.telefono),
      fechaNacimiento: Timestamp.fromDate(parsearFecha(datos.fechaNacimiento)),
      institucionId: id,
      rol,
      estado,
    };

    try {
      if (editando) {
        await updateDoc(doc(db, 'usuarios', uid), comunes);
        setAviso({ tipo: 'exito', texto: 'Usuario actualizado.' });
        setGuardando(false);
        return;
      }

      const nuevoUid = await crearCuentaSinIniciarSesion(
        datos.correo.trim(),
        datos.contrasenia
      );

      await setDoc(doc(db, 'usuarios', nuevoUid), {
        ...comunes,
        subrol: null,
        tickets: 0,
        creadoEn: serverTimestamp(),
      });

      router.replace(`/superadmin/${id}/usuarios`);
    } catch (error) {
      setErrorGeneral(mensajeDeError(error));
      setGuardando(false);
    }
  }

  if (!cargado) {
    return (
      <Pantalla scroll={false}>
        <Cargando />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Pressable onPress={() => router.replace(`/superadmin/${id}/usuarios`)} hitSlop={8}>
        <Text style={estilos.volver}>‹ Usuarios</Text>
      </Pressable>

      <Text style={estilos.titulo}>{editando ? 'Editar usuario' : 'Crear usuario'}</Text>
      <Text style={estilos.subtitulo}>{id}</Text>

      {errorGeneral ? <Aviso tipo="error">{errorGeneral}</Aviso> : null}
      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

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
        formato={formatoCedula}
        keyboardType="number-pad"
        placeholder="11223344"
      />

      <Campo
        etiqueta="Fecha de nacimiento"
        value={datos.fechaNacimiento}
        onChangeText={actualizar('fechaNacimiento')}
        error={errores.fechaNacimiento}
        formato={formatoFecha}
        keyboardType="number-pad"
        placeholder="dd/mm/aaaa"
      />

      <Campo
        etiqueta="Correo electrónico"
        value={datos.correo}
        onChangeText={actualizar('correo')}
        error={errores.correo}
        formato={formatoCorreo}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        ayuda={editando ? 'Cambiarlo acá no cambia el correo con el que inicia sesión.' : null}
        placeholder="nombre@ejemplo.com"
      />

      <Campo
        etiqueta="Teléfono"
        value={datos.telefono}
        onChangeText={actualizar('telefono')}
        error={errores.telefono}
        formato={formatoTelefono}
        keyboardType="phone-pad"
        placeholder="099123456"
      />

      {!editando ? (
        <Campo
          etiqueta="Contraseña inicial"
          value={datos.contrasenia}
          onChangeText={actualizar('contrasenia')}
          error={errores.contrasenia}
          secureTextEntry
          autoCapitalize="none"
          ayuda="Se la das a la persona para que entre y después la cambie."
        />
      ) : null}

      <Text style={estilos.seccion}>Rol</Text>
      <View style={estilos.opciones}>
        {ROLES_ASIGNABLES.map((opcion) => (
          <Pressable
            key={opcion}
            onPress={() => setRol(opcion)}
            style={[estilos.opcion, rol === opcion && estilos.opcionActiva]}
          >
            <Text style={[estilos.opcionTexto, rol === opcion && estilos.opcionTextoActiva]}>
              {opcion}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={estilos.seccion}>Estado</Text>
      <View style={estilos.opciones}>
        {ESTADOS.map((opcion) => (
          <Pressable
            key={opcion}
            onPress={() => setEstado(opcion)}
            style={[estilos.opcion, estado === opcion && estilos.opcionActiva]}
          >
            <Text style={[estilos.opcionTexto, estado === opcion && estilos.opcionTextoActiva]}>
              {opcion}
            </Text>
          </Pressable>
        ))}
      </View>

      <Aviso tipo="info">
        El rol se aplica en cuanto se guarda: la persona no necesita cerrar sesión.
      </Aviso>

      <Boton
        titulo={editando ? 'Guardar cambios' : 'Crear usuario'}
        onPress={guardar}
        cargando={guardando}
      />
    </Pantalla>
  );
}

const crearEstilos = (colores) =>
  StyleSheet.create({
    volver: { fontSize: tipografia.cuerpo, color: colores.primario, fontWeight: '600' },
    titulo: { fontSize: tipografia.titulo - 4, fontWeight: '700', color: colores.texto },
    subtitulo: { fontSize: tipografia.nota + 1, color: colores.textoSuave, marginTop: -espaciado.sm },
    seccion: {
      fontSize: tipografia.subtitulo,
      fontWeight: '700',
      color: colores.texto,
      marginTop: espaciado.sm,
    },
    opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.xs },
    opcion: {
      paddingHorizontal: espaciado.md,
      paddingVertical: espaciado.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colores.borde,
      backgroundColor: colores.superficie,
    },
    opcionActiva: { backgroundColor: colores.destacado, borderColor: colores.destacado },
    opcionTexto: { fontSize: tipografia.nota + 1, color: colores.texto, fontWeight: '600' },
    opcionTextoActiva: { color: colores.destacadoTexto },
  });
