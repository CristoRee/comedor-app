import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores, espaciado, radio, tipografia } from '../theme';

const ContextoDePantalla = createContext(null);

export function Pantalla({ children, scroll = true, contentContainerStyle, bordes = ['top', 'bottom'] }) {
  const referenciaScroll = useRef(null);
  const campoEnfocado = useRef(null);
  const { height: altoDeVentana } = useWindowDimensions();
  const [tecladoAbierto, setTecladoAbierto] = useState(false);

  const subirCampoEnfocado = useCallback(() => {
    if (campoEnfocado.current === null) return;

    referenciaScroll.current?.scrollTo({
      y: Math.max(campoEnfocado.current - espaciado.md, 0),
      animated: true,
    });
  }, []);

  useEffect(() => {
    // Hay que volver a subir cuando el teclado terminó de abrirse: el alto
    // visible recién ahí es el definitivo, y el desplazamiento del onFocus se
    // calculó contra la pantalla todavía entera.
    const abre = Keyboard.addListener('keyboardDidShow', () => {
      setTecladoAbierto(true);
      setTimeout(subirCampoEnfocado, 50);
    });
    const cierra = Keyboard.addListener('keyboardDidHide', () => {
      setTecladoAbierto(false);
      campoEnfocado.current = null;
    });

    return () => {
      abre.remove();
      cierra.remove();
    };
  }, [subirCampoEnfocado]);

  // El campo enfocado se sube al tope del área visible. Sin esto, en Android el
  // teclado tapa los últimos campos del formulario y no se ve lo que se escribe.
  const desplazarAlCampo = useCallback(
    (y) => {
      campoEnfocado.current = y;
      setTimeout(subirCampoEnfocado, 150);
    },
    [subirCampoEnfocado]
  );

  // Espacio extra al final mientras se escribe: sin él, el último campo no
  // tiene contra qué desplazarse y se queda debajo del teclado.
  const relleno = tecladoAbierto ? { paddingBottom: altoDeVentana * 0.55 } : null;

  const contenido = scroll ? (
    <ScrollView
      ref={referenciaScroll}
      contentContainerStyle={[estilos.scroll, contentContainerStyle, relleno]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[estilos.scroll, contentContainerStyle]}>{children}</View>
  );

  return (
    <ContextoDePantalla.Provider value={{ desplazarAlCampo }}>
      <SafeAreaView style={estilos.pantalla} edges={bordes}>
        <KeyboardAvoidingView
          style={estilos.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {contenido}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ContextoDePantalla.Provider>
  );
}

export function Titulo({ children }) {
  return <Text style={estilos.titulo}>{children}</Text>;
}

export function Subtitulo({ children }) {
  return <Text style={estilos.subtitulo}>{children}</Text>;
}

export const Campo = forwardRef(function Campo(
  {
    etiqueta,
    error,
    ayuda,
    exito,
    formato,
    secureTextEntry,
    onChangeText,
    onFocus,
    ...props
  },
  ref
) {
  const [oculto, setOculto] = useState(Boolean(secureTextEntry));
  const [posicion, setPosicion] = useState(0);
  const contexto = useContext(ContextoDePantalla);

  function alCambiar(valor) {
    onChangeText?.(formato ? formato(valor) : valor);
  }

  function alEnfocar(evento) {
    contexto?.desplazarAlCampo(posicion);
    onFocus?.(evento);
  }

  return (
    <View style={estilos.campo} onLayout={(evento) => setPosicion(evento.nativeEvent.layout.y)}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>

      <View>
        <TextInput
          ref={ref}
          style={[
            estilos.input,
            secureTextEntry && estilos.inputConBoton,
            error && estilos.inputError,
            !error && exito && estilos.inputExito,
          ]}
          placeholderTextColor={colores.textoSuave}
          secureTextEntry={oculto}
          onChangeText={alCambiar}
          onFocus={alEnfocar}
          {...props}
        />

        {secureTextEntry ? (
          <Pressable
            style={estilos.ojo}
            onPress={() => setOculto((previo) => !previo)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={oculto ? 'Mostrar la contraseña' : 'Ocultar la contraseña'}
          >
            <Text style={estilos.ojoTexto}>{oculto ? 'Mostrar' : 'Ocultar'}</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={estilos.mensajeError}>{error}</Text> : null}
      {!error && exito ? <Text style={estilos.mensajeExito}>{exito}</Text> : null}
      {!error && !exito && ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
    </View>
  );
});

export function Boton({ titulo, onPress, cargando, deshabilitado, variante = 'primario' }) {
  const inactivo = cargando || deshabilitado;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: Boolean(inactivo), busy: Boolean(cargando) }}
      style={({ pressed }) => [
        estilos.boton,
        estilos[`boton_${variante}`],
        pressed && estilos.botonPresionado,
        inactivo && estilos.botonInactivo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={variante === 'primario' ? '#ffffff' : colores.primario} />
      ) : (
        <Text style={[estilos.botonTexto, estilos[`botonTexto_${variante}`]]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function Aviso({ tipo = 'info', titulo, children }) {
  return (
    <View style={[estilos.aviso, estilos[`aviso_${tipo}`]]} accessibilityRole="alert">
      {titulo ? <Text style={[estilos.avisoTitulo, estilos[`avisoTexto_${tipo}`]]}>{titulo}</Text> : null}
      <Text style={[estilos.avisoTexto, estilos[`avisoTexto_${tipo}`]]}>{children}</Text>
    </View>
  );
}

export function Opcion({ titulo, detalle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detalle ? `${titulo}, ${detalle}` : titulo}
      style={({ pressed }) => [estilos.opcion, pressed && estilos.opcionPresionada]}
    >
      <View style={estilos.opcionTextos}>
        <Text style={estilos.opcionTitulo}>{titulo}</Text>
        {detalle ? <Text style={estilos.opcionDetalle}>{detalle}</Text> : null}
      </View>
      <Text style={estilos.opcionFlecha}>›</Text>
    </Pressable>
  );
}

export function Cargando({ texto }) {
  return (
    <View style={estilos.cargando}>
      <ActivityIndicator size="large" color={colores.primario} />
      {texto ? <Text style={estilos.cargandoTexto}>{texto}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  scroll: { flexGrow: 1, padding: espaciado.lg, gap: espaciado.md },

  titulo: { fontSize: tipografia.titulo, fontWeight: '700', color: colores.texto },
  subtitulo: { fontSize: tipografia.cuerpo, color: colores.textoSuave, marginTop: -espaciado.sm },

  campo: { gap: espaciado.xs },
  etiqueta: { fontSize: tipografia.nota, fontWeight: '600', color: colores.texto },
  input: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm + 4,
    fontSize: tipografia.cuerpo,
    color: colores.texto,
    minHeight: 48,
  },
  inputConBoton: { paddingRight: 84 },
  inputError: { borderColor: colores.error },
  inputExito: { borderColor: colores.exito },
  ojo: {
    position: 'absolute',
    right: espaciado.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: espaciado.sm,
  },
  ojoTexto: { fontSize: tipografia.nota, color: colores.primario, fontWeight: '600' },
  mensajeError: { fontSize: tipografia.nota, color: colores.error },
  mensajeExito: { fontSize: tipografia.nota, color: colores.exito },
  ayuda: { fontSize: tipografia.nota, color: colores.textoSuave },

  boton: {
    borderRadius: radio.md,
    paddingVertical: espaciado.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  boton_primario: { backgroundColor: colores.primario },
  boton_secundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.borde },
  boton_peligro: { backgroundColor: colores.error },
  botonPresionado: { opacity: 0.75 },
  botonInactivo: { opacity: 0.55 },
  botonTexto: { fontSize: tipografia.cuerpo, fontWeight: '600' },
  botonTexto_primario: { color: '#ffffff' },
  botonTexto_secundario: { color: colores.texto },
  botonTexto_peligro: { color: '#ffffff' },

  aviso: { borderRadius: radio.md, padding: espaciado.md, gap: espaciado.xs },
  aviso_info: { backgroundColor: '#e8f0fe' },
  aviso_error: { backgroundColor: '#fde8e6' },
  aviso_exito: { backgroundColor: '#e3f3e9' },
  aviso_advertencia: { backgroundColor: '#fdf1dd' },
  avisoTitulo: { fontSize: tipografia.cuerpo, fontWeight: '700' },
  avisoTexto: { fontSize: tipografia.nota + 1, lineHeight: 20 },
  avisoTexto_info: { color: '#0b3d91' },
  avisoTexto_error: { color: colores.error },
  avisoTexto_exito: { color: colores.exito },
  avisoTexto_advertencia: { color: colores.advertencia },

  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.md,
    minHeight: 56,
  },
  opcionPresionada: { backgroundColor: '#eef2f7' },
  opcionTextos: { flex: 1, gap: 2 },
  opcionTitulo: { fontSize: tipografia.cuerpo, fontWeight: '600', color: colores.texto },
  opcionDetalle: { fontSize: tipografia.nota, color: colores.textoSuave },
  opcionFlecha: { fontSize: 22, color: colores.textoSuave },

  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaciado.md },
  cargandoTexto: { fontSize: tipografia.nota + 1, color: colores.textoSuave },
});
