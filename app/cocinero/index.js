import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase';
import { useAuth } from '../../src/contexts/AuthContext';
import { Aviso, Boton, Campo, Cargando, Pantalla } from '../../src/components/ui';
import { Encabezado } from '../../src/components/Encabezado';
import { Navegacion } from '../../src/components/Navegacion';
import { navegacionDe } from '../../src/permisos';
import { claveDeFecha, fechaLegible } from '../../src/fechas';
import { idMenu } from '../../src/comedor';
import { colores, espaciado, radio, tipografia } from '../../src/theme';

const PLATO_VACIO = { nombre: '', ingredientes: '' };

function aTexto(ingredientes) {
  return Array.isArray(ingredientes) ? ingredientes.join(', ') : '';
}

function aLista(texto) {
  return texto
    .split(',')
    .map((ingrediente) => ingrediente.trim())
    .filter(Boolean);
}

function manana() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  return fecha;
}

export default function MenuDelDia() {
  const { usuario, perfil, rol, institucionId, institucion } = useAuth();
  const [dia, setDia] = useState('hoy');
  const [principal, setPrincipal] = useState(PLATO_VACIO);
  const [complementos, setComplementos] = useState([]);
  const [postre, setPostre] = useState(PLATO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const fecha = dia === 'hoy' ? new Date() : manana();
  const clave = claveDeFecha(fecha);

  useEffect(() => {
    if (!institucionId) return undefined;

    setCargando(true);

    return onSnapshot(
      doc(db, 'menus', idMenu(institucionId, clave)),
      (instantanea) => {
        const datos = instantanea.data();

        setPrincipal(
          datos?.principal
            ? { nombre: datos.principal.nombre, ingredientes: aTexto(datos.principal.ingredientes) }
            : PLATO_VACIO
        );
        setComplementos(
          (datos?.complementos ?? []).map((complemento) => ({
            nombre: complemento.nombre,
            ingredientes: aTexto(complemento.ingredientes),
          }))
        );
        setPostre(
          datos?.postre
            ? { nombre: datos.postre.nombre, ingredientes: aTexto(datos.postre.ingredientes) }
            : PLATO_VACIO
        );
        setCargando(false);
      },
      () => {
        setAviso({ tipo: 'error', texto: 'No se pudo cargar el menú.' });
        setCargando(false);
      }
    );
  }, [institucionId, clave]);

  function actualizarComplemento(indice, campo, valor) {
    setComplementos((previos) =>
      previos.map((complemento, posicion) =>
        posicion === indice ? { ...complemento, [campo]: valor } : complemento
      )
    );
  }

  async function guardar() {
    if (!principal.nombre.trim()) {
      setAviso({ tipo: 'error', texto: 'El plato principal necesita un nombre.' });
      return;
    }

    setGuardando(true);
    setAviso(null);

    try {
      await setDoc(doc(db, 'menus', idMenu(institucionId, clave)), {
        institucionId,
        fecha: clave,
        principal: {
          nombre: principal.nombre.trim(),
          ingredientes: aLista(principal.ingredientes),
        },
        complementos: complementos
          .filter((complemento) => complemento.nombre.trim())
          .map((complemento) => ({
            nombre: complemento.nombre.trim(),
            ingredientes: aLista(complemento.ingredientes),
          })),
        postre: postre.nombre.trim()
          ? { nombre: postre.nombre.trim(), ingredientes: aLista(postre.ingredientes) }
          : null,
        publicado: true,
        creadoPor: usuario.uid,
        actualizadoEn: serverTimestamp(),
      });

      setAviso({ tipo: 'exito', texto: 'Menú publicado. Los alumnos ya lo ven en su app.' });
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo guardar el menú. Revisá la conexión.' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Pantalla>
      <Encabezado
        titulo="Menú del día"
        subtitulo={`${perfil.nombre} ${perfil.apellido}`}
        nota={institucion?.nombre}
      />

      <Navegacion opciones={navegacionDe(rol, institucion)} />

      <View style={estilos.selectorDia}>
        <Pressable
          onPress={() => setDia('hoy')}
          style={[estilos.dia, dia === 'hoy' && estilos.diaActivo]}
        >
          <Text style={[estilos.diaTexto, dia === 'hoy' && estilos.diaTextoActivo]}>Hoy</Text>
        </Pressable>
        <Pressable
          onPress={() => setDia('manana')}
          style={[estilos.dia, dia === 'manana' && estilos.diaActivo]}
        >
          <Text style={[estilos.diaTexto, dia === 'manana' && estilos.diaTextoActivo]}>Mañana</Text>
        </Pressable>
      </View>

      <Text style={estilos.fecha}>{fechaLegible(fecha)}</Text>

      {institucion?.horarios?.horaLimiteMenu ? (
        <Aviso tipo="info">
          {`El menú se puede cambiar hasta las ${institucion.horarios.horaLimiteMenu}.`}
        </Aviso>
      ) : null}

      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

      {cargando ? (
        <Cargando />
      ) : (
        <>
          <Text style={estilos.seccion}>Plato principal</Text>
          <Campo
            etiqueta="Nombre"
            value={principal.nombre}
            onChangeText={(valor) => setPrincipal((previo) => ({ ...previo, nombre: valor }))}
            placeholder="Strogonoff"
          />
          <Campo
            etiqueta="Ingredientes"
            value={principal.ingredientes}
            onChangeText={(valor) => setPrincipal((previo) => ({ ...previo, ingredientes: valor }))}
            placeholder="pollo, crema de leche, cebolla"
            ayuda="Separados por comas. Los alumnos los ven por las alergias."
            multiline
          />

          <Text style={estilos.seccion}>Complementos</Text>
          {complementos.map((complemento, indice) => (
            <View key={indice} style={estilos.complemento}>
              <Campo
                etiqueta={`Complemento ${indice + 1}`}
                value={complemento.nombre}
                onChangeText={(valor) => actualizarComplemento(indice, 'nombre', valor)}
                placeholder="Arroz"
              />
              <Campo
                etiqueta="Ingredientes"
                value={complemento.ingredientes}
                onChangeText={(valor) => actualizarComplemento(indice, 'ingredientes', valor)}
                placeholder="arroz, sal"
                multiline
              />
              <Pressable
                onPress={() =>
                  setComplementos((previos) => previos.filter((_, posicion) => posicion !== indice))
                }
                hitSlop={8}
              >
                <Text style={estilos.quitar}>Quitar complemento</Text>
              </Pressable>
            </View>
          ))}
          <Boton
            titulo="Agregar complemento"
            variante="secundario"
            onPress={() => setComplementos((previos) => [...previos, { ...PLATO_VACIO }])}
          />

          <Text style={estilos.seccion}>Postre</Text>
          <Campo
            etiqueta="Nombre"
            value={postre.nombre}
            onChangeText={(valor) => setPostre((previo) => ({ ...previo, nombre: valor }))}
            placeholder="Flan"
          />
          <Campo
            etiqueta="Ingredientes"
            value={postre.ingredientes}
            onChangeText={(valor) => setPostre((previo) => ({ ...previo, ingredientes: valor }))}
            placeholder="leche, huevo, azúcar"
            multiline
          />

          <Boton titulo="Publicar menú" onPress={guardar} cargando={guardando} />
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  selectorDia: { flexDirection: 'row', gap: espaciado.sm },
  dia: {
    flex: 1,
    paddingVertical: espaciado.sm,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    backgroundColor: colores.superficie,
  },
  diaActivo: { backgroundColor: colores.texto, borderColor: colores.texto },
  diaTexto: { fontSize: tipografia.nota + 1, fontWeight: '600', color: colores.texto },
  diaTextoActivo: { color: '#ffffff' },
  fecha: { fontSize: tipografia.nota + 1, color: colores.textoSuave, textTransform: 'capitalize' },
  seccion: {
    fontSize: tipografia.subtitulo,
    fontWeight: '700',
    color: colores.texto,
    marginTop: espaciado.sm,
  },
  complemento: {
    gap: espaciado.sm,
    padding: espaciado.md,
    borderRadius: radio.md,
    backgroundColor: '#eef1f5',
  },
  quitar: { fontSize: tipografia.nota, color: colores.error, fontWeight: '600' },
});
