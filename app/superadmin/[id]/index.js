import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../src/firebase';
import { Aviso, Boton, Campo, Cargando, Interruptor, Pantalla } from '../../../src/components/ui';
import { PERMISOS_DEL_ADMIN, permisosDeLaInstitucion } from '../../../src/permisos';
import { CONCEPTOS, normalizarPrecio, precioDe } from '../../../src/precios';
import { espaciado, radio, tipografia } from '../../../src/theme';
import { useEstilos } from '../../../src/contexts/TemaContext';

const CAMPOS_DE_PRECIO = CONCEPTOS.map((concepto) => ({
  clave: concepto.clavePrecio,
  etiqueta: concepto.titulo,
}));

function Dato({ etiqueta, valor }) {
  const estilos = useEstilos(crearEstilos);
  return (
    <View style={estilos.dato}>
      <Text style={estilos.datoEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.datoValor}>{valor}</Text>
    </View>
  );
}

export default function ConfiguracionDeInstitucion() {
  const estilos = useEstilos(crearEstilos);
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [institucion, setInstitucion] = useState(undefined);
  const [precios, setPrecios] = useState({});
  const [erroresDePrecio, setErroresDePrecio] = useState({});
  const [accion, setAccion] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    return onSnapshot(
      doc(db, 'instituciones', id),
      (instantanea) =>
        setInstitucion(instantanea.exists() ? { id: instantanea.id, ...instantanea.data() } : null),
      () => setInstitucion(null)
    );
  }, [id]);

  useEffect(() => {
    if (!institucion) return;

    setPrecios(
      CAMPOS_DE_PRECIO.reduce((total, campo) => {
        const valor = precioDe(institucion, campo.clave);
        return { ...total, [campo.clave]: valor === null ? '' : String(valor) };
      }, {})
    );
  }, [institucion]);

  async function guardar(clave, cambios, mensaje) {
    setAccion(clave);
    setAviso(null);

    try {
      await updateDoc(doc(db, 'instituciones', id), cambios);
      setAviso({ tipo: 'exito', texto: mensaje });
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo guardar el cambio. Revisá la conexión.' });
    } finally {
      setAccion(null);
    }
  }

  function cambiarPermiso(clave, valor) {
    const permisos = { ...permisosDeLaInstitucion(institucion), [clave]: valor };
    const titulo = PERMISOS_DEL_ADMIN.find((permiso) => permiso.clave === clave)?.titulo ?? clave;

    guardar(
      `permiso_${clave}`,
      { permisosDelAdmin: permisos },
      valor ? `Activado: ${titulo}.` : `Desactivado: ${titulo}.`
    );
  }

  function confirmarEstado() {
    const accionTexto = institucion.activa ? 'Desactivar' : 'Activar';
    const detalle = institucion.activa
      ? 'Deja de aparecer en la lista de registro. Las cuentas ya aprobadas siguen funcionando.'
      : 'Pasa a aparecer en la lista de registro de su departamento.';

    Alert.alert(`${accionTexto} ${institucion.nombre}`, detalle, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: accionTexto,
        onPress: () =>
          guardar(
            'estado',
            { activa: !institucion.activa },
            institucion.activa ? 'Institución desactivada.' : 'Institución activada.'
          ),
      },
    ]);
  }

  function guardarPrecios() {
    const revisados = {};
    const fallos = {};

    for (const campo of CAMPOS_DE_PRECIO) {
      const { vacio, valor } = normalizarPrecio(precios[campo.clave]);

      if (vacio) {
        revisados[campo.clave] = null;
        continue;
      }

      if (valor === null) {
        fallos[campo.clave] = 'Escribí un número mayor o igual a cero.';
        continue;
      }

      revisados[campo.clave] = valor;
    }

    setErroresDePrecio(fallos);
    if (Object.keys(fallos).length) return;

    guardar('precios', { precios: revisados }, 'Precios actualizados.');
  }

  if (institucion === undefined) {
    return (
      <Pantalla scroll={false}>
        <Cargando />
      </Pantalla>
    );
  }

  if (!institucion) {
    return (
      <Pantalla>
        <Aviso tipo="error" titulo="Institución no encontrada">
          Puede haber sido eliminada del catálogo.
        </Aviso>
        <Boton titulo="Volver" variante="secundario" onPress={() => router.replace('/superadmin')} />
      </Pantalla>
    );
  }

  const permisos = permisosDeLaInstitucion(institucion);

  return (
    <Pantalla>
      <Pressable onPress={() => router.replace('/superadmin')} hitSlop={8}>
        <Text style={estilos.volver}>‹ Instituciones</Text>
      </Pressable>

      <Text style={estilos.nombre}>{institucion.nombre}</Text>

      <View style={estilos.tarjeta}>
        <Dato etiqueta="Identificador" valor={institucion.id} />
        <Dato etiqueta="Departamento" valor={institucion.departamento} />
        <Dato etiqueta="Ciudad" valor={institucion.ciudad} />
        <Dato etiqueta="Apertura" valor={institucion.horarios?.horaAperturaComedor ?? '—'} />
        <Dato
          etiqueta="Corte chicos/grandes"
          valor={`${institucion.edadCorteChicoGrande ?? '—'} años`}
        />
        <Dato
          etiqueta="Internado"
          valor={institucion.subroles?.internado?.activo ? 'activo' : 'sin uso'}
        />
      </View>

      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

      <Boton
        titulo="Ver usuarios de esta institución"
        variante="secundario"
        onPress={() => router.push(`/superadmin/${id}/usuarios`)}
      />

      <Text style={estilos.seccion}>Estado en el catálogo</Text>

      <Boton
        titulo={institucion.activa ? 'Desactivar institución' : 'Activar institución'}
        variante={institucion.activa ? 'peligro' : 'primario'}
        onPress={confirmarEstado}
        cargando={accion === 'estado'}
        deshabilitado={Boolean(accion)}
      />

      <Text style={estilos.seccion}>Permisos del admin</Text>
      <Text style={estilos.notaSeccion}>
        Vienen activados. Desactivá lo que esta institución no necesite: la opción desaparece de la
        vista del admin.
      </Text>

      {PERMISOS_DEL_ADMIN.map((permiso) => (
        <Interruptor
          key={permiso.clave}
          titulo={permiso.titulo}
          descripcion={permiso.descripcion}
          valor={permisos[permiso.clave]}
          onCambiar={(valor) => cambiarPermiso(permiso.clave, valor)}
          deshabilitado={Boolean(accion)}
        />
      ))}

      <Text style={estilos.seccion}>Precios</Text>
      <Text style={estilos.notaSeccion}>
        Dejá vacío lo que esta institución no cobre. Sin precio, el botón queda deshabilitado en la
        ficha del alumno.
      </Text>

      {CAMPOS_DE_PRECIO.map((campo) => (
        <Campo
          key={campo.clave}
          etiqueta={campo.etiqueta}
          value={precios[campo.clave] ?? ''}
          onChangeText={(valor) => {
            setPrecios((previos) => ({ ...previos, [campo.clave]: valor }));
            setErroresDePrecio((previos) => ({ ...previos, [campo.clave]: null }));
          }}
          error={erroresDePrecio[campo.clave]}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      ))}

      <Boton
        titulo="Guardar precios"
        onPress={guardarPrecios}
        cargando={accion === 'precios'}
        deshabilitado={Boolean(accion)}
      />
    </Pantalla>
  );
}

const crearEstilos = (colores) =>
  StyleSheet.create({
  volver: { fontSize: tipografia.cuerpo, color: colores.primario, fontWeight: '600' },
  nombre: { fontSize: tipografia.titulo - 4, fontWeight: '700', color: colores.texto },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.xs,
  },
  dato: { flexDirection: 'row', justifyContent: 'space-between', gap: espaciado.md },
  datoEtiqueta: { fontSize: tipografia.nota, color: colores.textoSuave },
  datoValor: {
    fontSize: tipografia.nota,
    color: colores.texto,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  seccion: {
    fontSize: tipografia.subtitulo,
    fontWeight: '700',
    color: colores.texto,
    marginTop: espaciado.sm,
  },
  notaSeccion: { fontSize: tipografia.nota, color: colores.textoSuave, marginTop: -espaciado.xs },
});
